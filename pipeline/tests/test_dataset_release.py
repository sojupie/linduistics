"""Equivalence rejection and a real PostgreSQL publication rollback check."""
import json
import os
from pathlib import Path

import psycopg
import pyarrow as pa
import pyarrow.parquet as pq
import pytest

from pipeline.src.dataset_artifact import verify_equal, classify_file, sha256, LOOKUPS
from db.publish_dataset import publish
from db.seed_db import COLUMNS


def test_equivalence_checks_core_and_exact_scores(tmp_path):
    original = [{'word_a':'water', 'is_core':True, 'semantic_sim':0.75, 'senses_a':'[{"gloss":"water"}]'}]
    left, right = tmp_path/'left.parquet', tmp_path/'right.parquet'
    pq.write_table(pa.Table.from_pylist(original), left)
    pq.write_table(pa.Table.from_pylist(original), right)
    assert verify_equal(left, right) == 1
    for field, value in [('is_core', False), ('semantic_sim',0.75000001), ('senses_a','[{"gloss":"urine"}]')]:
        changed = [dict(original[0], **{field:value})]
        pq.write_table(pa.Table.from_pylist(changed), right)
        with pytest.raises(ValueError, match=field):
            verify_equal(left, right)


@pytest.mark.skipif(not os.getenv('PIPELINE_TEST_DB'), reason='Set PIPELINE_TEST_DB to a disposable linduistics_pipeline_test database')
def test_publication_preserves_core_ids_and_rolls_back(tmp_path, monkeypatch):
    url = os.environ['PIPELINE_TEST_DB']
    with psycopg.connect(url) as conn:
        assert conn.execute('SELECT current_database()').fetchone()[0].startswith('linduistics_pipeline_test')
        types = {name: 'TEXT' for name in COLUMNS}
        types.update(senses_a='JSONB', senses_b='JSONB', orthographic_sim='REAL',phonetic_sim='REAL',semantic_sim='REAL')
        conn.execute('CREATE TABLE word_comparisons (id BIGSERIAL PRIMARY KEY,' + ','.join(f'{name} {kind}' for name,kind in types.items()) + ',is_core BOOLEAN DEFAULT FALSE)')
        conn.execute('CREATE TABLE word_forms (lang TEXT,form TEXT,lemma TEXT,PRIMARY KEY(lang,form,lemma))')
        conn.execute('CREATE TABLE word_inflections (id SERIAL PRIMARY KEY,lang TEXT,lemma TEXT,form TEXT,pos TEXT,tags TEXT[])')
        conn.execute('CREATE TABLE lemma_synonyms (id SERIAL PRIMARY KEY,lang TEXT,lemma TEXT,pos TEXT,synonyms TEXT[])')
        conn.execute('CREATE TABLE cognate_clusters (id SERIAL PRIMARY KEY,root TEXT,proto_language TEXT,language_count INTEGER,languages TEXT[],members JSONB,sample_gloss TEXT,created_at TIMESTAMPTZ)')
    baseline_path = Path('pipeline/data/reproduce-five-language-20261002/all_comparisons_v2.parquet')
    baseline = next(pq.ParquetFile(baseline_path).iter_batches(batch_size=2)).to_pylist()
    source = [dict(row) for row in baseline]
    for row in source:
        row.pop('is_core'); row['category']='other'; row['etymological_relation']='unknown'
    pq.write_table(pa.Table.from_pylist(baseline), tmp_path/'reference.parquet')
    pq.write_table(pa.Table.from_pylist(source), tmp_path/'source.parquet')
    result = classify_file(tmp_path/'source.parquet', tmp_path/'reference.parquet', tmp_path/'final.parquet', url)
    stages = {'final': {'result':result}}
    for lang in ('en','de','sv','da','nb'):
        for prefix, stage in [('lemmas','parse'),('word_forms','forms')]:
            file = tmp_path/f'{prefix}_{lang}.parquet'
            pq.write_table(pa.Table.from_pylist([{'lang':lang,'form':'a','lemma':'a'}]), file)
            stages[f'{stage}-{lang}']={'outputs':{file.name:sha256(file)}}
    for table, fields in LOOKUPS.items():
        file = tmp_path/f'{table}.parquet'
        records = []
        if table == 'word_inflections':
            records = [{'id':42,'lang':'en','lemma':'a','form':'a','pos':'noun','tags':['base']}]
        pq.write_table(pa.Table.from_pylist(records, schema=pa.schema(fields)), file)
        stages[table]={'outputs':{file.name:sha256(file)}}
    manifest = {'stages':stages}
    (tmp_path/'manifest.json').write_text(json.dumps(manifest))
    monkeypatch.setattr('db.publish_dataset.build_clusters', lambda *args: {})
    publish(tmp_path, url)
    with psycopg.connect(url) as conn:
        assert conn.execute('SELECT is_core FROM word_comparisons ORDER BY id').fetchall() == [(row['is_core'],) for row in baseline]
        assert conn.execute('SELECT id FROM word_inflections').fetchall() == [(42,)]
        conn.execute("UPDATE word_comparisons SET word_a='rollback marker' WHERE id=1")
    # Fail after comparisons have been replaced, during form loading.
    file = tmp_path/'word_forms_en.parquet'
    pq.write_table(pa.Table.from_pylist([{'lang':'en','form':'a','lemma':'a'}]*2), file)
    stages['forms-en']['outputs'][file.name] = sha256(file)
    (tmp_path/'manifest.json').write_text(json.dumps(manifest))
    with pytest.raises(psycopg.errors.UniqueViolation):
        publish(tmp_path, url)
    with psycopg.connect(url) as conn:
        assert conn.execute('SELECT word_a FROM word_comparisons WHERE id=1').fetchone()[0] == 'rollback marker'
        assert conn.execute('SELECT count(*) FROM word_forms').fetchone()[0] == 5

"""Publish a verified final dataset and related lookups in one transaction."""
import json
from pathlib import Path
import psycopg
import pyarrow.parquet as pq

from db.seed_db import COLUMNS, stream_parquet_rows
from db.seed_forms import stream_forms_rows
from pipeline.src.build_cognate_clusters import build_clusters
from pipeline.src.dataset_artifact import sha256, LOOKUPS, rows
from pipeline.src.languages import LANGUAGES


def publish(build_dir, db_url):
    build_dir = Path(build_dir)
    final = build_dir / 'final.parquet'
    manifest = json.loads((build_dir / 'manifest.json').read_text())
    verified = manifest['stages']['final']['result']
    if not verified['all_fields_and_row_order_verified'] or sha256(final) != verified['output_sha256']:
        raise ValueError('Final artifact is unverified or has changed')
    if 'is_core' not in pq.ParquetFile(final).schema.names:
        raise ValueError('Final dataset has no core tags')
    forms = [build_dir / f'word_forms_{lang}.parquet' for lang in LANGUAGES]
    for path in forms:
        stage = manifest['stages'][f'forms-{path.stem.removeprefix("word_forms_")}']
        if sha256(path) != stage['outputs'][path.name]:
            raise ValueError(f'Form artifact changed: {path.name}')
    for lang in LANGUAGES:
        path = build_dir / f'lemmas_{lang}.parquet'
        if sha256(path) != manifest['stages'][f'parse-{lang}']['outputs'][path.name]:
            raise ValueError(f'Lemma artifact changed: {path.name}')
    clusters = build_clusters(build_dir, final)
    cluster_reference = {row['root']: row for row in rows(build_dir / 'cognate_clusters.parquet')}
    if set(clusters) != set(cluster_reference):
        raise ValueError('Cluster roots changed')
    for root, cluster in clusters.items():
        old = cluster_reference[root]
        if (sorted(cluster['langs']), sorted(cluster['members'], key=lambda m: (m['lang'], m['word'])), cluster['sample_gloss']) != (old['languages'], json.loads(old['members']), old['sample_gloss']):
            raise ValueError(f'Cluster members or meaning changed: {root}')
    for table in LOOKUPS:
        path = build_dir / f'{table}.parquet'
        if sha256(path) != manifest['stages'][table]['outputs'][path.name]:
            raise ValueError(f'Lookup artifact changed: {table}')
    columns = COLUMNS + ['is_core']
    with psycopg.connect(db_url) as conn:
        # One commit: exceptions roll back the comparisons, core tags, lookups, and clusters together.
        with conn.cursor() as cur:
            cur.execute('TRUNCATE word_comparisons RESTART IDENTITY')
            with cur.copy('COPY word_comparisons (' + ','.join(columns) + ') FROM STDIN') as copy:
                for count, row in enumerate(stream_parquet_rows(final, columns=columns), 1):
                    copy.write_row(row)
                    if count % 250000 == 0:
                        print(f'Publishing {count:,} comparison rows', flush=True)
            cur.execute('TRUNCATE word_forms')
            for path in forms:
                with cur.copy('COPY word_forms (lang,form,lemma) FROM STDIN') as copy:
                    for row in stream_forms_rows(path):
                        copy.write_row(row)
            for table, fields in LOOKUPS.items():
                names = [name for name, _ in fields]
                cur.execute(f'TRUNCATE {table} RESTART IDENTITY')
                with cur.copy(f'COPY {table} ({",".join(names)}) FROM STDIN') as copy:
                    for row in rows(build_dir / f'{table}.parquet'):
                        copy.write_row(tuple(row[name] for name in names))
                # Preserve row IDs and keep future inserts beyond the published maximum.
                cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}','id'), COALESCE(max(id),1), count(*)>0) FROM {table}")
            cur.execute('SELECT count(*),count(*) FILTER (WHERE is_core) FROM word_comparisons')
            if cur.fetchone() != (verified['rows'], verified['is_core_rows']):
                raise ValueError('Published row/core counts do not match the verified file')
            cur.execute('SELECT category,count(*) FROM word_comparisons GROUP BY category')
            if dict(cur.fetchall()) != verified['categories']:
                raise ValueError('Published categories changed')
            cur.execute('ANALYZE word_comparisons; ANALYZE word_forms; ANALYZE cognate_clusters')
    return {'rows': verified['rows'], 'clusters': len(clusters), 'transaction_committed': True}

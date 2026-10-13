"""Build isolated new-language pairs through the existing pipeline stages."""
import argparse
from collections import Counter
import json
from pathlib import Path
import shutil
import sys
import time

import psycopg
import pyarrow as pa
import pyarrow.parquet as pq

from e0 import ROOT, OUTPUT, BASELINE, DATASET, digest, save_json

sys.path.insert(0, str(ROOT / 'pipeline/src'))
import build_crosslingual_dataset as builder
import audit_source_cognate_coverage as audit
from enrich_comparisons_with_source_claims import enrich_comparisons
from extract_etymology_records import export_records
from semantic_matcher import SemanticMatcher, DEFAULT_MODEL_REVISION
from sense_aligner import classify_pair_senses

DATA = ROOT / 'pipeline/data/e5-admission001'
CANDIDATES = OUTPUT / 'e5-candidates002'


def evidence(directory):
    directory.mkdir(parents=True, exist_ok=False)
    frozen = BASELINE / 'etymology_records.jsonl'
    assert digest(frozen) == '717e04e01608216d3d00bd8eab63c65f28a28fb587a7fe73148429532cf6d961'
    source_protocol = json.loads((OUTPUT / 'e5-source-audit/protocol.json').read_text())
    for name, expected in source_protocol['raw_source_hashes'].items():
        assert digest(ROOT / name) == expected
    extra = directory / 'new_evidence.jsonl'
    export_records(ROOT / 'pipeline/data', ['nl', 'is'], extra)
    combined = directory / 'evidence.jsonl'
    with combined.open('xb') as destination:
        for source in [frozen, extra]:
            with source.open('rb') as stream:
                shutil.copyfileobj(stream, destination)
    save_json(directory / 'protocol.json', dict(old_evidence_sha256=digest(frozen),
        new_evidence_sha256=digest(extra), combined_sha256=digest(combined),
        source_protocol_sha256=digest(OUTPUT / 'e5-source-audit/protocol.json'),
        extractor_sha256=digest(ROOT / 'pipeline/src/extract_etymology_records.py')))


def final_classification(source, output):
    schema = pq.ParquetFile(DATASET).schema_arrow
    counts, relations, claims, total = Counter(), Counter(), 0, 0
    temporary = output.with_suffix('.tmp')
    with psycopg.connect('postgresql://postgres:postgres@localhost:5432/linduistics') as conn:
        conn.execute('SET TRANSACTION READ ONLY')
        with pq.ParquetWriter(temporary, schema, compression='zstd') as writer:
            for batch in pq.ParquetFile(source).iter_batches(batch_size=8192):
                rows = batch.to_pylist()
                converted = conn.execute('SELECT %s::text[]::real[], %s::text[]::real[], %s::text[]::real[]',
                    tuple([str(r[n]) for r in rows] for n in ['orthographic_sim', 'phonetic_sim', 'semantic_sim'])).fetchone()
                for index, r in enumerate(rows):
                    a, b = r['etym_root_a'], r['etym_root_b']
                    if r['shared_etym_root'] and not a and not b:
                        a = b = r['shared_etym_root']
                    result = classify_pair_senses(r['word_a'], r['lang_a'], [], a,
                        r['word_b'], r['lang_b'], [], b, *(values[index] for values in converted))
                    r.update(category=result.category, etymological_relation=result.etymological_relation, is_core=None)
                    counts[r['category']] += 1
                    relations[r['etymological_relation']] += 1
                    for side in ['a', 'b']:
                        senses = json.loads(r[f'senses_{side}'])
                        assert sum(bool(s.get('is_active_match')) for s in senses) == 1
                        assert all(s.get('source_entry_key') or s.get('source_identity_candidates') for s in senses)
                        claims += sum(len(s.get('source_claims', [])) for s in senses)
                    total += 1
                writer.write_table(pa.Table.from_pylist(rows, schema=schema))
    assert total > 0 and total % 2 == 0
    temporary.replace(output)
    return dict(rows=total, categories=dict(counts), relations=dict(relations), attached_claims=claims,
                core_policy='null: no independently justified new core membership; no core filter used for admission')


def build(pair, directory):
    pair = tuple(sorted(pair))
    assert len(set(pair)) == 2 and set(pair) <= {'da', 'de', 'en', 'nb', 'sv', 'nl', 'is'}
    assert {'nl', 'is'} & set(pair)
    directory.mkdir(parents=True, exist_ok=False)
    started = time.perf_counter()
    protocol = json.loads((CANDIDATES / 'protocol.json').read_text())
    translation_path = CANDIDATES / f'translations_{pair[0]}_{pair[1]}.parquet'
    assert digest(translation_path) == protocol['translation_artifacts'][translation_path.name]
    evidence_path = DATA / 'sources/evidence.jsonl'
    evidence_protocol = json.loads((evidence_path.parent / 'protocol.json').read_text())
    assert digest(evidence_path) == evidence_protocol['combined_sha256']
    lexicons = {}
    for lang in pair:
        lookup_directory = ROOT / 'pipeline/data/e5-source-audit' if lang in ['nl', 'is'] else BASELINE
        assert digest(lookup_directory / f'lemmas_{lang}.parquet') == protocol['lemma_hashes'][lang]
        builder.TARGET_LANGS = [lang]
        lexicons.update(builder.load_canonical_lexicons(lookup_directory))
    translations = pq.read_table(translation_path).to_pylist()
    refs = {(r['word_a'], r['word_b']): {(s['source_entry_key'], s['source_sense_id'])
        for s in json.loads(r['translation_source_senses'])} for r in translations}
    del translations
    print('Building full pair', pair, flush=True)
    rows = builder.build_pair_dataset(*pair, set(refs), lexicons, SemanticMatcher(), refs)
    raw = directory / 'raw.parquet'
    schema = pq.ParquetFile(DATASET).schema_arrow.remove(pq.ParquetFile(DATASET).schema_arrow.get_field_index('is_core'))
    pq.write_table(pa.Table.from_pylist(rows, schema=schema), raw, compression='zstd')
    del rows, lexicons, refs
    print('Raw pair complete; attaching source claims', pair, flush=True)
    audit.AUDIT_LANGUAGE_PAIRS = {frozenset(pair)}
    matches = directory / 'matches.jsonl'
    audit.audit_coverage(evidence_path, raw, matches)
    enriched = directory / 'enriched.parquet'
    enrich_comparisons(raw, matches, enriched)
    result = final_classification(enriched, directory / 'final.parquet')
    result['elapsed_seconds'] = time.perf_counter() - started
    save_json(directory / 'metrics.json', result)
    save_json(directory / 'protocol.json', dict(pair=list(pair), model_revision=DEFAULT_MODEL_REVISION,
        source_candidate_protocol_sha256=digest(CANDIDATES / 'protocol.json'), evidence_sha256=digest(evidence_path),
        plan_sha256=digest(OUTPUT / 'E5_ADMISSION_PLAN.md'), code_sha256=digest(Path(__file__)),
        pipeline_code_hashes={name: digest(ROOT / 'pipeline/src' / name) for name in
            ['build_crosslingual_dataset.py', 'semantic_matcher.py', 'sense_aligner.py', 'audit_source_cognate_coverage.py', 'enrich_comparisons_with_source_claims.py']},
        artifacts={p.name: digest(p) for p in directory.iterdir() if p.is_file()},
        scope='Complete new pair; original parser/candidates/alignment/evidence enrichment/V2 classification; no live publication.'))
    print(json.dumps(result), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence', action='store_true')
    parser.add_argument('--pair', nargs=2)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    assert bool(args.evidence) != bool(args.pair), 'Choose --evidence or --pair'
    if args.evidence:
        evidence(args.output or DATA / 'sources')
    else:
        build(args.pair, args.output or DATA / ('_'.join(sorted(args.pair))))

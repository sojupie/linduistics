"""Evaluate source-scoped historical paths on frozen development comparisons."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import sys
import time

import pyarrow.parquet as pq

from e0 import BASELINE, DATASET, EXPECTED_HASH, OUTPUT, digest, key, read_csv, save_json

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from classifier import etymological_relation
from historical_links import TRANSMISSION, form, record_form, historical_relationships, self_check


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def source_records(path, wanted):
    """Index byte offsets once; load only endpoint entries and resolvable ancestors."""
    offsets, forms = {}, defaultdict(set)
    source_hash = hashlib.sha256()
    with path.open('rb') as stream:
        while True:
            position = stream.tell()
            line = stream.readline()
            if not line:
                break
            source_hash.update(line)
            if not line.strip():
                continue
            record = json.loads(line)
            identity = record['source_entry_key']
            if identity in offsets:
                raise ValueError(f'Duplicate source identity: {identity}')
            offsets[identity] = position
            forms[record_form(record)].add(identity)
        records, pending = {}, set(wanted)
        while pending:
            current, pending = pending, set()
            for identity in sorted(current):
                if identity in records or identity not in offsets:
                    continue
                stream.seek(offsets[identity])
                record = json.loads(stream.readline())
                assert record['source_entry_key'] == identity
                records[identity] = record
                for claim in record.get('claims', []):
                    if claim.get('relation') not in TRANSMISSION or claim.get('source_uncertain'):
                        continue
                    targets = forms.get(form(claim.get('related_language'), claim.get('related_form')), set())
                    if len(targets) == 1:
                        pending.update(targets - records.keys())
    return records, forms, source_hash.hexdigest(), len(offsets)


def entry_keys(senses):
    exact, alternatives = set(), []
    for sense in senses:
        if sense.get('source_entry_key'):
            exact.add(sense['source_entry_key'])
        elif sense.get('source_identity_candidates'):
            alternatives.append({'sense_id': sense.get('sense_id'), 'gloss': sense['gloss'],
                                 'candidates': sense['source_identity_candidates']})
    return sorted(exact), alternatives


def evaluate(destination, run_id, variant):
    destination.mkdir(parents=True, exist_ok=False)
    started = time.monotonic()
    source = OUTPUT / 'e1-run003'
    completion = load(source / 'completion.json')
    for name in ['comparisons.json', 'case_displays.json']:
        assert digest(source / name) == completion['artifact_hashes'][name]
    assert digest(DATASET) == EXPECTED_HASH
    refs = load(OUTPUT / 'e3_reference.json')
    for name, expected in refs['reference_files'].items():
        assert digest(OUTPUT / name) == expected
    cases = load(source / 'case_displays.json')
    roles = {(r['panel'], r['case_id']): r for r in load(OUTPUT / 'e0_families_v2.json')['cases']}
    assert all(roles[c['panel'], c['case_id']]['role'] == 'development' for c in cases)
    frozen = {key(r['lang_a'], r['word_a'], r['lang_b'], r['word_b']): r
              for r in load(source / 'comparisons.json')}
    columns = [c for c in next(iter(frozen.values())) if c not in
               {'matrix', 'selections', 'reconstructed_control', 'eligible_pair_count'}]
    controls = {}
    for batch in pq.ParquetFile(DATASET).iter_batches(columns=columns + ['etym_root_a', 'etym_root_b']):
        for row in batch.to_pylist():
            if row['lang_a'] >= row['lang_b']:
                continue
            identity = key(row['lang_a'], row['word_a'], row['lang_b'], row['word_b'])
            if identity in frozen and all(row[c] == frozen[identity][c] for c in columns):
                controls[identity] = row
    assert len(controls) == len(frozen)
    identities, wanted = {}, set()
    for identity, row in frozen.items():
        identities[identity] = [entry_keys(json.loads(row[f'senses_{side}'])) for side in ['a', 'b']]
        wanted.update(k for keys, _ in identities[identity] for k in keys)
    record_path = BASELINE / 'etymology_records.jsonl'
    print(f'Indexing historical sources for {len(wanted)} exact entry identities.', flush=True)
    records, forms, record_hash, source_count = source_records(record_path, wanted)
    protocol = {'run_id': run_id, 'variant': variant, 'baseline_sha256': EXPECTED_HASH,
        'source_variant_plan_sha256': digest(OUTPUT / 'E3_SOURCE_PLAN.md') if variant == 'sources' else None,
        'source_caveat_plan_sha256': digest(OUTPUT / 'E3_CAVEAT_PLAN.md'),
        'source_comparisons_sha256': digest(source / 'comparisons.json'),
        'source_records': str(record_path), 'source_records_sha256': record_hash,
        'source_manifest_sha256': digest(record_path.with_suffix(record_path.suffix + '.manifest.json')),
        'source_index_entries': source_count, 'loaded_source_entries': len(records),
        'endpoint_identities_requested': len(wanted), 'endpoint_identities_resolved': len(wanted & records.keys()),
        'reference_sha256': digest(OUTPUT / 'e3_reference.json'), 'plan_sha256': digest(OUTPUT / 'E3_PLAN.md'),
        'code_sha256': {str(path): digest(path) for path in [Path(__file__), Path('pipeline/src/historical_links.py')]},
        'meaning_and_display': 'Original baseline; neither E1 nor E2 adopted',
        'write_policy': 'New local result directory; no source, live database, or production changes.'}
    save_json(destination / 'protocol.json', protocol)
    predictions = {}
    for identity, row in controls.items():
        sides = identities[identity]
        predictions[identity] = {'root_control': etymological_relation(row['etym_root_a'], row['etym_root_b']),
            'roots': [row['etym_root_a'], row['etym_root_b']],
            'ambiguous_source_identities': [side[1] for side in sides],
            'history': historical_relationships(sides[0][0], sides[1][0], records, forms, shared_sources=variant == 'sources')}
    references = {r['case_id']: r for r in refs['cases']}
    results, concepts = [], []
    concept_reference = {r['case_id']: r for r in read_csv(OUTPUT / 'e0_concept_results.csv')}
    for case in cases:
        identity = key(case['lang_a'], case['word_a'], case['lang_b'], case['word_b'])
        prediction = predictions[identity]
        if case['panel'] == 'open':
            reference = references[case['case_id']]
            whole = [r for r in prediction['history']['relationships']
                     if r['kind'] != 'shared_recorded_component_source' and not r['source_uncertain']]
            new = bool(whole) and prediction['root_control'] == 'unknown'
            results.append({**case, **prediction, 'reference': reference, 'new_relationship_candidate': new,
                'source_supported_recovery_candidate': new and reference['source_supported_positive'],
                'component_control_claim_flag': bool(whole) and reference['component_control']})
        else:
            concepts.append({**case, **prediction, 'history_reference': concept_reference[case['case_id']]['history_reference']})
    assert len(results) == 207 and len(concepts) == 995
    per_pair = defaultdict(Counter)
    for r in results:
        pair = f"{r['lang_a']}-{r['lang_b']}"
        per_pair[pair]['cases'] += 1
        per_pair[pair]['root_control_supported'] += r['root_control'] == 'cognate'
        per_pair[pair]['typed_relationship_supported'] += bool(r['history']['relationships'])
        per_pair[pair]['source_supported_recovery_candidates'] += r['source_supported_recovery_candidate']
    supported = [r for r in results if r['source_supported_recovery_candidate']]
    summary = {'run_id': run_id, 'variant': variant, 'open_cases': len(results), 'concept_cases': len(concepts),
        'root_control_supported': sum(r['root_control'] == 'cognate' for r in results),
        'typed_relationship_supported': sum(bool(r['history']['relationships']) for r in results),
        'cases_with_source_uncertain_relationships': [r['case_id'] for r in results
            if any(rel['source_uncertain'] for rel in r['history']['relationships'])],
        'new_relationship_candidates': sum(r['new_relationship_candidate'] for r in results),
        'source_supported_recovery_candidates': len(supported),
        'recovery_candidate_pairs': sorted({f"{r['lang_a']}-{r['lang_b']}" for r in supported}),
        'component_control_claim_flags': [r['case_id'] for r in results if r['component_control_claim_flag']],
        'relationship_types': Counter(rel['kind'] for r in results for rel in r['history']['relationships']),
        'unresolved_reasons': Counter(item['reason'] for r in results for item in r['history']['unresolved_paths']),
        'per_pair': per_pair, 'elapsed_seconds': round(time.monotonic() - started, 2),
        'source_comparisons_unchanged': digest(source / 'comparisons.json') == protocol['source_comparisons_sha256'],
        'limits': 'Recovery candidates require retained-source review. Unknown history is not a negative label. Development judgments are not independent human gold.'}
    save_json(destination / 'case_results.json', results)
    save_json(destination / 'concept_results.json', concepts)
    save_json(destination / 'metrics.json', summary)
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=OUTPUT / 'e3-run001')
    parser.add_argument('--run-id', default='E3-001')
    parser.add_argument('--variant', choices=['typed', 'sources'], default='typed')
    args = parser.parse_args()
    self_check()
    evaluate(args.output, args.run_id, args.variant)

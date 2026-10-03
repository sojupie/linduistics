"""Evaluate unchanged source-scoped history on new-language development cases."""
import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path

from e0 import OUTPUT, digest, save_json
from e3 import source_records, entry_keys
from e5_build import DATA
from historical_links import historical_relationships, self_check

PAIRS = ['da-nl', 'de-nl', 'en-nl', 'nb-nl', 'nl-sv',
         'da-is', 'de-is', 'en-is', 'nb-is', 'nl-is', 'sv-is']
KINDS = {
    'inherited_or_explicit_cognate': {'shared_recorded_inherited_ancestor',
        'recorded_inheritance_to_counterpart', 'explicit_cognate_statement'},
    'borrowing_related': {'direct_or_chained_borrowing', 'shared_recorded_borrowing_source',
        'borrowing_and_inheritance_from_shared_source'},
    'unspecified_shared_source': {'shared_recorded_source_unspecified'},
    'component_only_support': {'shared_recorded_component_source'},
}


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def evidence_groups(history):
    kinds = {r['kind'] for r in history['relationships'] if not r['source_uncertain']}
    return {name: bool(kinds & expected) for name, expected in KINDS.items()}


def evaluate(destination):
    destination.mkdir(exist_ok=False)
    cases, input_hashes, wanted = [], {}, set()
    for pair in PAIRS:
        directory = OUTPUT / f'e5-{pair}-review001'
        protocol = load(directory / 'protocol.json')
        build_dir = DATA / '_'.join(sorted(pair.split('-')))
        assert digest(build_dir / 'final.parquet') == protocol['final_sha256']
        concept_review, open_review = [load(directory / name) for name in
                                      ['concept_judgments.json', 'open_judgments.json']]
        for packet, review in [('concept_packet.json', concept_review), ('open_packet.json', open_review)]:
            assert digest(directory / packet) == review['packet_sha256']
        for name in ['concept_packet.json', 'open_packet.json', 'fixed_open_predictions.json',
                     'concept_judgments.json', 'open_judgments.json', 'protocol.json']:
            input_hashes[str((directory / name).relative_to(OUTPUT))] = digest(directory / name)
        decisions = {r['case_id']: r['decision'] for r in concept_review['judgments']}
        concepts = load(directory / 'concept_packet.json')
        assert all(c['role'] == 'development' for c in concepts)
        for c in concepts:
            assert len(c['variants']) <= 1, 'Review ambiguous rows explicitly before history evaluation'
            cases.append(dict(pair=pair, panel='concept', case_id=c['case_id'],
                concept=c['concept'], family_group=c['family_group'],
                history_reference=c['history_reference'], found=c['found'],
                display_decision=decisions[c['case_id']], row=c['variants'][0] if c['found'] else None))
        refs = {r['review_id']: r for r in open_review['judgments']}
        for row in load(directory / 'fixed_open_predictions.json'):
            cases.append(dict(pair=pair, panel='open', case_id=f"{pair}:open:{row['review_id']}",
                              found=True, meaning_review=refs[row['review_id']], row=row))
    for case in cases:
        if not case['found']:
            continue
        sides, selected, ambiguity = [], [], []
        for side in ['a', 'b']:
            senses = json.loads(case['row'][f'senses_{side}'])
            matched = [s for s in senses if s.get('is_active_match')]
            assert len(matched) == 1
            all_keys, alternatives = entry_keys(senses)
            selected_keys, selected_alternatives = entry_keys(matched)
            assert set(selected_keys) <= set(all_keys)
            sides.append(all_keys)
            selected.append(selected_keys)
            ambiguity.append(dict(all_entries=alternatives, selected_entries=selected_alternatives))
            wanted.update(all_keys)
        case['source_scopes'] = dict(all_entries=sides, selected_entries=selected)
        case['ambiguous_identities'] = ambiguity
    evidence_path = DATA / 'sources/evidence.jsonl'
    source_protocol = load(DATA / 'sources/protocol.json')
    print(f'Indexing combined sources for {len(wanted)} exact endpoint entries.', flush=True)
    records, forms, source_hash, source_count = source_records(evidence_path, wanted)
    assert source_hash == source_protocol['combined_sha256']
    save_json(destination / 'protocol.json', dict(plan_sha256=digest(OUTPUT / 'E5_HISTORY_PLAN.md'),
        policy_sha256=digest(OUTPUT / 'ADOPTION_CRITERIA_V2.md'), code_sha256=digest(Path(__file__)),
        reused_code_sha256={str(p): digest(p) for p in
            [OUTPUT / 'e3.py', OUTPUT.parent / 'src/historical_links.py']},
        review_inputs=input_hashes, source_sha256=source_hash, source_entries=source_count,
        endpoint_entries_requested=len(wanted), endpoint_entries_resolved=len(wanted & records.keys()),
        scope='Development only; selected displayed entries and all exact inventory entries evaluated separately.',
        labels_changed=False, no_live_database_writes=True))
    cache, results, per_pair = {}, [], defaultdict(Counter)
    for index, case in enumerate(cases, 1):
        count = per_pair[case['pair']]
        if case['panel'] == 'concept':
            status = case['history_reference']
            count[f'{status}:expected'] += 1
            count[f'{status}:retrieved'] += case['found']
            count[f'{status}:suitable_display'] += case['display_decision'] == 'acceptable'
        if case['found']:
            case['history'] = {}
            for scope, sides in case['source_scopes'].items():
                identity = tuple(tuple(side) for side in sides)
                if identity not in cache:
                    cache[identity] = historical_relationships(*sides, records, forms, shared_sources=True)
                history = cache[identity]
                groups = evidence_groups(history)
                case['history'][scope] = dict(evidence=history, support_groups=groups)
                prefix = f"{case['panel']}:{case.get('history_reference', 'sample')}:{scope}"
                for group, supported in groups.items():
                    count[f'{prefix}:{group}'] += supported
                count[f'{prefix}:source_uncertain'] += any(r['source_uncertain'] for r in history['relationships'])
                count[f'{prefix}:no_unqualified_path'] += not any(groups.values())
        results.append(case)
        if index % 200 == 0:
            print(f'Historical evidence evaluated: {index}/{len(cases)}', flush=True)
    candidates = [c for c in results if c['found'] and any(
        c['history']['selected_entries']['support_groups'][k]
        for k in KINDS if k != 'component_only_support')]
    save_json(destination / 'case_results.json', results)
    save_json(destination / 'source_review_candidates.json', candidates)
    metrics = dict(cases=len(results), concept_cases=sum(c['panel'] == 'concept' for c in results),
        open_cases=sum(c['panel'] == 'open' for c in results), per_pair={p: dict(c) for p, c in per_pair.items()},
        selected_noncomponent_review_candidates=len(candidates), source_review_complete=False,
        limits='Paths are source-recorded evidence candidates, not validated classifications. Missing paths are not unrelatedness. IE-CoR provides limited positive concept cognacy; source review and game checks remain.')
    save_json(destination / 'metrics.json', metrics)
    print(json.dumps({k:v for k,v in metrics.items() if k != 'per_pair'}, indent=2))


if __name__ == '__main__':
    self_check()
    assert not any(evidence_groups({'relationships': []}).values())
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=OUTPUT / 'e5-history001')
    evaluate(parser.parse_args().output)

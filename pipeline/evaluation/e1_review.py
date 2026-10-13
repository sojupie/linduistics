"""Prepare changed open displays and measure E1 with saved source-guided reviews."""
import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import random

import pyarrow.parquet as pq

from e0 import DATASET, OUTPUT, SEED, digest, key, read_csv, save_json


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def prepare_open(run):
    originals = {r['case_id']: r for r in load(OUTPUT / 'e0_open_development_packet.json')}
    unique = {}
    for case in load(run / 'case_displays.json'):
        if case['panel'] != 'open':
            continue
        for variant in ['A', 'B']:
            pair = case['displays'][variant]
            if pair == case['displays']['control']:
                continue
            identity = (case['case_id'], *pair)
            source = originals[case['case_id']]
            unique[identity] = {k: source[k] for k in ['case_id', 'lang_a', 'word_a', 'lang_b', 'word_b']}
            unique[identity]['display_a'], unique[identity]['display_b'] = pair
            for side in ['a', 'b']:
                unique[identity][f'senses_{side}'] = source[f'senses_{side}']
    packet = sorted(unique.values(), key=lambda r: (r['case_id'], r['display_a'], r['display_b']))
    for i, r in enumerate(packet, 1):
        r['review_id'] = i
    save_json(run / 'open_review_packet.json', packet)
    print(f'{len(packet)} distinct changed open displays require review.')


def summarize(run):
    judgments = {}
    for path in OUTPUT.glob('e0_display_review_*.json'):
        for r in load(path)['judgments']:
            judgments[r['concept_id'], r['lang'], r['word'], r['display']] = r['decision']
    new = load(run / 'concept_review.json')
    assert new['packet_sha256'] == digest(run / 'concept_review_packet.json')
    assert {r['review_id'] for r in new['judgments']} == {r['review_id'] for r in load(run / 'concept_review_packet.json')}
    for r in new['judgments']:
        judgments[r['concept_id'], r['lang'], r['word'], r['display']] = r['decision']
    concepts = {r['case_id']: r for r in read_csv(OUTPUT / 'e0_concept_results.csv')}
    results, counts, per_pair, groups = [], defaultdict(Counter), defaultdict(lambda: defaultdict(Counter)), defaultdict(list)
    for case in load(run / 'case_displays.json'):
        if case['panel'] != 'concept':
            continue
        concept = concepts[case['case_id']]['concept_id']
        decisions = {}
        for variant, pair in case['displays'].items():
            sides = [judgments[concept, case[f'lang_{s}'], case[f'word_{s}'], gloss]
                     for s, gloss in zip(['a', 'b'], pair)]
            status = next((d for d in ['wrong_sense', 'unresolved', 'restricted_sense'] if d in sides), 'acceptable')
            decisions[variant] = status
            counts[variant][status] += 1
            per_pair[f"{case['lang_a']}-{case['lang_b']}"][variant][status] += 1
        result = dict(case_id=case['case_id'], family_group=case['family_group'], decisions=decisions)
        results.append(result)
        groups[case['family_group']].append(decisions)
    assert len(results) == 995 and counts['control']['acceptable'] == 630
    bootstrap = {}
    for variant in ['A', 'B']:
        rng = random.Random(SEED)
        families = list(groups.values())
        differences = []
        for _ in range(2000):
            selected = [r for group in rng.choices(families, k=len(families)) for r in group]
            differences.append(100 * sum((r[variant] == 'acceptable') - (r['control'] == 'acceptable') for r in selected) / len(selected))
        differences.sort()
        gain = 100 * (counts[variant]['acceptable'] - counts['control']['acceptable']) / len(results)
        losses = [pair for pair, arms in per_pair.items()
                  if 100 * (arms[variant]['acceptable'] - arms['control']['acceptable']) / sum(arms['control'].values()) < -5]
        bootstrap[variant] = {'gain_percentage_points': gain, 'paired_family_95_interval': [differences[49], differences[1949]],
            'gained_cases': sum(r['decisions']['control'] != 'acceptable' and r['decisions'][variant] == 'acceptable' for r in results),
            'lost_cases': sum(r['decisions']['control'] == 'acceptable' and r['decisions'][variant] != 'acceptable' for r in results),
            'pair_loss_flags': losses, 'primary_gain_gate_met': gain >= 5 and differences[49] > 0,
            'all_gain_and_pair_gates_met': gain >= 5 and differences[49] > 0 and not losses}
    # Verify all frozen columns against the authoritative baseline, not just a promise in the runner.
    rows = load(run / 'comparisons.json')
    saved = {key(r['lang_a'], r['word_a'], r['lang_b'], r['word_b']): r for r in rows}
    columns = ['lang_a', 'word_a', 'lang_b', 'word_b', 'def_a', 'def_b', 'senses_a', 'senses_b',
               'semantic_sim', 'category', 'etymological_relation', 'translation_source_senses']
    checked = set()
    for batch in pq.ParquetFile(DATASET).iter_batches(batch_size=16384, columns=columns):
        for row in batch.to_pylist():
            identity = key(row['lang_a'], row['word_a'], row['lang_b'], row['word_b'])
            if identity not in saved or identity in checked or any(row[c] != saved[identity][c] for c in columns):
                continue
            assert all(row[c] == saved[identity][c] for c in columns), identity
            a, b = [json.loads(row[f'senses_{s}']) for s in ['a', 'b']]
            assert len(saved[identity]['matrix']) == len(a)
            assert all(len(values) == len(b) for values in saved[identity]['matrix'])
            checked.add(identity)
    assert len(checked) == len(saved)
    summary = {'run_id': load(run / 'protocol.json')['run_id'], 'concept_cases': len(results),
        'family_groups': len(groups), 'concept_counts': counts, 'per_pair': per_pair, 'variants': bootstrap,
        'original_comparisons_verified': len(checked), 'secondary_sense_matrix_cells': sum(len(r['matrix']) * len(r['matrix'][0]) for r in rows),
        'review_limits': 'Source-guided agent judgments; not independent human accuracy. Open displays assessed separately.'}
    save_json(run / 'concept_case_results.json', results)
    save_json(run / 'metrics.json', summary)
    print(json.dumps(summary, indent=2))


def summarize_open(run):
    controls = {}
    for path in OUTPUT.glob('e0_open_review_*.json'):
        for r in load(path)['judgments']:
            assert r['case_id'] not in controls
            controls[r['case_id']] = r
    reviewed = load(run / 'open_review.json')
    assert reviewed['packet_sha256'] == digest(run / 'open_review_packet.json')
    packet = load(run / 'open_review_packet.json')
    by_id = {r['review_id']: r for r in packet}
    assert {r['review_id'] for r in reviewed['judgments']} == set(by_id)
    changed = {}
    for r in reviewed['judgments']:
        assert all(r[k] == by_id[r['review_id']][k] for k in ['case_id', 'display_a', 'display_b'])
        changed[r['case_id'], r['display_a'], r['display_b']] = r
    counts, results = defaultdict(Counter), []
    for case in load(run / 'case_displays.json'):
        if case['panel'] != 'open':
            continue
        decisions = {'control': controls[case['case_id']]['headline_pair']}
        for variant in ['A', 'B']:
            pair = case['displays'][variant]
            decisions[variant] = (decisions['control'] if pair == case['displays']['control'] else
                                 changed[case['case_id'], *pair]['headline_pair'])
        for variant, status in decisions.items():
            counts[variant][status] += 1
        results.append(dict(case, decisions=decisions))
    assert len(results) == len(controls) == 207
    slices = dict(load(OUTPUT / 'e0_open_summary_v2.json')['hard_case_groups'])
    for case in results:
        pair = f"pair:{case['lang_a']}-{case['lang_b']}"
        slices.setdefault(pair, []).append(case['case_id'])
    group_results = {}
    for name, ids in slices.items():
        selected = [r for r in results if r['case_id'] in set(ids)]
        group_results[name] = {'cases': len(selected),
            'shared_headline_counts': {v: sum(r['decisions'][v].startswith('matches_') for r in selected) for v in ['control', 'A', 'B']},
            'changed_case_ids': {v: [r['case_id'] for r in selected if r['displays'][v] != r['displays']['control']] for v in ['A', 'B']}}
    summary = {'run_id': load(run / 'protocol.json')['run_id'], 'cases': len(results), 'headline_counts': counts,
        'shared_headline_counts': {v: sum(r['decisions'][v].startswith('matches_') for r in results) for v in ['control', 'A', 'B']},
        'slices': group_results,
        'limits': 'Not a population accuracy estimate. A disjoint pair may correctly show contrasting senses in a game. Renaming mismatch as no shared sense is not an improvement. Shared restricted senses remain distinct from ordinary whole-word equivalence.'}
    save_json(run / 'open_case_results.json', results)
    save_json(run / 'open_metrics.json', summary)
    print(json.dumps({k: v for k, v in summary.items() if k != 'slices'}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['prepare-open', 'summarize', 'summarize-open'])
    parser.add_argument('--run', type=Path, default=OUTPUT / 'e1-run002')
    args = parser.parse_args()
    {'prepare-open': prepare_open, 'summarize': summarize, 'summarize-open': summarize_open}[args.command](args.run)

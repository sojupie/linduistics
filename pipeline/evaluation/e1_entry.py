"""Replay compatible-entry display selection on frozen E1 development matrices."""
import argparse
from collections import Counter
import json
from pathlib import Path
import sys

from e0 import OUTPUT, digest, key, read_csv, save_json

sys.path.insert(0, str(OUTPUT.parent / 'src'))
from sense_display import RESTRICTED_USAGE, eligible_pairs, select_display


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def diagnose_anchors(destination):
    """Post-result description of the fixed English eligibility constraint."""
    counts = dict(english_comparisons=0, anchor_excludes_active_senses=0,
                  only_usage_restricted_english_with_excluded_unrestricted=0)
    cases = []
    for row in read(OUTPUT / 'e1-run003/comparisons.json'):
        if 'en' not in (row['lang_a'], row['lang_b']):
            continue
        counts['english_comparisons'] += 1
        senses = [json.loads(row['senses_' + s]) for s in 'ab']
        eligible = eligible_pairs(*senses, row['lang_a'], row['lang_b'], json.loads(row['translation_source_senses']))
        side = 0 if row['lang_a'] == 'en' else 1
        selected = {ij[side] for ij in eligible}
        active = {i for i, sense in enumerate(senses[side]) if sense.get('is_active', True)}
        if selected and active - selected:
            counts['anchor_excludes_active_senses'] += 1
            restricted = lambda i: bool(RESTRICTED_USAGE.intersection(senses[side][i].get('tags') or []))
            if all(restricted(i) for i in selected) and any(not restricted(i) for i in active - selected):
                counts['only_usage_restricted_english_with_excluded_unrestricted'] += 1
                cases.append([row[c] for c in ('lang_a', 'word_a', 'lang_b', 'word_b')])
    save_json(destination / 'anchor_diagnosis.json', {'counts': counts, 'restricted_only_cases': cases,
        'scope': 'All 1,201 familiar selected rows, not a population sample. Restricted means existing RESTRICTED_USAGE tags only; it does not detect untagged narrow senses.'})


def prepare(destination):
    destination.mkdir(parents=True, exist_ok=False)
    original = OUTPUT / 'e1-run003'
    comparisons = read(original / 'comparisons.json')
    rows = {(key(r['lang_a'], r['word_a'], r['lang_b'], r['word_b']), r['def_a'], r['def_b']): r
            for r in comparisons}
    assert len(rows) == len(comparisons), 'Frozen identities must not collapse distinct rows'
    concepts = {r['case_id']: r for r in read_csv(OUTPUT / 'e0_concept_results.csv')}
    judgments = {}
    review_paths = sorted(OUTPUT.glob('e0_display_review_*.json')) + [original / 'concept_review.json']
    for path in review_paths:
        for r in read(path)['judgments']:
            judgments[r['concept_id'], r['lang'], r['word'], r['display']] = r['decision']
    pending, changes, cases = {}, [], []
    for case in read(original / 'case_displays.json'):
        control = case['displays']['control']
        row = rows[key(case['lang_a'], case['word_a'], case['lang_b'], case['word_b']), *control]
        senses = [json.loads(row[f'senses_{s}']) for s in 'ab']
        eligible = eligible_pairs(*senses, row['lang_a'], row['lang_b'], json.loads(row['translation_source_senses']))
        selections = {v: select_display(*senses, row['matrix'], eligible, v) for v in ('B', 'C')}
        displays = {v: [senses[k][ij[k]]['gloss'] for k in (0, 1)] if ij is not None else control
                    for v, ij in selections.items()}
        assert displays['B'] == case['displays']['B'], case['case_id']
        result = {**case, 'displays': {'control': control, **displays}, 'selected_indices': selections,
                  'row_words': [row[c] for c in ('lang_a', 'word_a', 'lang_b', 'word_b')]}
        if case['panel'] == 'concept':
            concept = concepts[case['case_id']]
            result['concept_id'] = concept['concept_id']
            result['known_decisions'] = {}
            for v, pair in result['displays'].items():
                sides = []
                for s, gloss in zip('ab', pair):
                    identity = (concept['concept_id'], case[f'lang_{s}'], case[f'word_{s}'], gloss)
                    sides.append(judgments.get(identity))
                    if identity not in judgments:
                        pending[identity] = {k: concept[k] for k in ('concept_id', 'concept', 'expected_meaning')}
                        pending[identity].update(lang=identity[1], word=identity[2], display=gloss)
                result['known_decisions'][v] = sides
        if displays['C'] != displays['B']:
            changes.append({**result, 'senses_a': senses[0], 'senses_b': senses[1]})
        cases.append(result)
    assert len(comparisons) == 1201 and len(cases) == 1202
    save_json(destination / 'cases.json', cases)
    save_json(destination / 'changes.json', changes)
    save_json(destination / 'pending_concepts.json', list(pending.values()))
    inputs = [original / n for n in ('comparisons.json', 'case_displays.json', 'concept_case_results.json', 'open_case_results.json')]
    inputs += review_paths + [OUTPUT / 'e0_concept_results.csv', OUTPUT / 'E1_ENTRY_PLAN.md']
    code = [Path(__file__), OUTPUT.parent / 'src/sense_display.py', OUTPUT.parent / 'src/meaning_profile.py', OUTPUT.parent / 'src/parser.py']
    save_json(destination / 'protocol.json', {'experiment': 'E1-004', 'inputs': {str(p.relative_to(OUTPUT.parent.parent)): digest(p) for p in inputs},
        'code': {str(p.relative_to(OUTPUT.parent.parent)): digest(p) for p in code},
        'cases': len(cases), 'comparisons': len(comparisons), 'B_reconstruction_mismatches': 0,
        'matrix_cells_preserved': sum(sum(map(len, r['matrix'])) for r in comparisons),
        'review_limit': 'Familiar development set, source-guided agent review; no population accuracy claim.'})
    print(json.dumps({'changed_vs_B': dict(Counter(r['panel'] for r in changes)), 'unreviewed_concept_glosses': len(pending)}))


def summarize(destination):
    for path, expected in read(destination / 'protocol.json')['inputs'].items():
        assert digest(OUTPUT.parent.parent / path) == expected, path
    cases = read(destination / 'cases.json')
    review = read(destination / 'review.json')
    pending = read(destination / 'pending_concepts.json')
    identity = lambda r: (r['concept_id'], r['lang'], r['word'], r['display'])
    judgments = {identity(r): r['decision'] for r in review['concept_judgments']}
    assert len(judgments) == len(pending) and set(judgments) == {identity(r) for r in pending}
    changed = read(destination / 'changes.json')
    changed_reviews = {r['case_id']: r for r in review['changed_display_reviews']}
    assert len(changed_reviews) == len(changed) and set(changed_reviews) == {r['case_id'] for r in changed}
    for row in changed:
        assert changed_reviews[row['case_id']]['display'] == row['displays']['C']
        assert all(row['senses_' + side][index]['gloss'] == gloss
                   for side, index, gloss in zip('ab', row['selected_indices']['C'], row['displays']['C']))
    old_open = {r['case_id']: r for r in read(OUTPUT / 'e1-run003/open_case_results.json')}
    old_concepts = {r['case_id']: r for r in read(OUTPUT / 'e1-run003/concept_case_results.json')}
    counts, pair_counts, results = {}, {}, []
    for case in cases:
        if case['panel'] == 'concept':
            decisions = {}
            for variant, pair in case['displays'].items():
                sides = [known or judgments[case['concept_id'], case[f'lang_{s}'], case[f'word_{s}'], gloss]
                         for s, gloss, known in zip('ab', pair, case['known_decisions'][variant])]
                assert all(d in {'acceptable', 'restricted_sense', 'wrong_sense', 'unresolved'} for d in sides)
                decisions[variant] = next((d for d in ('wrong_sense', 'unresolved', 'restricted_sense') if d in sides), 'acceptable')
            for variant in ('control', 'B'):
                assert decisions[variant] == old_concepts[case['case_id']]['decisions'][variant]
        else:
            decisions = {v: old_open[case['case_id']]['decisions'][v] for v in ('control', 'B')}
            if case['displays']['C'] == case['displays']['B']:
                decisions['C'] = decisions['B']
            elif case['displays']['C'] == case['displays']['control']:
                decisions['C'] = decisions['control']
            else:
                assessment = changed_reviews[case['case_id']]['alignment']
                decisions['C'] = {'shared': 'matches_shared_sense', 'disjoint': 'no_shared_display_sense',
                                  'partial': 'matches_restricted_sense', 'unresolved': 'unresolved'}[assessment]
        pair = '-'.join(sorted((case['lang_a'], case['lang_b'])))
        for variant, status in decisions.items():
            counts.setdefault(case['panel'], {}).setdefault(variant, Counter())[status] += 1
            if case['panel'] == 'concept':
                pair_counts.setdefault(pair, {}).setdefault(variant, Counter())[status] += 1
        results.append({'case_id': case['case_id'], 'panel': case['panel'], 'pair': pair, 'decisions': decisions})
    suitable = lambda r, v: (r['decisions'][v] == 'acceptable' if r['panel'] == 'concept'
                              else r['decisions'][v].startswith('matches_'))
    changes_by_comparator = {panel: {v: {
        'gained': [r['case_id'] for r in results if r['panel'] == panel and suitable(r, 'C') and not suitable(r, v)],
        'lost': [r['case_id'] for r in results if r['panel'] == panel and not suitable(r, 'C') and suitable(r, v)]}
        for v in ('control', 'B')} for panel in ('concept', 'open')}
    save_json(destination / 'metrics.json', {'counts': counts, 'concept_by_pair': pair_counts,
        'changes': changes_by_comparator, 'review_sha256': digest(destination / 'review.json'),
        'cases_sha256': digest(destination / 'cases.json'),
        'limits': 'Diagnostic familiar development cases, not a probability sample of the dataset. Source judgments are not independent gold.'})
    save_json(destination / 'case_results.json', results)
    print(json.dumps({'counts': counts, 'changes': changes_by_comparator}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--summarize', action='store_true')
    parser.add_argument('--diagnose-anchors', action='store_true')
    args = parser.parse_args()
    (diagnose_anchors if args.diagnose_anchors else summarize if args.summarize else prepare)(args.output)

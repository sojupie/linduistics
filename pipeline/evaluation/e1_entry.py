"""Replay compatible-entry display selection on frozen E1 development matrices."""
import argparse
from collections import Counter
import json
from pathlib import Path
import sys

from e0 import OUTPUT, digest, key, read_csv, save_json

sys.path.insert(0, str(OUTPUT.parent / 'src'))
from sense_display import eligible_pairs, select_display


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def prepare(destination):
    destination.mkdir(parents=True, exist_ok=False)
    original = OUTPUT / 'e1-run003'
    comparisons = read(original / 'comparisons.json')
    rows = {(key(r['lang_a'], r['word_a'], r['lang_b'], r['word_b']), r['def_a'], r['def_b']): r
            for r in comparisons}
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


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    prepare(parser.parse_args().output)

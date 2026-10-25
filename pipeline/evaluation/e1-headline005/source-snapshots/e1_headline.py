"""Prepare E1-005 headline proposals without changing stored comparisons."""
import argparse
from collections import Counter
import gzip
import json
from pathlib import Path
import sys

from e0 import OUTPUT, digest, key, read_csv, save_json
from e1_entry import read

sys.path.insert(0, str(OUTPUT.parent / 'src'))
from sense_display import eligible_pairs, select_display, select_headline


def prepare(destination):
    frozen_sample = OUTPUT / 'e1-headline005/sample.json'
    if not destination.exists():
        destination.mkdir(parents=True)
        save_json(destination / 'sample.json', read(frozen_sample))
    assert sorted(p.name for p in destination.iterdir()) == ['sample.json']
    assert digest(destination / 'sample.json') == digest(frozen_sample)
    sample = read(frozen_sample)
    assert sample['plan_sha256'] == digest(OUTPUT / 'E1_HEADLINE_PLAN.md')
    selected = set(sample['cases'])
    old = OUTPUT / 'e1-run003'
    rows = read(old / 'comparisons.json')
    by_row = {(key(r['lang_a'], r['word_a'], r['lang_b'], r['word_b']), r['def_a'], r['def_b']): r for r in rows}
    assert len(by_row) == 1201
    concepts = {r['case_id']: r for r in read_csv(OUTPUT / 'e0_concept_results.csv')}
    c_cases = {r['case_id']: r for r in read(OUTPUT / 'e1-entry004/cases.json')}
    evidence_file = OUTPUT / 'translation-support001/final/profiles.json.gz'
    manifest = read(OUTPUT / 'translation-support001/files.json')
    assert digest(evidence_file) == manifest['final/profiles.json.gz']['sha256']
    evidence = {tuple(r['words']): r for r in json.loads(gzip.decompress(evidence_file.read_bytes()))}
    judgments = {}
    paths = sorted(OUTPUT.glob('e0_display_review_*.json')) + [old / 'concept_review.json']
    for path in paths:
        for r in read(path)['judgments']:
            judgments[r['concept_id'], r['lang'], r['word'], r['display']] = r['decision']
    for r in read(OUTPUT / 'e1-entry004/review.json')['concept_judgments']:
        judgments[r['concept_id'], r['lang'], r['word'], r['display']] = r['decision']
    pending, packet, cases = {}, [], []
    for case in read(old / 'case_displays.json'):
        control = case['displays']['control']
        row = by_row[key(case['lang_a'], case['word_a'], case['lang_b'], case['word_b']), *control]
        senses = [json.loads(row['senses_' + side]) for side in 'ab']
        words = tuple(row[c] for c in ('lang_a', 'word_a', 'lang_b', 'word_b'))
        eligible = eligible_pairs(*senses, row['lang_a'], row['lang_b'], json.loads(row['translation_source_senses']))
        glosses = lambda ij: [senses[s][ij[s]]['gloss'] for s in (0, 1)] if ij is not None else control
        secondary = max(eligible, key=lambda ij: row['matrix'][ij[0]][ij[1]]) if eligible else None
        assert glosses(secondary) == control, case['case_id']
        for v in ('B', 'C'):
            assert glosses(select_display(*senses, row['matrix'], eligible, v)) == c_cases[case['case_id']]['displays'][v]
        chosen = select_headline(*senses, row['matrix'], row['word_a'], row['word_b'], evidence[words])
        displays = {**c_cases[case['case_id']]['displays'], 'D': glosses(chosen)}
        result = {k: case[k] for k in ('case_id', 'panel', 'family_group', 'lang_a', 'word_a', 'lang_b', 'word_b')}
        result.update(row_words=list(words), displays=displays, headline_indices=chosen, secondary_indices=secondary,
                      headline_status='proposed' if chosen is not None else 'no_current_substantive_sense_keep_original',
                      secondary_score=row['matrix'][secondary[0]][secondary[1]] if secondary is not None else None)
        if case['case_id'] in selected:
            concept = concepts[case['case_id']]
            result['concept_id'] = concept['concept_id']
            result['known_decisions'] = {}
            for v, pair in displays.items():
                result['known_decisions'][v] = []
                for side, gloss in zip('ab', pair):
                    ident = (concept['concept_id'], case['lang_' + side], case['word_' + side], gloss)
                    result['known_decisions'][v].append(judgments.get(ident))
                    if ident not in judgments:
                        pending[ident] = dict(concept_id=ident[0], lang=ident[1], word=ident[2], display=ident[3],
                                              concept=concept['concept'], expected_meaning=concept['expected_meaning'])
        if case['panel'] == 'open' and displays['D'] != control:
            fields = ('gloss', 'pos', 'tags', 'is_active', 'source_entry_key', 'source_sense_id')
            packet.append({**result, 'senses': [[{k: s[k] for k in fields if k in s} for s in side] for side in senses]})
        cases.append(result)
    assert len(cases) == 1202 and sum('known_decisions' in r for r in cases) == 100
    save_json(destination / 'cases.json', cases)
    save_json(destination / 'pending_concepts.json', list(pending.values()))
    save_json(destination / 'open_review_packet.json', packet)
    inputs = paths + [old / 'comparisons.json', old / 'case_displays.json', OUTPUT / 'e1-entry004/cases.json',
        OUTPUT / 'e1-entry004/review.json', evidence_file, frozen_sample, OUTPUT / 'E1_HEADLINE_PLAN.md', OUTPUT / 'e0_concept_results.csv']
    code = [Path(__file__), OUTPUT / 'e0.py', OUTPUT / 'e1_entry.py', OUTPUT.parent / 'src/sense_display.py',
            OUTPUT.parent / 'src/meaning_profile.py', OUTPUT.parent / 'src/parser.py']
    root = OUTPUT.parent.parent
    save_json(destination / 'protocol.json', {'run': 'E1-005', 'inputs': {str(p.relative_to(root)): digest(p) for p in inputs},
        'code': {str(p.relative_to(root)): digest(p) for p in code}, 'preserved_secondary_displays': len(cases),
        'matrix_cells_retained': sum(sum(map(len, r['matrix'])) for r in rows)})
    print(json.dumps({'concept_glosses_to_review': len(pending), 'open_displays_to_review': len(packet),
                      'changes': dict(Counter(r['panel'] for r in cases if r['displays']['D'] != r['displays']['control']))}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    prepare(parser.parse_args().output)

"""Prepare E1-005 headline proposals without changing stored comparisons."""
import argparse
from collections import Counter
import gzip
import json
from pathlib import Path
import sys

from e0 import OUTPUT, digest, key, read_csv, save_json
from e1_entry import read
from pipeline.evaluation.verification import estimate

sys.path.insert(0, str(OUTPUT.parent / 'src'))
from sense_display import eligible_pairs, select_display, select_headline


def prepare(destination, variant='D'):
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
    if variant in {'E', 'F'}:
        for r in read(OUTPUT / 'e1-headline005/review.json')['concept_judgments']:
            judgments[r['concept_id'], r['lang'], r['word'], r['display']] = r['decision']
        d_cases = {r['case_id']: r for r in read(OUTPUT / 'e1-headline005/cases.json')}
    if variant == 'F':
        for r in read(OUTPUT / 'e1-headline006/review.json')['concept_judgments']:
            judgments[r['concept_id'], r['lang'], r['word'], r['display']] = r['decision']
        e_cases = {r['case_id']: r for r in read(OUTPUT / 'e1-headline006/cases.json')}
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
        chosen = select_headline(*senses, row['matrix'], row['word_a'], row['word_b'], evidence[words], variant=variant)
        displays = dict(c_cases[case['case_id']]['displays'])
        if variant in {'E', 'F'}:
            d = select_headline(*senses, row['matrix'], row['word_a'], row['word_b'], evidence[words])
            assert glosses(d) == d_cases[case['case_id']]['displays']['D']
            displays['D'] = glosses(d)
        if variant == 'F':
            e = select_headline(*senses, row['matrix'], row['word_a'], row['word_b'], evidence[words], variant='E')
            assert glosses(e) == e_cases[case['case_id']]['displays']['E']
            displays['E'] = glosses(e)
        displays[variant] = glosses(chosen)
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
        if case['panel'] == 'open' and displays[variant] != control:
            fields = ('gloss', 'pos', 'tags', 'is_active', 'source_entry_key', 'source_sense_id')
            packet.append({**result, 'senses': [[{k: s[k] for k in fields if k in s} for s in side] for side in senses]})
        cases.append(result)
    assert len(cases) == 1202 and sum('known_decisions' in r for r in cases) == 100
    save_json(destination / 'cases.json', cases)
    save_json(destination / 'pending_concepts.json', list(pending.values()))
    save_json(destination / 'open_review_packet.json', packet)
    inputs = paths + [old / 'comparisons.json', old / 'case_displays.json', OUTPUT / 'e1-entry004/cases.json',
        OUTPUT / 'e1-entry004/review.json', evidence_file, frozen_sample, OUTPUT / 'E1_HEADLINE_PLAN.md', OUTPUT / 'e0_concept_results.csv']
    if variant in {'E', 'F'}:
        inputs += [OUTPUT / 'E1_HEADLINE_REVISION_PLAN.md', OUTPUT / 'e1-headline005/review.json', OUTPUT / 'e1-headline005/cases.json']
    if variant == 'F':
        inputs += [OUTPUT / 'E1_HEADLINE_ENTRY_PLAN.md', OUTPUT / 'e1-headline006/review.json', OUTPUT / 'e1-headline006/cases.json']
    code = [Path(__file__), OUTPUT / 'e0.py', OUTPUT / 'e1_entry.py', OUTPUT.parent / 'src/sense_display.py',
            OUTPUT.parent / 'src/meaning_profile.py', OUTPUT.parent / 'src/parser.py']
    root = OUTPUT.parent.parent
    save_json(destination / 'protocol.json', {'run': {'D': 'E1-005', 'E': 'E1-006', 'F': 'E1-007'}[variant], 'variant': variant, 'inputs': {str(p.relative_to(root)): digest(p) for p in inputs},
        'code': {str(p.relative_to(root)): digest(p) for p in code}, 'preserved_secondary_displays': len(cases),
        'matrix_cells_retained': sum(sum(map(len, r['matrix'])) for r in rows)})
    print(json.dumps({'concept_glosses_to_review': len(pending), 'open_displays_to_review': len(packet),
                      'changes': dict(Counter(r['panel'] for r in cases if r['displays'][variant] != r['displays']['control']))}))


def summarize(destination):
    protocol = read(destination / 'protocol.json')
    candidate = protocol.get('variant', 'D')
    for path, expected in protocol['inputs'].items():
        assert digest(OUTPUT.parent.parent / path) == expected, path
    review = read(destination / 'review.json')
    assert digest(destination / 'pending_concepts.json') == review['pending_concepts_sha256']
    assert digest(destination / 'open_review_packet.json') == review['open_packet_sha256']
    ident = lambda r: (r['concept_id'], r['lang'], r['word'], r['display'])
    supplied = {ident(r): r['decision'] for r in review['concept_judgments']}
    assert len(supplied) == len(review['concept_judgments'])
    assert set(supplied) == {ident(r) for r in read(destination / 'pending_concepts.json')}
    cases = read(destination / 'cases.json')
    sample = read(destination / 'sample.json')
    counts, per_pair, results = {}, {}, []
    for case in cases:
        if 'known_decisions' not in case:
            continue
        pair = '-'.join(sorted([case['lang_a'], case['lang_b']]))
        decisions = {}
        for v, display in case['displays'].items():
            sides = [known or supplied[case['concept_id'], case['lang_' + s], case['word_' + s], gloss]
                     for s, gloss, known in zip('ab', display, case['known_decisions'][v])]
            assert all(s in {'wrong_sense', 'unresolved', 'restricted_sense', 'acceptable'} for s in sides)
            status = next((s for s in ('wrong_sense', 'unresolved', 'restricted_sense') if s in sides), 'acceptable')
            decisions[v] = status
            counts.setdefault(v, Counter())[status] += 1
            per_pair.setdefault(pair, {}).setdefault(v, Counter())[status] += 1
        results.append({'case_id': case['case_id'], 'pair': pair, 'decisions': decisions})
    variants = list(counts)
    weighted = {}
    for v in variants:
        values = {pair: [int(r['decisions'][v] == 'acceptable') for r in results if r['pair'] == pair] for pair in sample['strata']}
        upper = {pair: [int(r['decisions'][v] in {'acceptable', 'unresolved'}) for r in results if r['pair'] == pair] for pair in sample['strata']}
        weighted[v] = {'supported_lower': estimate(values, sample['strata']), 'unresolved_upper': estimate(upper, sample['strata'])}
    differences = {}
    for v in variants:
        if v == 'control':
            continue
        values = {pair: [int(r['decisions'][v] == 'acceptable') - int(r['decisions']['control'] == 'acceptable')
                        for r in results if r['pair'] == pair] for pair in sample['strata']}
        differences[v] = {'weighted_change': estimate(values, sample['strata']),
            'gains': [r['case_id'] for r in results if r['decisions'][v] == 'acceptable' and r['decisions']['control'] != 'acceptable'],
            'losses': [r['case_id'] for r in results if r['decisions'][v] != 'acceptable' and r['decisions']['control'] == 'acceptable']}
    for comparator in (['D'] if candidate == 'E' else ['D', 'E'] if candidate == 'F' else []):
        values = {pair: [int(r['decisions'][candidate] == 'acceptable') - int(r['decisions'][comparator] == 'acceptable')
                        for r in results if r['pair'] == pair] for pair in sample['strata']}
        differences[candidate + '_vs_' + comparator] = {'weighted_change': estimate(values, sample['strata']),
            'gains': [r['case_id'] for r in results if r['decisions'][candidate] == 'acceptable' and r['decisions'][comparator] != 'acceptable'],
            'losses': [r['case_id'] for r in results if r['decisions'][candidate] != 'acceptable' and r['decisions'][comparator] == 'acceptable']}
    packet = {r['case_id']: r for r in read(destination / 'open_review_packet.json')}
    open_reviews = review['open_judgments']
    assert len(open_reviews) == len(packet) and {r['case_id'] for r in open_reviews} == set(packet)
    for r in open_reviews:
        assert r['control'] == packet[r['case_id']]['displays']['control'] and r[candidate] == packet[r['case_id']]['displays'][candidate]
    open_metrics = {'reviewed_changed': len(packet), 'unchanged': 207 - len(packet),
        'headline_counts_on_changed': {v: dict(Counter(r[v + '_headline'] for r in open_reviews)) for v in ('control', candidate)},
        candidate + '_alignment_on_changed': dict(Counter(r[candidate + '_alignment'] for r in open_reviews)),
        'plausibility_gains': [r['case_id'] for r in open_reviews if r[candidate + '_headline'] == 'suitable' and r['control_headline'] != 'suitable'],
        'plausibility_losses': [r['case_id'] for r in open_reviews if r[candidate + '_headline'] != 'suitable' and r['control_headline'] == 'suitable']}
    save_json(destination / 'concept_results.json', results)
    save_json(destination / 'metrics.json', {'concept_counts': counts, 'concept_by_pair': per_pair, 'weighted': weighted,
        'differences': differences, 'open': open_metrics, 'review_sha256': digest(destination / 'review.json'),
        'limits': 'Source-guided familiar development judgments. Sampling error applies only to the fixed 995-case frame; it excludes reviewer bias.'})
    print(json.dumps({'concept_counts': counts, 'candidate_weighted': weighted[candidate], 'candidate_change': differences[candidate], 'open': open_metrics}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--summarize', action='store_true')
    parser.add_argument('--variant', choices=['D', 'E', 'F'], default='D')
    args = parser.parse_args()
    if args.summarize:
        summarize(args.output)
    else:
        prepare(args.output, args.variant)

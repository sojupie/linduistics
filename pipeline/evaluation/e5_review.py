"""Prepare development-only meaning and open-vocabulary reviews for a built pair."""
import argparse
from collections import Counter, defaultdict
import json
import hashlib
from pathlib import Path
import random

import pyarrow.parquet as pq

from e0 import OUTPUT, digest, key, normalized, read_csv, save_json, SEED
from e5_build import DATA
from sense_aligner import parse_root
from e2 import CONTROL_LABELS


def prepare(pair, destination):
    pair = tuple(sorted(pair))
    destination.mkdir(parents=True, exist_ok=False)
    path = DATA / '_'.join(pair) / 'final.parquet'
    build_protocol = json.loads((path.parent / 'protocol.json').read_text())
    assert digest(path) == build_protocol['artifacts'][path.name]
    cases = [r for r in json.loads((OUTPUT / 'e5-panel002/cases.json').read_text())
             if (r['lang_a'], r['lang_b']) == pair and r['role'] == 'development']
    wanted = {key(*[c[n] for n in ['lang_a', 'word_a', 'lang_b', 'word_b']]) for c in cases}
    family_data = json.loads((OUTPUT / 'e0_families_v2.json').read_text())
    old_roles = {m: g['role'] for g in family_data['groups'].values() for m in g['members']}
    new_roles = defaultdict(set)
    for c in json.loads((OUTPUT / 'e5-panel002/cases.json').read_text()):
        for side in ['a', 'b']:
            new_roles[c[f'lang_{side}'], normalized(c[f'word_{side}'])].add(c['role'])
    matched, samples, counts = defaultdict(list), defaultdict(list), Counter()
    rng = random.Random(f'{SEED}:{pair[0]}:{pair[1]}')
    for batch in pq.ParquetFile(path).iter_batches():
        for r in batch.to_pylist():
            if r['lang_a'] >= r['lang_b']:
                continue
            identity = key(r['lang_a'], r['word_a'], r['lang_b'], r['word_b'])
            if identity in wanted:
                matched[identity].append(r)
            category = r['category']
            counts[category] += 1
            bucket = samples[category]
            if len(bucket) < 5:
                bucket.append(r)
            else:
                index = rng.randrange(counts[category])
                if index < 5:
                    bucket[index] = r
    concept_packet = []
    for c in cases:
        variants = matched.get(key(c['lang_a'], c['word_a'], c['lang_b'], c['word_b']), [])
        exact = [r for r in variants if r['word_a'] == c['word_a'] and r['word_b'] == c['word_b']]
        candidates = exact or variants
        concept_packet.append({**c, 'found': bool(variants), 'reference_exact_spelling': bool(exact),
                               'ambiguous_matching_rows': len(candidates) > 1,
                               'variants': [{n: r[n] for n in ['word_a', 'word_b', 'def_a', 'def_b', 'pos_a', 'pos_b', 'senses_a', 'senses_b']} for r in candidates]})
    open_packet, fixed, held = [], [], []
    for category, bucket in sorted(samples.items()):
        for r in bucket:
            roles = set()
            for side in ['a', 'b']:
                lang, word = r[f'lang_{side}'], normalized(r[f'word_{side}'])
                roles.update(new_roles[lang, word])
                roles.add(old_roles.get(f'lex:{lang}:{word}', 'development'))
                for s in json.loads(r[f'senses_{side}']):
                    root = parse_root(s.get('etym_root'))
                    if root:
                        roles.add(old_roles.get('root:' + ':'.join(root), 'development'))
            if roles - {'development'}:
                held.append({'category': category, 'reason': 'known reserved or bridge family', 'row_identity_sha256':
                             hashlib.sha256(json.dumps([r['lang_a'],r['word_a'],r['lang_b'],r['word_b']]).encode()).hexdigest()})
                continue
            review_id = len(open_packet) + 1
            open_packet.append({'review_id': review_id, **{n: r[n] for n in
                ['lang_a', 'word_a', 'lang_b', 'word_b', 'def_a', 'def_b', 'pos_a', 'pos_b', 'senses_a', 'senses_b', 'etym_text_a', 'etym_text_b']}})
            fixed.append({'review_id': review_id, **r})
    concepts = {c['concept_id'] for c in cases}
    partner = next((l for l in pair if l not in ['nl', 'is']), None)
    old_cases = read_csv(OUTPUT / 'e0_concept_cases.csv')
    assignments = {r['case_id']: r['role'] for r in family_data['cases'] if r['panel'] == 'concept'}
    judgments = {r['case_id']: r['decisions']['control'] for r in
                 json.loads((OUTPUT / 'e1-run003/concept_case_results.json').read_text())}
    comparator = [r for r in old_cases if assignments[r['case_id']] == 'development'
                  and r['concept_id'] in concepts and (partner is None or partner in [r['lang_a'], r['lang_b']])]
    comparator_found = [r for r in comparator if r['case_id'] in judgments]
    summary = dict(pair=list(pair), concept_cases=len(cases), found=sum(c['found'] for c in concept_packet),
        ambiguous_matches=sum(c['ambiguous_matching_rows'] for c in concept_packet),
        canonical_category_counts=dict(counts), open_sample_selected=sum(map(len,samples.values())),
        open_review_cases=len(open_packet), held_out_sample_cases=held,
        old_comparator=dict(cases=len(comparator), found=len(comparator_found),
            acceptable_displays=sum(judgments[r['case_id']] == 'acceptable' for r in comparator_found),
            case_ids=[r['case_id'] for r in comparator]))
    save_json(destination / 'concept_packet.json', concept_packet)
    save_json(destination / 'open_packet.json', open_packet)
    save_json(destination / 'fixed_open_predictions.json', fixed)
    save_json(destination / 'summary.json', summary)
    save_json(destination / 'protocol.json', dict(pair=list(pair), seed=SEED, final_sha256=digest(path),
        code_sha256=digest(Path(__file__)), panel_protocol_sha256=digest(OUTPUT / 'e5-panel002/protocol.json'),
        review='Source-guided agent judgment pending; not independent human gold.',
        sampling='Five canonical rows per category, seeded reservoir; known reserved/bridge families withheld without replacements.',
        blinding='Open packet omits categories and numeric scores. Source senses and claims remain available.',
        separation_limits='Unknown families among open vocabulary may still overlap; no claim of complete historical family separation.'))
    print(json.dumps({k:v for k,v in summary.items() if k not in ['old_comparator','held_out_sample_cases']}, indent=2))


def score(directory):
    def load(name):
        return json.loads((directory / name).read_text(encoding='utf-8'))
    concepts, open_cases = load('concept_packet.json'), load('fixed_open_predictions.json')
    cj, oj = load('concept_judgments.json'), load('open_judgments.json')
    assert cj['packet_sha256'] == digest(directory / 'concept_packet.json')
    assert oj['packet_sha256'] == digest(directory / 'open_packet.json')
    assert {r['case_id'] for r in cj['judgments']} == {r['case_id'] for r in concepts}
    assert {r['review_id'] for r in oj['judgments']} == {r['review_id'] for r in open_cases}
    by_id = {r['case_id']: r for r in cj['judgments']}
    for c in concepts:
        assert (by_id[c['case_id']]['decision'] == 'missing') == (not c['found'])
    references = {r['review_id']: r for r in oj['judgments']}
    open_results = [{**references[r['review_id']], 'word_a': r['word_a'], 'word_b': r['word_b'],
        'category': r['category'], 'mapped_label': CONTROL_LABELS[r['category']],
        'compatible': CONTROL_LABELS[r['category']] in references[r['review_id']]['compatible_labels']
            if references[r['review_id']]['scorable'] else None} for r in open_cases]
    summary = load('summary.json')
    found = sum(c['found'] for c in concepts)
    acceptable = sum(r['decision'] == 'acceptable' for r in cj['judgments'])
    old = summary['old_comparator']
    recall_difference = 100 * (found / len(concepts) - old['found'] / old['cases'])
    display_difference = 100 * (acceptable / found - old['acceptable_displays'] / old['found'])
    result = dict(pair=summary['pair'], concept_cases=len(concepts), found=found, acceptable=acceptable,
        wrong_sense=found - acceptable, missing=len(concepts)-found,
        recall_difference_points=recall_difference, display_difference_points=display_difference,
        recall_transfer_pass=recall_difference >= -5, display_transfer_pass=display_difference >= -5,
        open_scorable=sum(r['compatible'] is not None for r in open_results),
        open_compatible=sum(r['compatible'] is True for r in open_results),
        open_unresolved=sum(r['compatible'] is None for r in open_results),
        interpretation='Development transfer only; descriptive comparison, not paired accuracy or release approval.',
        reviewer='Source-guided Codex agent, not independent human gold',
        remaining='Source diagnosis for missing comparisons, game eligibility, separate historical evidence and reserved-family/product checks.')
    save_json(directory / 'scored_results.json', result)
    save_json(directory / 'open_case_results.json', open_results)
    lines = ['# Development review cases', '', '## Concept-conditioned meanings', '',
             '| Concept | Result | Reason |', '| --- | --- | --- |']
    lines += [f"| {r['concept']} | {r['decision']} | {r['reason'].replace('|', '/')} |" for r in cj['judgments']]
    lines += ['', '## Open vocabulary', '', '| Pair | Saved category | Compatible meaning label | Reason |', '| --- | --- | --- | --- |']
    lines += [f"| {r['word_a']} / {r['word_b']} | {r['category']} | {'Unresolved' if r['compatible'] is None else 'Yes' if r['compatible'] else 'No'} | {r['reason'].replace('|', '/')} |" for r in open_results]
    with (directory / 'REVIEW_CASES.md').open('x', encoding='utf-8') as stream:
        stream.write('\n'.join(lines) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pair', nargs=2)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--score', action='store_true')
    args = parser.parse_args()
    if args.score:
        score(args.output)
    else:
        assert args.pair, '--pair required for preparation'
        prepare(args.pair, args.output)

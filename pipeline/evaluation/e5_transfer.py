"""Record separate family intervals and source-headword diagnoses for completed reviews."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import random

import pyarrow.parquet as pq

from e0 import OUTPUT, ROOT, BASELINE, SEED, normalized, digest, save_json


def intervals(records):
    groups = defaultdict(lambda: [0, 0, 0])
    for r in records:
        cluster = groups[r['family_group']]
        cluster[0] += 1
        cluster[1] += r['found']
        cluster[2] += r['acceptable']
    rng, values = random.Random(SEED), list(groups.values())
    recall, display, end_to_end = [], [], []
    for _ in range(2000):
        selected = rng.choices(values, k=len(values))
        total, found, correct = [sum(c[i] for c in selected) for i in range(3)]
        recall.append(100 * found / total)
        end_to_end.append(100 * correct / total)
        if found:
            display.append(100 * correct / found)
    def bounds(samples):
        samples.sort()
        return [samples[int(len(samples)*.025)-1], samples[int(len(samples)*.975)-1]]
    return dict(families=len(groups), expected_pair_recall_95=bounds(recall),
        found_pair_display_95=bounds(display), end_to_end_display_95=bounds(end_to_end),
        samples_with_no_found_pairs=2000-len(display))


def main(destination, language='nl'):
    destination.mkdir(exist_ok=False)
    old_split = json.loads((OUTPUT / 'e0_families_v2.json').read_text())
    old_roles = {r['case_id']: r for r in old_split['cases'] if r['panel'] == 'concept'}
    old_judgments = {r['case_id']: r['decisions']['control'] for r in
                     json.loads((OUTPUT / 'e1-run003/concept_case_results.json').read_text())}
    lookups = {}
    for lang in ['da', 'de', 'en', 'nb', 'sv', 'nl'] + (['is'] if language == 'is' else []):
        path = (ROOT / 'pipeline/data/e5-source-audit' if lang in ['nl', 'is'] else BASELINE) / f'lemmas_{lang}.parquet'
        lookups[lang] = {normalized(r['word']) for r in pq.read_table(path, columns=['word']).to_pylist()}
    results, pending = {}, []
    pairs = (['da-nl', 'de-nl', 'en-nl', 'nb-nl', 'nl-sv'] if language == 'nl' else
             ['da-is', 'de-is', 'en-is', 'nb-is', 'nl-is', 'sv-is'])
    for pair in pairs:
        directory = OUTPUT / f'e5-{pair}-review001'
        if not (directory / 'scored_results.json').exists():
            pending.append(pair)
            continue
        cases = json.loads((directory / 'concept_packet.json').read_text())
        review = json.loads((directory / 'concept_judgments.json').read_text())
        assert digest(directory / 'concept_packet.json') == review['packet_sha256']
        decisions = {r['case_id']: r['decision'] for r in review['judgments']}
        new = [dict(family_group=c['family_group'], found=c['found'],
                    acceptable=decisions[c['case_id']] == 'acceptable') for c in cases]
        summary = json.loads((directory / 'summary.json').read_text())
        old = [dict(family_group=old_roles[c]['family_group'], found=c in old_judgments,
                    acceptable=old_judgments.get(c) == 'acceptable') for c in summary['old_comparator']['case_ids']]
        assert all(old_roles[c]['role'] == 'development' for c in summary['old_comparator']['case_ids'])
        missing = [dict(case_id=c['case_id'], concept=c['concept'], word_a=c['word_a'], word_b=c['word_b'],
            head_a_present=normalized(c['word_a']) in lookups[c['lang_a']],
            head_b_present=normalized(c['word_b']) in lookups[c['lang_b']]) for c in cases if not c['found']]
        results[pair] = dict(new_intervals=intervals(new), comparator_intervals=intervals(old),
            missing_comparisons=missing, missing_with_both_source_heads=sum(r['head_a_present'] and r['head_b_present'] for r in missing),
            scored_results=json.loads((directory / 'scored_results.json').read_text()),
            judgment_sha256=digest(directory / 'concept_judgments.json'), open_judgment_sha256=digest(directory / 'open_judgments.json'))
    assert results, 'No completed reviews to measure'
    save_json(destination / 'results.json', results)
    save_json(destination / 'protocol.json', dict(code_sha256=digest(Path(__file__)), seed=SEED, repetitions=2000,
        language=language, pending_reviews=pending, all_pair_reviews_complete=not pending,
        method='Separate family bootstrap intervals for old and new cohorts; not a paired improvement confidence interval.',
        limits='Intervals quantify family resampling, not correctness of source-guided agent judgments; no population accuracy claim from the open sample.'))
    for pair, r in results.items():
        print(pair, r['new_intervals'], 'missing with both source heads', r['missing_with_both_source_heads'])


if __name__ == '__main__':
    assert intervals([dict(family_group='one', found=True, acceptable=True)])['found_pair_display_95'] == [100, 100]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--language', choices=['nl', 'is'], default='nl')
    parser.add_argument('--output', type=Path, default=OUTPUT / 'e5-dutch-transfer001')
    args = parser.parse_args()
    main(args.output, args.language)

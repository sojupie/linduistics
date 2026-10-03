"""Record source-guided agent judgments after reading a blinded packet.

These judgments are not independent human gold. Expected concepts and historical
sets come from the published reference; record the distinction in every report.
"""
from collections import Counter, defaultdict
import argparse
import json
import random

from e0 import OUTPUT, REFERENCE, SEED, digest, read_csv, save_json


def prepare_packet():
    families = json.loads((OUTPUT / 'e0_families_v2.json').read_text(encoding='utf-8'))
    development = {c['case_id'] for c in families['cases'] if c['panel'] == 'concept' and c['role'] == 'development'}
    items = {}
    for case in read_csv(OUTPUT / 'e0_concept_results.csv'):
        if case['case_id'] not in development or case['coverage_status'] != 'found':
            continue
        for side in ['a', 'b']:
            identity = (case['concept_id'], case[f'lang_{side}'], case[f'word_{side}'], case[f'display_{side}'])
            items[identity] = {'concept_id': case['concept_id'], 'concept': case['concept'],
                'expected_meaning': case['expected_meaning'], 'lang': case[f'lang_{side}'],
                'word': case[f'word_{side}'], 'display': case[f'display_{side}']}
    items = sorted(items.values(), key=lambda x: (int(x['concept_id']), x['lang'], x['word'], x['display']))
    for i, item in enumerate(items):
        item['review_id'] = i + 1
    # Match the frozen first packet exactly, including its no-final-newline format.
    with (OUTPUT / 'e0_development_display_packet.json').open('x', encoding='utf-8') as stream:
        json.dump(items, stream, ensure_ascii=False, indent=2)


def record(start, stop, exceptions):
    """Save one completely read range; exceptions map ID to (decision, reason)."""
    packet_path = OUTPUT / 'e0_development_display_packet.json'
    packet = json.loads(packet_path.read_text(encoding='utf-8'))
    items = [r for r in packet if start <= r['review_id'] <= stop]
    assert len(items) == stop - start + 1
    assert set(exceptions) <= {r['review_id'] for r in items}
    reference = {r['ID']: r for r in read_csv(REFERENCE / 'cldf_parameters.csv')}
    judgments = []
    for item in items:
        decision, reason = exceptions.get(item['review_id'], ('acceptable', 'Displayed wording matches the published target concept.'))
        assert decision in {'acceptable', 'wrong_sense', 'restricted_sense', 'unresolved'}
        judgments.append({**item, 'decision': decision, 'reason': reason,
                          'reviewer': 'Codex agent, source-guided; not an independent human annotator',
                          'reference': f"IE-CoR 1.1 concept {item['concept_id']}, Concepticon {reference[item['concept_id']]['Concepticon_ID']}"})
    save_json(OUTPUT / f'e0_display_review_{start:03}_{stop:03}.json', {
        'packet_sha256': digest(packet_path), 'reference_sha256': digest(REFERENCE / 'cldf_parameters.csv'),
        'rubric': {
            'acceptable': 'Describes the source-defined ordinary concept; a bare translation of that concept is acceptable.',
            'wrong_sense': 'Describes a different object, action, homograph, grammatical use, or figurative/technical sense.',
            'restricted_sense': 'Describes only a limited subset or context which the published target guidelines exclude.',
            'unresolved': 'Available wording or source evidence does not settle the judgment.',
        },
        'judgments': judgments,
    })
    print(dict(Counter(j['decision'] for j in judgments)))


def summarize():
    packet_path = OUTPUT / 'e0_development_display_packet.json'
    packet = json.loads(packet_path.read_text(encoding='utf-8'))
    by_identity, seen = {}, set()
    for path in sorted(OUTPUT.glob('e0_display_review_*.json')):
        review = json.loads(path.read_text(encoding='utf-8'))
        assert review['packet_sha256'] == digest(packet_path)
        assert review['reference_sha256'] == digest(REFERENCE / 'cldf_parameters.csv')
        for row in review['judgments']:
            assert row['review_id'] not in seen
            seen.add(row['review_id'])
            assert row['reference'].startswith('IE-CoR 1.1 concept ')
            by_identity[(row['concept_id'], row['lang'], row['word'], row['display'])] = row
    assert seen == {r['review_id'] for r in packet}, 'Unreviewed definitions remain'
    families = json.loads((OUTPUT / 'e0_families_v2.json').read_text(encoding='utf-8'))
    roles = {c['case_id']: c for c in families['cases']}
    groups, counts, per_pair, judged = defaultdict(list), Counter(), defaultdict(Counter), []
    for case in read_csv(OUTPUT / 'e0_concept_results.csv'):
        if roles[case['case_id']]['role'] != 'development' or case['coverage_status'] != 'found':
            continue
        sides = [by_identity[(case['concept_id'], case[f'lang_{s}'], case[f'word_{s}'], case[f'display_{s}'])]['decision'] for s in ['a', 'b']]
        status = ('wrong_sense' if 'wrong_sense' in sides else 'unresolved' if 'unresolved' in sides
                  else 'restricted_sense' if 'restricted_sense' in sides else 'acceptable')
        counts[status] += 1
        per_pair[f"{case['lang_a']}-{case['lang_b']}"][status] += 1
        group = roles[case['case_id']]['family_group']
        groups[group].append(status)
        judged.append({'case_id': case['case_id'], 'family_group': group, 'side_decisions': sides, 'pair_decision': status})
    rng = random.Random(SEED)
    clusters = [Counter(values) for values in groups.values()]
    rates = []
    for _ in range(2000):
        selected = rng.choices(clusters, k=len(clusters))
        rates.append(sum(c['acceptable'] for c in selected) / sum(sum(c.values()) for c in selected))
    rates.sort()
    save_json(OUTPUT / 'e0_display_metrics.json', {
        'reviewed_definitions': len(packet), 'definition_decisions': dict(Counter(r['decision'] for r in by_identity.values())),
        'reviewed_development_pairs': len(judged), 'pair_decisions': dict(counts), 'per_pair': dict(per_pair),
        'family_groups': len(groups), 'strict_pair_acceptance': counts['acceptable'] / len(judged),
        'family_bootstrap_95_interval': [rates[49], rates[1949]], 'bootstrap_repetitions': 2000, 'seed': SEED,
        'limits': 'Source-guided agent judgments on development cases, not independent human gold or vocabulary-wide accuracy. Interval describes family resampling, not reviewer correctness.',
        'polysemy_policy': 'A valid headline for a different concept can fail this concept-conditioned check. This does not prove the displayed definition is linguistically false.',
        'cases': judged,
    })
    print(json.dumps({'definitions': len(packet), 'development_pairs': len(judged), 'decisions': dict(counts),
                      'strict_acceptance': counts['acceptable']/len(judged), 'family_interval': [rates[49], rates[1949]]}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'summarize'])
    action = parser.parse_args().action
    prepare_packet() if action == 'prepare' else summarize()

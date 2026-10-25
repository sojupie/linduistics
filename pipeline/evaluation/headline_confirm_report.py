"""Decode H1 only after both source-guided reviews are recorded."""
from collections import Counter, defaultdict
from pathlib import Path
import argparse
from e0 import digest, save_json
from verification import estimate, read


def report(directory):
    sample = read(directory / 'sample.json')
    packet = read(directory / 'packet.json')
    observations = {}
    for panel in ('reserved', 'broad'):
        review = read(directory / f'{panel}_observations.json')
        assert review['packet_sha256'] == digest(directory / 'packet.json')
        assert len(review['cases']) == 100
        observations.update({r['id']: r for r in review['cases']})
    assert set(observations) == {c['id'] for c in packet}
    mapping = read(directory / 'private_arm_map.json')
    packets = {c['id']: c for c in packet}
    results = {}
    decoded = []
    for panel, dimension, good in [('reserved', 'concept_fit', 'acceptable'), ('broad', 'headline', 'supported')]:
        counts = {v: Counter() for v in ('control', 'F')}
        values = {v: defaultdict(list) for v in ('control', 'F', 'difference')}
        transitions = Counter()
        changed = 0
        alignment = {v: Counter() for v in ('control', 'F')}
        entries = {v: Counter() for v in ('control', 'F')}
        bounds = {v: defaultdict(list) for v in ('control', 'F')}
        by_pair = defaultdict(lambda: {v: Counter() for v in ('control', 'F')})
        membership_errors = []
        for case in (c for c in sample['cases'] if c['panel'] == panel):
            obs = observations[case['id']]
            p = packets[case['id']]
            verdicts = {}
            if p.get('missing'):
                verdicts = {'control': 'missing', 'F': 'missing'}
            else:
                assert set(obs['arms']) == {'A', 'B'}
                for arm, version in mapping[case['id']].items():
                    assert obs['arms'][arm]['display'] == p['arms'][arm]
                    verdicts[version] = obs['arms'][arm][dimension]
                    for side, gloss in enumerate(p['arms'][arm]):
                        if gloss not in {x['gloss'] for x in p['senses'][side]}:
                            membership_errors.append([case['id'], version, side, gloss])
                    if panel == 'broad':
                        alignment[version][obs['arms'][arm]['selected_meaning']] += 1
                        entries[version][obs['arms'][arm]['entry_correctness']] += 1
                changed += p['arms']['A'] != p['arms']['B']
            ys = {v: int(verdicts[v] == good) for v in ('control', 'F')}
            for v in ys:
                counts[v][verdicts[v]] += 1
                by_pair[case['stratum']][v][verdicts[v]] += 1
                bounds[v][case['stratum']].append(int(verdicts[v] in (good, 'unresolved')))
                values[v][case['stratum']].append(ys[v])
            values['difference'][case['stratum']].append(ys['F'] - ys['control'])
            transitions['gain' if ys['F'] > ys['control'] else 'loss' if ys['F'] < ys['control'] else 'same'] += 1
            decoded.append({'id': case['id'], 'panel': panel, 'verdicts': verdicts,
                            'observation': obs['observation'], 'versions': mapping.get(case['id'])})
        results[panel] = {'per_pair': {p: {v: dict(c) for v,c in vs.items()} for p,vs in by_pair.items()},
                          'selected_alignment': {v: dict(c) for v,c in alignment.items()},
                          'entry_correctness': {v: dict(c) for v,c in entries.items()},
                          'source_gloss_membership_errors': membership_errors,
                          'unresolved_upper_bounds': {v: estimate(val, sample['strata'][panel]) for v,val in bounds.items()},'counts': {v: dict(c) for v, c in counts.items()}, 'transitions': dict(transitions),
                          'changed_displays': changed,
                          'weighted': {v: estimate(val, sample['strata'][panel]) for v, val in values.items()}}
    results['retrieval'] = dict(Counter(c['status'] for c in read(directory / 'retrieval.json')))
    results['second_review'] = sample['second_review_status']
    results['review_hashes'] = {p: digest(directory / f'{p}_observations.json') for p in ('reserved', 'broad')}
    save_json(directory / 'decoded_reviews.json', decoded)
    save_json(directory / 'summary.json', results)
    return results


if __name__ == '__main__':
    import json
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    print(json.dumps(report(parser.parse_args().directory), indent=2))

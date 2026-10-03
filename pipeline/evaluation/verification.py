"""Freeze a stratified review sample and report explicit, weighted judgments.

Run from the repository root with -m pipeline.evaluation.verification.
This tool never queries or changes the database.
"""
import argparse
from collections import Counter, defaultdict
import json
import math
from pathlib import Path
import random
import statistics
import tempfile

from pipeline.evaluation.e0 import digest, save_json

DIMENSIONS = ('candidate', 'display', 'meaning', 'history', 'task')
STATUSES = ('supported', 'contradicted', 'unresolved', 'not_applicable')


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def checked_inputs(plan_path):
    plan = read(plan_path)
    for name in ('hypothesis', 'measures', 'tradeoffs', 'decision_rule', 'rubric'):
        require(bool(plan.get(name)), f'Missing plan field: {name}')
    paths = {}
    for name, item in plan['inputs'].items():
        path = (Path(plan_path).resolve().parent / item['path']).resolve()
        require(digest(path) == item['sha256'], f'Input changed: {name}')
        paths[name] = path
    require({'frame', 'families'} <= paths.keys(), 'Need frame and frozen family registry')
    require(plan.get('phase') in ('development', 'reserved'), 'Declare development or reserved phase')
    require(plan['phase'] != 'reserved' or 'frozen_method' in paths, 'Reserved review needs the frozen method manifest')
    return plan, paths


def select(frame, families, quotas, seed, role='development'):
    groups = defaultdict(list)
    seen = set()
    for row in frame:
        require(row['id'] not in seen, f'Duplicate case: {row["id"]}')
        seen.add(row['id'])
        require(families.get(row['family']) == role,
                f'Unknown or reserved family: {row["family"]}')
        require(bool(row['stratum']), 'Missing stratum')
        for version in ('control', 'variant'):
            require(set(row[version]['claims']) == set(DIMENSIONS), 'Need all five claim fields')
            require(bool(row[version]['evidence']), 'Missing review evidence')
        groups[row['stratum']].append(row)
    require(bool(groups) and set(groups) == set(quotas), 'Quotas must cover every stratum exactly')
    rng = random.Random(seed)
    selected, strata = [], {}
    for name, group in sorted(groups.items()):
        require(type(quotas[name]) is int and quotas[name] > 0, 'Quotas must be positive integers')
        n = min(quotas[name], len(group))
        strata[name] = {'N': len(group), 'n': n, 'probability': n / len(group), 'weight': len(group) / n}
        selected.extend(rng.sample(sorted(group, key=lambda row: row['id']), n))
    return selected, strata


def prepare(plan_path, directory):
    plan, paths = checked_inputs(plan_path)
    role = 'test' if plan['phase'] == 'reserved' else 'development'
    selected, strata = select(read(paths['frame']), read(paths['families']), plan['quotas'], plan['seed'], role)
    rng = random.Random(plan['seed'])
    packet, audit = [], []
    for row in selected:
        versions = ['control', 'variant']
        rng.shuffle(versions)
        packet.append({'id': row['id'], 'arms': dict(zip(('A', 'B'), (row[v] for v in versions)))})
        audit.append({'id': row['id'], 'family': row['family'], 'stratum': row['stratum'],
                      'versions': dict(zip(('A', 'B'), versions))})
    directory = Path(directory)
    directory.mkdir()  # Fail rather than overwrite an earlier run.
    save_json(directory / 'packet.json', packet)
    save_json(directory / 'evidence_packet.json', [
        {'id': row['id'], 'arms': {a: value['evidence'] for a, value in row['arms'].items()}}
        for row in packet])
    save_json(directory / 'audit.json', {
        'plan_path': str(Path(plan_path).resolve()), 'plan_sha256': digest(Path(plan_path)),
        'code_sha256': digest(Path(__file__)), 'packet_sha256': digest(directory / 'packet.json'),
        'strata': strata, 'cases': audit,
    })
    save_json(directory / 'review.json', {
        'packet_sha256': digest(directory / 'packet.json'),
        'facts_sha256': '',
        'reviewer': {'name': '', 'kind': '', 'date': ''},
        'judgments': [{'id': row['id'], 'arm': arm, 'dimension': dimension,
                       'status': '', 'reason': ''}
                      for row in packet for arm in ('A', 'B') for dimension in DIMENSIONS],
    })
    save_json(directory / 'facts.json', {
        'evidence_packet_sha256': digest(directory / 'evidence_packet.json'),
        'reviewer': {'name': '', 'kind': '', 'date': ''},
        'observations': [{'id': row['id'], 'arm': arm, 'observation': ''}
                         for row in packet for arm in ('A', 'B')],
    })


def estimate(values, strata):
    """Finite-population mean and SRS-without-replacement sampling error."""
    total = sum(s['N'] for s in strata.values())
    mean, variance, available = 0.0, 0.0, True
    for name, s in strata.items():
        y = values[name]
        require(len(y) == s['n'], f'Incomplete stratum: {name}')
        weight = s['N'] / total
        mean += weight * statistics.mean(y)
        if s['n'] < s['N']:
            if s['n'] < 2:
                available = False
            else:
                variance += weight ** 2 * (1 - s['n'] / s['N']) * statistics.variance(y) / s['n']
    return {'mean': mean, 'sampling_standard_error': math.sqrt(variance) if available else None}


def report(directory, review_path, output):
    directory = Path(directory)
    audit = read(directory / 'audit.json')
    require(digest(Path(audit['plan_path'])) == audit['plan_sha256'], 'Plan changed')
    checked_inputs(audit['plan_path'])
    require(digest(Path(__file__)) == audit['code_sha256'], 'Tool changed since sampling')
    packet = read(directory / 'packet.json')
    require(digest(directory / 'packet.json') == audit['packet_sha256'], 'Packet changed')
    review = read(review_path)
    require(review['packet_sha256'] == audit['packet_sha256'], 'Wrong review packet')
    require(all(review['reviewer'].get(k) for k in ('name', 'kind', 'date')), 'Identify reviewer and date')
    require(review['reviewer']['kind'] in ('agent', 'human', 'expert'), 'Unknown reviewer kind')
    facts = read(directory / 'facts.json')
    require(review['facts_sha256'] == digest(directory / 'facts.json'), 'Facts changed or were not recorded')
    require(facts['evidence_packet_sha256'] == digest(directory / 'evidence_packet.json'), 'Wrong evidence packet')
    require(read(directory / 'evidence_packet.json') == [
        {'id': row['id'], 'arms': {a: v['evidence'] for a, v in row['arms'].items()}} for row in packet],
        'Evidence packet changed')
    require(all(facts['reviewer'].get(k) for k in ('name', 'kind', 'date')), 'Identify facts reviewer')
    require(facts['reviewer']['kind'] in ('agent', 'human', 'expert'), 'Unknown facts reviewer kind')
    observations = {(r['id'], r['arm']): r['observation'].strip() for r in facts['observations']}
    require(len(observations) == len(facts['observations']) and all(observations.values()) and
            observations.keys() == {(r['id'], a) for r in packet for a in ('A', 'B')},
            'Missing or duplicate independent observations')
    expected = {(r['id'], a, d): r['arms'][a]['claims'][d]
                for r in packet for a in ('A', 'B') for d in DIMENSIONS}
    judgments = {}
    for judgment in review['judgments']:
        key = judgment['id'], judgment['arm'], judgment['dimension']
        require(key in expected and key not in judgments, f'Unexpected or duplicate judgment: {key}')
        status = judgment['status']
        require(status in STATUSES and judgment['reason'].strip(), f'Incomplete judgment: {key}')
        require((status == 'not_applicable') == (expected[key] is None),
                f'Not-applicable must mean no claim was made: {key}')
        judgments[key] = status
    require(judgments.keys() == expected.keys(), 'Missing judgments; finish or mark unresolved explicitly')
    # Validate the sample audit against its deterministic selection, not just its file contents.
    plan, paths = checked_inputs(audit['plan_path'])
    role = 'test' if plan['phase'] == 'reserved' else 'development'
    selected, strata = select(read(paths['frame']), read(paths['families']), plan['quotas'], plan['seed'], role)
    require(strata == audit['strata'], 'Sampling weights changed')
    rng = random.Random(plan['seed'])
    for source, case, masked in zip(selected, audit['cases'], packet, strict=True):
        versions = ['control', 'variant']
        rng.shuffle(versions)
        mapping = dict(zip(('A', 'B'), versions))
        require(case == {'id': source['id'], 'family': source['family'], 'stratum': source['stratum'],
                         'versions': mapping}, 'Sample audit changed')
        require(masked == {'id': source['id'], 'arms': {a: source[v] for a, v in mapping.items()}},
                'Packet differs from the selected input')
    result = {'plan_sha256': audit['plan_sha256'], 'packet_sha256': audit['packet_sha256'],
              'review_sha256': digest(Path(review_path)), 'reviewer': review['reviewer'],
              'facts_sha256': review['facts_sha256'], 'facts_reviewer': facts['reviewer'], 'phase': plan['phase'],
              'population': sum(s['N'] for s in strata.values()), 'sample': len(selected),
              'strata': strata, 'dimensions': {}}
    lines = ['# Verification review results', '',
             f'Reviewer: {review["reviewer"]["name"]} ({review["reviewer"]["kind"]}).', '',
             f'{len(selected)} sampled cases from {result["population"]} development cases.', '',
             'Rates use sampling weights. Each dimension is separate. No automatic adoption decision.', '',
             '| Dimension | Control supported | Variant supported | Change | Unresolved control / variant | No claim control / variant |',
             '| --- | ---: | ---: | ---: | ---: | ---: |']
    for dimension in DIMENSIONS:
        rates = {}
        for version in ('control', 'variant'):
            rates[version] = {}
            for status in STATUSES:
                values = defaultdict(list)
                for case in audit['cases']:
                    arm = next(a for a, v in case['versions'].items() if v == version)
                    values[case['stratum']].append(int(judgments[case['id'], arm, dimension] == status))
                rates[version][status] = estimate(values, strata)
        delta = defaultdict(list)
        lower, upper = defaultdict(list), defaultdict(list)
        for case in audit['cases']:
            statuses = {v: judgments[case['id'], a, dimension] for a, v in case['versions'].items()}
            c, v = statuses['control'], statuses['variant']
            delta[case['stratum']].append(int(v == 'supported') - int(c == 'supported'))
            lower[case['stratum']].append(int(v == 'supported') - int(c in ('supported', 'unresolved')))
            upper[case['stratum']].append(int(v in ('supported', 'unresolved')) - int(c == 'supported'))
        rates['paired_change'] = estimate(delta, strata)
        rates['unresolved_change_bounds'] = [estimate(lower, strata)['mean'], estimate(upper, strata)['mean']]
        result['dimensions'][dimension] = rates
        pct = lambda version, status: f'{rates[version][status]["mean"]:.1%}'
        lines.append(f'| {dimension} | {pct("control", "supported")} | {pct("variant", "supported")} | '
                     f'{rates["paired_change"]["mean"]:+.1%} | {pct("control", "unresolved")} / {pct("variant", "unresolved")} | '
                     f'{pct("control", "not_applicable")} / {pct("variant", "not_applicable")} |')
    lines += ['', '## Paired changes and uncertainty', '',
              '| Dimension | Change | Sampling standard error | Bounds if unresolved claims prove correct or wrong |',
              '| --- | ---: | ---: | ---: |']
    for dimension, rates in result['dimensions'].items():
        se = rates['paired_change']['sampling_standard_error']
        low, high = rates['unresolved_change_bounds']
        lines.append(f'| {dimension} | {rates["paired_change"]["mean"]:+.1%} | '
                     f'{f"{se:.1%}" if se is not None else "not estimable"} | {low:+.1%} to {high:+.1%} |')
    lines += ['', '## Strata (keep language pairs and changes visible)', '',
              '| Stratum | Population | Sample | Weight |', '| --- | ---: | ---: | ---: |']
    for name, s in strata.items():
        lines.append(f'| {name} | {s["N"]} | {s["n"]} | {s["weight"]:.2f} |')
    result['by_stratum'] = {}
    for name, s in strata.items():
        result['by_stratum'][name] = {}
        lines += ['', f'### {name}', '', '| Dimension | Control supported / contradicted / unresolved / no claim | Variant supported / contradicted / unresolved / no claim |',
                  '| --- | --- | --- |']
        for dimension in DIMENSIONS:
            counts = {version: Counter(judgments[c['id'], a, dimension]
                                      for c in audit['cases'] if c['stratum'] == name
                                      for a, v in c['versions'].items() if v == version)
                      for version in ('control', 'variant')}
            result['by_stratum'][name][dimension] = counts
            show = lambda version: ' / '.join(str(counts[version][status]) for status in STATUSES)
            lines.append(f'| {dimension} | {show("control")} | {show("variant")} |')
    lines += ['', 'Supported shares use the entire frozen frame as denominator, including absent claims.',
              'A removed claim is not an incorrect claim. Inspect membership changes and eligibility separately.',
              'The JSON records sampling standard errors and bounds for unresolved judgments.',
              'Sampling error excludes reviewer error and is not proof of linguistic truth.', '',
              'Decision: pending the independent benchmark, changed-case review and task checks in the protocol.']
    output = Path(output)
    require(output.suffix == '.json', 'Use a .json output path; the readable .md is written alongside it')
    require(not output.exists() and not output.with_suffix('.md').exists(), 'Report output already exists')
    save_json(output, result)
    with output.with_suffix('.md').open('x', encoding='utf-8') as stream:
        stream.write('\n'.join(lines) + '\n')
    return result


def self_check():
    # Unequal allocation must not become an unweighted 50% accuracy claim.
    strata = {'large': {'N': 90, 'n': 2}, 'small': {'N': 10, 'n': 2}}
    assert estimate({'large': [1, 1], 'small': [0, 0]}, strata)['mean'] == .9
    assert estimate({'x': [1]}, {'x': {'N': 10, 'n': 1}})['sampling_standard_error'] is None
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        claims = dict.fromkeys(DIMENSIONS, 'A reviewable claim')
        claims['history'] = None
        frame = [{'id': str(i), 'family': 'f', 'stratum': 'en-de/changed',
                  'control': {'claims': claims, 'evidence': 'Dictionary source'},
                  'variant': {'claims': claims, 'evidence': 'Dictionary source'}} for i in range(4)]
        save_json(root / 'frame.json', frame)
        save_json(root / 'families.json', {'f': 'development'})
        plan = dict(phase='development', hypothesis='test', measures='five dimensions', tradeoffs='test',
                    decision_rule='review gains and losses', rubric='test', quotas={'en-de/changed': 2}, seed=42,
                    inputs={n: {'path': n + '.json', 'sha256': digest(root / (n + '.json'))}
                            for n in ('frame', 'families')})
        save_json(root / 'plan.json', plan)
        prepare(root / 'plan.json', root / 'run')
        review = read(root / 'run/review.json')
        review['reviewer'] = {'name': 'Synthetic check', 'kind': 'agent', 'date': 'test'}
        facts = read(root / 'run/facts.json')
        facts['reviewer'] = review['reviewer']
        for observation in facts['observations']:
            observation['observation'] = 'Synthetic independent observation'
        (root / 'run/facts.json').write_text(json.dumps(facts), encoding='utf-8')
        review['facts_sha256'] = digest(root / 'run/facts.json')
        audit = read(root / 'run/audit.json')
        mapping = {r['id']: r['versions'] for r in audit['cases']}
        for j in review['judgments']:
            status = 'supported' if mapping[j['id']][j['arm']] == 'variant' else 'contradicted'
            j.update(status='not_applicable' if j['dimension'] == 'history' else status, reason='Synthetic')
        save_json(root / 'finished.json', review)
        result = report(root / 'run', root / 'finished.json', root / 'result.json')
        assert result['dimensions']['display']['paired_change']['mean'] == 1
        assert result['dimensions']['history']['variant']['not_applicable']['mean'] == 1
        uncertain = next(j for j in review['judgments'] if j['dimension'] == 'display' and
                         mapping[j['id']][j['arm']] == 'variant')
        uncertain['status'] = 'unresolved'
        save_json(root / 'uncertain.json', review)
        result = report(root / 'run', root / 'uncertain.json', root / 'uncertain-result.json')
        assert result['dimensions']['display']['unresolved_change_bounds'] == [.5, 1]
        assert select(frame, {'f': 'development'}, plan['quotas'], 42) == select(frame[::-1], {'f': 'development'}, plan['quotas'], 42)
        for bad_families in ({'f': 'test'}, {}):
            try:
                select(frame, bad_families, plan['quotas'], 42)
            except ValueError:
                pass
            else:
                raise AssertionError('Reserved/unknown family admitted')
        try:
            report(root / 'run', root / 'finished.json', root / 'result.json')
        except ValueError:
            pass
        else:
            raise AssertionError('Existing result overwritten')
        review['judgments'][0]['status'] = ''
        save_json(root / 'incomplete.json', review)
        try:
            report(root / 'run', root / 'incomplete.json', root / 'bad.json')
        except ValueError:
            pass
        else:
            raise AssertionError('Unfinished review accepted')
    print('verification self-check passed')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    prepare_command = commands.add_parser('prepare')
    prepare_command.add_argument('plan', type=Path)
    prepare_command.add_argument('directory', type=Path)
    report_command = commands.add_parser('report')
    report_command.add_argument('directory', type=Path)
    report_command.add_argument('review', type=Path)
    report_command.add_argument('output', type=Path)
    commands.add_parser('self-check')
    args = parser.parse_args()
    if args.command == 'prepare':
        prepare(args.plan, args.directory)
    elif args.command == 'report':
        report(args.directory, args.review, args.output)
    else:
        self_check()


if __name__ == '__main__':
    main()

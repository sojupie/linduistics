"""Freeze independent new-language comparisons without reading predictions."""
import argparse
from collections import Counter, defaultdict
import hashlib
import itertools
import json
from pathlib import Path

from e0 import OUTPUT, REFERENCE, LANGUAGES, digest, normalized, read_csv, save_json


def inherited_role(roles):
    if len(roles) > 1:
        return 'diagnostic_bridge'
    return next(iter(roles)) if roles else 'test'


def prepare(destination):
    destination.mkdir(parents=True, exist_ok=False)
    old = json.loads((OUTPUT / 'e0_families_v2.json').read_text(encoding='utf-8'))
    tokens = {}
    for group, record in old['groups'].items():
        for token in record['members']:
            assert token not in tokens
            tokens[token] = group
    languages = {**LANGUAGES, '21': 'nl', '36': 'is'}
    concepts = {r['ID']: r for r in read_csv(REFERENCE / 'cldf_parameters.csv')}
    forms, experts = defaultdict(list), defaultdict(set)
    for r in read_csv(REFERENCE / 'cldf_forms.csv'):
        if r['Language_ID'] in languages and r['Form'].strip():
            forms[r['Parameter_ID']].append(r)
    for r in read_csv(REFERENCE / 'cldf_cognates.csv'):
        if r['Doubt'].lower() == 'false' and r['Cognate_Detection_Method'] == 'expert':
            experts[r['Form_ID']].add(r['Cognateset_ID'])
    # Link new forms to the existing family tokens before assigning any case.
    # ponytail: use source concept/expert/lex links; unknown historical links cannot prove separation.
    links = defaultdict(set)
    for concept, entries in forms.items():
        for f in entries:
            nodes = [f'concept:{concept}', f"lex:{languages[f['Language_ID']]}:{normalized(f['Form'])}"]
            nodes += [f'expert:{e}' for e in experts[f['ID']]]
            for node in nodes:
                links[node].update(nodes)
    components, visited = {}, set()
    for start in sorted(links):
        if start in visited:
            continue
        pending, nodes = [start], set()
        while pending:
            node = pending.pop()
            if node in visited:
                continue
            visited.add(node)
            nodes.add(node)
            pending.extend(links[node] - visited)
            if node in tokens:
                pending.extend(set(old['groups'][tokens[node]]['members']) - visited)
        groups = sorted({tokens[n] for n in nodes if n in tokens})
        roles = {old['groups'][g]['role'] for g in groups}
        identity = hashlib.sha256('\n'.join(sorted(nodes)).encode()).hexdigest()[:16]
        record = dict(family_group=identity, role=inherited_role(roles), inherited_groups=groups)
        for node in nodes:
            components[node] = record
    cases = []
    for concept, entries in sorted(forms.items()):
        for a, b in itertools.combinations(sorted(entries, key=lambda f: f['ID']), 2):
            la, lb = languages[a['Language_ID']], languages[b['Language_ID']]
            if la == lb or not {'nl', 'is'} & {la, lb}:
                continue
            if la > lb:
                a, b, la, lb = b, a, lb, la
            ea, eb = experts[a['ID']], experts[b['ID']]
            cases.append(dict(case_id=f"iecor:{a['ID']}:{b['ID']}", concept_id=concept,
                concept=concepts[concept]['Name'], expected_meaning=concepts[concept]['Concepticon_Definition'],
                lang_a=la, word_a=a['Form'], lang_b=lb, word_b=b['Form'],
                form_id_a=a['ID'], form_id_b=b['ID'], expert_sets_a=sorted(ea), expert_sets_b=sorted(eb),
                history_reference='same_expert_set' if ea & eb else 'different_expert_sets' if ea and eb else 'not_annotated',
                source_a=a['url'], source_b=b['url'], **components[f'concept:{concept}']))
    assert len({r['case_id'] for r in cases}) == len(cases)
    counts = Counter((r['lang_a'], r['lang_b'], r['role']) for r in cases)
    summary = {'case_count': len(cases), 'pair_roles': {':'.join(k): v for k, v in sorted(counts.items())},
               'families': len({r['family_group'] for r in cases})}
    save_json(destination / 'cases.json', cases)
    save_json(destination / 'summary.json', summary)
    save_json(destination / 'protocol.json', dict(plan_sha256=digest(OUTPUT / 'E5_ADMISSION_PLAN.md'),
        old_split_sha256=digest(OUTPUT / 'e0_families_v2.json'), code_sha256=digest(Path(__file__)),
        reference_hashes={n: digest(REFERENCE / n) for n in ['cldf_forms.csv', 'cldf_cognates.csv', 'cldf_parameters.csv']},
        prediction_inputs_read=False, source_of_new_links='IE-CoR concepts, expert sets, lexical identity',
        limits='Unrecorded historical links can remain unknown. Mixed inherited roles are diagnostic only.'))
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == '__main__':
    assert inherited_role({'development'}) == 'development'
    assert inherited_role({'test'}) == 'test'
    assert inherited_role({'development', 'test'}) == 'diagnostic_bridge'
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=OUTPUT / 'e5-panel001')
    prepare(parser.parse_args().output)

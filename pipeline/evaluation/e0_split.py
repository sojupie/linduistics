"""Freeze evaluation families before developing variants; never split reverse pairs."""
from collections import Counter, defaultdict
import hashlib
import json
import sys

import pyarrow.parquet as pq

from e0 import BASELINE, OUTPUT, ROOT, SEED, normalized, read_csv, save_json

sys.path.insert(0, str(ROOT))
from pipeline.src.sense_aligner import parse_root

# These concepts were inspected during E0 diagnosis and cannot be untouched tests.
INSPECTED = {'water', 'fire', 'hand', 'eye', 'father', 'house', 'tooth', 'name', 'blood', 'dog',
             'fear', 'vomit', 'yesterday', 'near', 'far', 'navel', 'swell', 'nose', 'smoke', 'hair'}


def main():
    concepts = read_csv(OUTPUT / 'e0_concept_cases.csv')
    open_cases = json.loads((OUTPUT / 'e0_blind_review.json').read_text(encoding='utf-8'))
    parent = {}

    def find(node):
        parent.setdefault(node, node)
        if parent[node] != node:
            parent[node] = find(parent[node])
        return parent[node]

    def union(a, b):
        a, b = find(a), find(b)
        if a != b:
            parent[max(a, b)] = min(a, b)

    def lexical(lang, word):
        return f'lex:{lang}:{normalized(word)}'

    needed = set()
    def link_evidence(word, senses, roots=()):
        for root in list(roots) + [s.get('etym_root') for s in senses]:
            parsed = parse_root(root)
            if parsed:
                union(word, 'root:' + ':'.join(parsed))
        for sense in senses:
            for claim in sense.get('source_claims', []):
                if claim.get('related_form') and claim.get('related_language'):
                    union(word, lexical(claim['related_language'], claim['related_form']))
    for case in concepts:
        node = 'concept:' + case['concept_id']
        for side in ['a', 'b']:
            word = lexical(case[f'lang_{side}'], case[f'word_{side}'])
            needed.add(word)
            union(node, word)
            for expert_set in case[f'expert_sets_{side}'].split('|'):
                if expert_set:
                    union(word, 'expert:' + expert_set)
    for case in open_cases:
        for side in ['a', 'b']:
            word = lexical(case[f'lang_{side}'], case[f'word_{side}'])
            needed.add(word)
            union('case:' + case['case_id'], word)
            link_evidence(word, case[f'senses_{side}'])
    # Conservative grouping, not a declaration that every recorded root is correct.
    # Include all source senses so homographs cannot leak through a selected sense.
    for lang in ['da', 'de', 'en', 'nb', 'sv']:
        for batch in pq.ParquetFile(BASELINE / f'lemmas_{lang}.parquet').iter_batches(columns=['word', 'etym_root', 'senses_json']):
            for row in batch.to_pylist():
                word = lexical(lang, row['word'])
                if word not in needed:
                    continue
                senses = json.loads(row['senses_json'] or '[]')
                link_evidence(word, senses, [row['etym_root']])
    components = defaultdict(list)
    for node in parent:
        components[find(node)].append(node)
    inspected_nodes = {'concept:' + c['concept_id'] for c in concepts if c['concept'] in INSPECTED}
    previous = json.loads((OUTPUT / 'e0_families.json').read_text(encoding='utf-8'))
    # Preserve the already reviewed development role. Newly discovered links may
    # retire test cases to development, never promote inspected cases to test.
    previous_development = {n for g in previous['groups'].values() if g['role'] == 'development' for n in g['members']}
    groups, assignments = {}, []
    for nodes in components.values():
        nodes.sort()
        group_id = hashlib.sha256('\n'.join(nodes).encode()).hexdigest()[:16]
        forced = bool(set(nodes) & (inspected_nodes | previous_development))
        role = 'development' if forced else 'test'
        groups[group_id] = {'role': role, 'forced_development': forced, 'members': nodes}
        for node in nodes:
            assignments.append((node, group_id))
    by_node = dict(assignments)
    cases = []
    for case in concepts:
        group_id = by_node['concept:' + case['concept_id']]
        cases.append({'case_id': case['case_id'], 'panel': 'concept', 'family_group': group_id, 'role': groups[group_id]['role']})
    for case in open_cases:
        group_id = by_node['case:' + case['case_id']]
        cases.append({'case_id': case['case_id'], 'panel': 'open', 'family_group': group_id, 'role': groups[group_id]['role']})
    assert len({c['case_id'] for c in cases}) == len(cases)
    assert all(len({c['role'] for c in cases if c['family_group'] == g}) == 1 for g in groups)
    previous_roles = {c['case_id']: c['role'] for c in previous['cases']}
    assert all(c['role'] == 'development' for c in cases if previous_roles[c['case_id']] == 'development')
    save_json(OUTPUT / 'e0_families_v2.json', {
        'seed': SEED, 'groups': groups, 'cases': cases,
        'grouping': 'Shared concept, expert set, lexical identity, recorded roots, and structured related-form claims; reverse pairs share identity.',
        'limits': 'Unrecorded or differently spelled family links may remain unknown; this is not proof of complete linguistic family separation.',
        'test_policy': 'Do not display test cases while tuning E1-E4. Record and retire any test group inspected during development.',
        'amendment': 'Include source claims from the published comparison evidence as well as lemma snapshots; preserve prior development assignments.',
        'retired_test_cases': [c['case_id'] for c in cases if previous_roles[c['case_id']] == 'test' and c['role'] == 'development'],
    })
    print(dict(Counter((c['panel'], c['role']) for c in cases)))
    print('family groups:', len(groups), 'largest component:', max(map(lambda g: len(g['members']), groups.values())))


if __name__ == '__main__':
    main()

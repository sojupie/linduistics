"""Experimental source-scoped historical paths; does not classify meanings."""
from collections import defaultdict, deque
import unicodedata

TRANSMISSION = {'inherited_from', 'borrowed_from'}
FORMATION = {'derived_from', 'compound_of', 'formed_from', 'confix_of', 'blend_of',
             'rooted_in', 'calque_of', 'partial_calque_of', 'semantic_loan_from'}


def form(language, word):
    # Preserve case: German noun and non-noun entries can be distinct.
    return language, unicodedata.normalize('NFC', word or '').strip().lstrip('*')


def record_form(record):
    return form(record['language_code'], record['word'])


def source_index(records):
    entries, forms = {}, defaultdict(set)
    for record in records:
        identity = record['source_entry_key']
        if identity in entries and entries[identity] != record:
            raise ValueError(f'Conflicting records for source entry {identity}')
        entries[identity] = record
        forms[record_form(record)].add(identity)
    return entries, forms


def paths(entry, entries, forms):
    """Return recorded paths, stopping at absent or ambiguous target entries."""
    queue = deque([(entry, [], frozenset({entry}))])
    found, stopped = [], []
    while queue:
        current, previous, visited = queue.popleft()
        record = entries[current]
        for index, claim in enumerate(record.get('claims', [])):
            if claim.get('relation') not in TRANSMISSION:
                continue
            if claim.get('source_uncertain'):
                stopped.append({'entry': current, 'claim_index': index, 'reason': 'source_uncertain'})
                continue
            target = form(claim.get('related_language'), claim.get('related_form'))
            if not all(target):
                stopped.append({'entry': current, 'claim_index': index, 'reason': 'missing_target'})
                continue
            step = {'source_entry_key': current, 'source_url': record.get('source_url'),
                    'claim_index': index, 'relation': claim['relation'], 'target_form': list(target),
                    'evidence': claim}
            chain = previous + [step]
            candidates = sorted(forms.get(target, set()))
            if len(candidates) > 1:
                stopped.append({'path': chain, 'reason': 'ambiguous_target_entries', 'candidates': candidates})
                continue
            if candidates and candidates[0] in visited:
                stopped.append({'path': chain, 'reason': 'cycle'})
                continue
            found.append({'target_form': list(target), 'target_entry_key': candidates[0] if candidates else None,
                          'path': chain, 'terminal_status': 'resolved' if candidates else 'recorded_form_only'})
            if not candidates:
                stopped.append({'path': chain, 'reason': 'unavailable_target_entry'})
            else:
                queue.append((candidates[0], chain, visited | {candidates[0]}))
    return found, stopped


def historical_relationships(entry_keys_a, entry_keys_b, entries, forms):
    relationships, excluded, unresolved = [], [], []
    for side, keys in enumerate([entry_keys_a, entry_keys_b]):
        for identity in keys:
            if identity not in entries:
                unresolved.append({'side': side, 'entry': identity, 'reason': 'source_entry_unavailable'})
    for a in entry_keys_a:
        for b in entry_keys_b:
            if a not in entries or b not in entries:
                continue
            paths_a, stops_a = paths(a, entries, forms)
            paths_b, stops_b = paths(b, entries, forms)
            unresolved.extend({'endpoint_entry': a, **r} for r in stops_a)
            unresolved.extend({'endpoint_entry': b, **r} for r in stops_b)
            for origin, counterpart, chains in [(a, b, paths_a), (b, a, paths_b)]:
                for chain in chains:
                    if chain['target_entry_key'] == counterpart:
                        kinds = {step['relation'] for step in chain['path']}
                        relationships.append({'kind': 'direct_or_chained_borrowing' if 'borrowed_from' in kinds
                                              else 'recorded_inheritance_to_counterpart',
                                              'entries': [a, b], 'source_entry': origin, 'path': chain})
                for index, claim in enumerate(entries[origin].get('claims', [])):
                    target = form(claim.get('related_language'), claim.get('related_form'))
                    if claim.get('source_uncertain'):
                        continue
                    if claim.get('relation') == 'cognate_mention' and target == record_form(entries[counterpart]):
                        # An explicit form mention still cannot choose among homographs.
                        if set(forms.get(target, set())) == {counterpart}:
                            relationships.append({'kind': 'explicit_cognate_statement', 'entries': [a, b],
                                'source_entry_key': origin, 'source_url': entries[origin].get('source_url'),
                                'claim_index': index, 'evidence': claim})
                        else:
                            unresolved.append({'entry': origin, 'claim_index': index, 'reason': 'ambiguous_cognate_target'})
                    elif claim.get('relation') in FORMATION:
                        excluded.append({'entries': [a, b], 'source_entry_key': origin, 'claim_index': index,
                                         'reason': 'formation_is_not_whole_word_inheritance', 'evidence': claim})
            for pa in paths_a:
                for pb in paths_b:
                    if pa['target_form'] != pb['target_form']:
                        continue
                    borrowing = ['borrowed_from' in {s['relation'] for s in path['path']} for path in [pa, pb]]
                    kind = ('shared_recorded_borrowing_source' if all(borrowing) else
                            'borrowing_and_inheritance_from_shared_source' if any(borrowing) else
                            'shared_recorded_inherited_ancestor')
                    relationships.append({'kind': kind, 'entries': [a, b],
                                          'paths': [pa, pb], 'ancestor_form': pa['target_form'],
                                          'identity_scope': 'entry' if pa['target_entry_key'] else 'recorded_form'})
    return {'relationships': relationships, 'excluded_formation_claims': excluded,
            'unresolved_paths': unresolved, 'scope': 'Source entry pairs; not a claim about every headword homograph.'}


def self_check():
    def record(key, lang, word, relation=None, target=None):
        return {'source_entry_key': key, 'language_code': lang, 'word': word,
                'source_url': 'source:' + key, 'claims': [] if not relation else
                [{'relation': relation, 'related_language': target[0], 'related_form': target[1]}]}

    a = record('a', 'en', 'word', 'inherited_from', ('old', 'ancestor'))
    b = record('b', 'de', 'Wort', 'inherited_from', ('old', 'ancestor'))
    entries, forms = source_index([a, b])
    result = historical_relationships(['a'], ['b'], entries, forms)
    assert result['relationships'][0]['kind'] == 'shared_recorded_inherited_ancestor'
    assert result['relationships'][0]['identity_scope'] == 'recorded_form'
    loan = record('b', 'de', 'Wort', 'borrowed_from', ('old', 'ancestor'))
    entries, forms = source_index([a, loan])
    assert historical_relationships(['a'], ['b'], entries, forms)['relationships'][0]['kind'] == 'borrowing_and_inheritance_from_shared_source'
    entries, forms = source_index([a | {'claims': [a['claims'][0] | {'relation': 'borrowed_from'}]}, loan])
    assert historical_relationships(['a'], ['b'], entries, forms)['relationships'][0]['kind'] == 'shared_recorded_borrowing_source'
    middle = record('m', 'middle', 'word', 'inherited_from', ('old', 'ancestor'))
    a_deep = record('a', 'en', 'word', 'inherited_from', ('middle', 'word'))
    entries, forms = source_index([a_deep, middle, b])
    assert historical_relationships(['a'], ['b'], entries, forms)['relationships']
    entries, forms = source_index([a_deep, middle, middle | {'source_entry_key': 'm2'}, b])
    assert not historical_relationships(['a'], ['b'], entries, forms)['relationships']
    derived = record('a', 'en', 'word', 'derived_from', ('old', 'ancestor'))
    entries, forms = source_index([derived, b])
    assert not historical_relationships(['a'], ['b'], entries, forms)['relationships']
    cycle = record('m', 'middle', 'word', 'inherited_from', ('en', 'word'))
    entries, forms = source_index([a_deep, cycle, b])
    assert any(r['reason'] == 'cycle' for r in historical_relationships(['a'], ['b'], entries, forms)['unresolved_paths'])
    entries, forms = source_index([a | {'claims': [a['claims'][0] | {'source_uncertain': True}]}, b])
    assert not historical_relationships(['a'], ['b'], entries, forms)['relationships']
    assert form('de', 'Gen') != form('de', 'gen')
    mention = record('a', 'en', 'word', 'cognate_mention', ('de', 'Wort'))
    entries, forms = source_index([mention, b])
    assert historical_relationships(['a'], ['b'], entries, forms)['relationships'][0]['kind'] == 'explicit_cognate_statement'
    entries, forms = source_index([mention, b, b | {'source_entry_key': 'b2'}])
    assert not historical_relationships(['a'], ['b'], entries, forms)['relationships']
    borrowing = record('a', 'en', 'word', 'borrowed_from', ('de', 'Wort'))
    entries, forms = source_index([borrowing, b])
    assert any(r['kind'] == 'direct_or_chained_borrowing'
               for r in historical_relationships(['a'], ['b'], entries, forms)['relationships'])
    print('Historical links self-check passed.')


if __name__ == '__main__':
    self_check()

"""Experimental, source-scoped meaning evidence; never a replacement cosine score."""
import json

from meaning_profile import is_name, is_redirect, modern, profile_meanings


def source_identity_matches(senses, identity):
    """An identity among merged candidates does not uniquely identify a sense."""
    result = []
    for index, sense in enumerate(senses):
        if (sense.get('source_entry_key'), sense.get('source_sense_id')) == identity:
            basis = 'exact_source_identity'
        elif any((c.get('source_entry_key'), c.get('source_sense_id')) == identity
                 for c in sense.get('source_identity_candidates') or []):
            basis = 'merged_source_identity_candidate'
        else:
            continue
        result.append({'index': index, 'basis': basis})
    return result


def describe_meaning_evidence(row, source_inventory, *, source_associations=None, matrix=None):
    """Return separate build-link, lexical and embedding evidence for a comparison.

    source_inventory maps (entry key, sense ID) to parsed source gloss records.
    Build links attest source-sense→target-word links, not target-sense identity.
    Existing scores, definitions and classifications are read, never changed.
    """
    senses = [json.loads(row['senses_' + side]) for side in 'ab']
    if matrix is None:
        matrix = row['matrix']
    refs = sorted({(ref.get('source_entry_key') or '', ref.get('source_sense_id') or '')
                   for ref in json.loads(row.get('translation_source_senses') or '[]')})
    sources = [source for identity in refs for source in source_inventory.get(identity, [])]
    profile = profile_meanings(*senses, matrix, row['word_a'], row['word_b'],
        evidence_mode=True, lang_a=row['lang_a'], lang_b=row['lang_b'], translation_evidence=sources,
        sense_scoped=True, source_associations=source_associations, scope_policy='audit')
    admitted = [e for e in profile['word_overlap_evidence'] if e['kind'] == 'source_sense_translation_link']
    links = []
    for identity in refs:
        source_records = source_inventory.get(identity, [])
        selected = [e for e in admitted if (e['source_entry_key'], e['source_sense_id']) == identity]
        rejected = [e for e in profile['rejected_dictionary_evidence']
                    if (e['source_entry_key'], e['source_sense_id']) == identity]
        if selected:
            status = 'current_translation_supported'
        elif not source_records:
            status = 'source_identity_unresolved'
        elif all(not modern(s) for s in source_records):
            status = 'historical_source_link'
        elif all(is_redirect(s) for s in source_records):
            status = 'source_heading_or_redirect'
        elif all(is_name(s) for s in source_records):
            status = 'name_or_entity_source_link'
        elif any(e.get('explicit_conflicts') for e in rejected):
            status = 'endpoint_usage_or_grammar_conflict'
        else:
            status = 'source_scope_unresolved'
        endpoint_identities = [source_identity_matches(side, identity) for side in senses]

        def describe_localization(evidence):
            matches = []
            for side, candidates in enumerate(evidence.get('endpoint_matches', [])):
                identities = {m['index']: m['basis'] for m in endpoint_identities[side]}
                matches.append([dict(candidate, basis=identities.get(candidate['index'], 'unresolved_source_identity')
                                     if candidate['basis'] == 'recorded_source_identity' else
                                     {'source_gloss_association': 'embedding_localization_candidate',
                                      'documented_lemma_link_unlocalized': 'unlocalized_compatible_grammar'}.get(candidate['basis'], candidate['basis']))
                                for candidate in candidates])
            return dict(evidence, endpoint_matches=matches)

        link = {'source_entry_key': identity[0], 'source_sense_id': identity[1],
                'route': 'direct_from_english' if 'en' in (row['lang_a'], row['lang_b']) else 'shared_english_sense',
                'provenance': 'inherited_build_translation_reference', 'raw_translation_rechecked': False,
                'independent_confirmation_count': 0, 'status': status,
                'source_meanings': [{'gloss': s['gloss'], 'pos': s.get('pos'), 'tags': s.get('tags') or [],
                                     'is_active': s.get('is_active', True)} for s in source_records],
                'source_endpoint_identities': endpoint_identities,
                'localization_candidates': [describe_localization(e) for e in selected],
                'conflicts': [describe_localization(e) for e in rejected],
                'target_sense_attested': False}
        links.append(link)
    lexical = [e for e in profile['word_overlap_evidence'] if e['kind'] != 'source_sense_translation_link']
    return {'schema_version': 1, 'words': [row[c] for c in ('lang_a', 'word_a', 'lang_b', 'word_b')],
            'dictionary_links': links, 'lexical_gloss_evidence': lexical,
            'embedding_sense_suggestions': profile['modern_pairs'],
            'current_dictionary_support': bool(admitted), 'current_lexical_support': bool(lexical),
            'existing_experimental_meaning_label': profile['label'],
            'scope': 'Evidence of possible shared meaning; not exhaustive equivalence, ordinary usage or ancestry.',
            'unchanged_display': [row['def_a'], row['def_b']]}


def self_check():
    source = dict(gloss='A container.', pos='noun', source_entry_key='en|vessel|noun|1',
                  source_sense_id='s1', is_active=True)
    target = dict(gloss='vessel', pos='noun', is_active=True)
    identity = source['source_entry_key'], source['source_sense_id']
    row = dict(lang_a='en', word_a='vessel', lang_b='de', word_b='Gefäß',
               def_a=source['gloss'], def_b=target['gloss'], senses_a=json.dumps([source]),
               senses_b=json.dumps([target]), matrix=[[0.1]],
               translation_source_senses=json.dumps([source, source]))
    result = describe_meaning_evidence(row, {identity: [source]})
    assert result['current_dictionary_support'] and not result['embedding_sense_suggestions']
    assert len(result['dictionary_links']) == 1 and not result['dictionary_links'][0]['target_sense_attested']
    assert result['existing_experimental_meaning_label'] == 'partial_overlap'
    assert not describe_meaning_evidence(row, {})['current_dictionary_support']
    merged = dict(target, source_identity_candidates=[source])
    assert source_identity_matches([merged], identity)[0]['basis'] == 'merged_source_identity_candidate'
    ambiguous = describe_meaning_evidence(dict(row, senses_a=json.dumps([merged])), {identity: [source]})
    matches = ambiguous['dictionary_links'][0]['localization_candidates'][0]['endpoint_matches'][0]
    assert matches[0]['basis'] == 'merged_source_identity_candidate'
    historical = dict(source, tags=['obsolete'], is_active=False)
    assert describe_meaning_evidence(row, {identity: [historical]})['dictionary_links'][0]['status'] == 'historical_source_link'
    wrong = dict(target, pos='verb')
    assert not describe_meaning_evidence(dict(row, senses_b=json.dumps([wrong])), {identity: [source]})['current_dictionary_support']
    mixed = dict(row, senses_b=json.dumps([dict(target, gloss='paint'), wrong]), matrix=[[0.1, 0.1]])
    conflict = describe_meaning_evidence(mixed, {identity: [source]})
    assert conflict['dictionary_links'][0]['status'] == 'endpoint_usage_or_grammar_conflict'
    assert not conflict['current_dictionary_support']
    assert row['matrix'] == [[0.1]] and row['def_a'] == 'A container.'
    print('Translation support self-check passed.')


if __name__ == '__main__':
    self_check()

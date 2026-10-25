"""Experimental display selection; never modifies scores or sense records."""
from collections import defaultdict

RESTRICTED_USAGE = {
    'slang', 'vulgar', 'offensive', 'rare', 'dialectal', 'regional',
    'poetic', 'literary', 'archaic', 'obsolete', 'dated',
}


def entry_ranks(senses):
    groups = defaultdict(dict)
    identities = []
    for sense in senses:
        entry = sense.get('source_entry_key')
        group = (entry, sense.get('pos'), sense.get('etymology_number'))
        identity = sense.get('source_sense_id')
        if not entry or not identity:
            identities.append(None)
            continue
        groups[group].setdefault(identity, len(groups[group]))
        identities.append((group, identity))
    return [0.0 if item is None else groups[item[0]][item[1]] / max(1, len(groups[item[0]]) - 1)
            for item in identities]


def eligible_pairs(senses_a, senses_b, lang_a, lang_b, translation_refs):
    indices = [[i for i, sense in enumerate(senses) if sense.get('is_active', True)]
               for senses in (senses_a, senses_b)]
    refs = {(r.get('source_entry_key'), r.get('source_sense_id'))
            for r in translation_refs if r.get('source_sense_id')}
    for side, (lang, senses) in enumerate(((lang_a, senses_a), (lang_b, senses_b))):
        if lang == 'en' and refs:
            anchored = [i for i in indices[side]
                        if (senses[i].get('source_entry_key'), senses[i].get('source_sense_id')) in refs
                        or any((c.get('source_entry_key'), c.get('source_sense_id')) in refs
                               for c in senses[i].get('source_identity_candidates', []))]
            if anchored:
                indices[side] = anchored
    return [(i, j) for i in indices[0] for j in indices[1]]


def select_display(senses_a, senses_b, matrix, eligible, variant):
    if variant not in {'A', 'B', 'C'}:
        raise ValueError(f'Unknown display variant: {variant}')
    if not eligible:
        return None
    highest = max(float(matrix[i][j]) for i, j in eligible)
    close = [(i, j) for i, j in eligible if float(matrix[i][j]) >= highest - 0.10]
    if variant == 'C':
        from meaning_profile import grammatical_class, is_name
        same_kind = [(i, j) for i, j in close if is_name(senses_a[i]) == is_name(senses_b[j])]
        close = same_kind or close
        same_class = [(i, j) for i, j in close if grammatical_class(senses_a[i])
                      and grammatical_class(senses_a[i]) == grammatical_class(senses_b[j])]
        close = same_class or close
    restrictions = [[bool(RESTRICTED_USAGE.intersection(s.get('tags') or [])) for s in senses]
                    for senses in (senses_a, senses_b)]
    minimum = min(int(restrictions[0][i]) + int(restrictions[1][j]) for i, j in close)
    close = [(i, j) for i, j in close
             if int(restrictions[0][i]) + int(restrictions[1][j]) == minimum]
    ranks_a, ranks_b = entry_ranks(senses_a), entry_ranks(senses_b)
    return max(close, key=lambda ij: float(matrix[ij[0]][ij[1]]) -
               (0.05 * (ranks_a[ij[0]] + ranks_b[ij[1]]) / 2 if variant in {'B', 'C'} else 0))


def self_check():
    ordinary = {'gloss': 'ordinary', 'source_entry_key': 'entry', 'source_sense_id': 'first'}
    slang = {'gloss': 'secondary', 'tags': ['slang'], 'source_entry_key': 'entry', 'source_sense_id': 'second'}
    assert select_display([ordinary, slang], [ordinary], [[0.85], [0.91]], [(0, 0), (1, 0)], 'A') == (0, 0)
    assert select_display([ordinary, slang], [ordinary], [[0.70], [0.91]], [(0, 0), (1, 0)], 'A') == (1, 0)
    assert select_display([ordinary, ordinary | {'source_sense_id': 'second'}], [ordinary],
                          [[0.85], [0.87]], [(0, 0), (1, 0)], 'B') == (0, 0)
    assert entry_ranks([ordinary, ordinary, slang, slang | {'source_entry_key': 'other'}]) == [0, 0, 1, 0]
    anchored = ordinary | {'is_active': True}
    assert eligible_pairs([anchored, slang], [ordinary], 'en', 'de', [anchored]) == [(0, 0)]
    ambiguous = ordinary | {'source_entry_key': None, 'source_sense_id': None,
                            'source_identity_candidates': [anchored]}
    assert eligible_pairs([ambiguous, slang], [ordinary], 'en', 'de', [anchored]) == [(0, 0)]
    assert eligible_pairs([ordinary | {'is_active': False}], [ordinary], 'en', 'de', []) == []
    assert select_display([ordinary], [ordinary], [[1]], [], 'A') is None
    historical = ordinary | {'tags': ['historical']}
    assert select_display([historical, ordinary], [ordinary], [[0.9], [0.85]], [(0, 0), (1, 0)], 'A') == (0, 0)
    noun = ordinary | {'pos': 'noun'}
    name = ordinary | {'pos': 'name', 'gloss': 'a female given name'}
    assert select_display([noun], [name, noun], [[0.90, 0.85]], [(0, 0), (0, 1)], 'C') == (0, 1)
    verb = ordinary | {'pos': 'verb'}
    assert select_display([noun], [verb, noun], [[0.90, 0.85]], [(0, 0), (0, 1)], 'C') == (0, 1)
    # Compatibility never reaches outside the fixed close-score window.
    assert select_display([noun], [verb, noun], [[0.90, 0.70]], [(0, 0), (0, 1)], 'C') == (0, 0)
    assert select_display([noun], [slang | {'pos': 'noun'}], [[0.9]], [(0, 0)], 'C') == (0, 0)
    print('Display selector self-check passed.')


if __name__ == '__main__':
    self_check()

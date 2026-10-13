"""Experimental meaning profiles; ancestry and source scores stay separate."""
from collections import defaultdict
import re

from parser import _META_GLOSS_PATTERN

INACTIVE_USAGE = {'obsolete', 'archaic', 'dated'}
GENERIC_NAME = re.compile(r'^(?:an?\s+)?(?:(?:male|female|unisex|patronymic)\s+)?(?:given name|surname)\b', re.I)
ENTITY_TYPES = {
    'country': r'\b(?:country|republic|kingdom)\b',
    'settlement': r'\b(?:city|town|village|municipality|capital)\b',
    'river': r'\briver\b',
    'deity': r'\b(?:god|goddess|deity|titan)\b',
    'planet': r'\bplanet\b',
    'region': r'\b(?:region|county|province|prefecture|island)\b',
    'person_name': r'\b(?:given name|surname)\b',
}


def grammatical_class(sense):
    pos = sense.get('pos', '')
    return 'determiner' if pos in {'det', 'article'} else pos


def is_name(sense):
    return (sense.get('pos') == 'name' or 'proper-noun' in (sense.get('tags') or [])
            or bool(re.search(r'\b(?:given name|surname)\b', sense['gloss'], re.I)))


def is_redirect(sense):
    return bool(_META_GLOSS_PATTERN.match(sense['gloss']) or
                'standard spelling of' in sense['gloss'].lower() or sense['gloss'].rstrip().endswith(':'))


def modern(sense):
    tags = set(sense.get('tags') or [])
    return not bool(tags & INACTIVE_USAGE) and (sense.get('is_active', True) or 'historical' in tags)


def weights(senses, usable):
    entries = defaultdict(dict)
    representatives = []
    for index in usable:
        sense = senses[index]
        entry = (sense.get('source_entry_key'), grammatical_class(sense), sense.get('etymology_number'))
        gloss = sense['gloss'].strip().casefold()
        if gloss in entries[entry]:
            continue
        rank = len(entries[entry])
        entries[entry][gloss] = index
        representatives.append((index, 1 / (1 + rank) if entry[0] else 1.0))
    return representatives


def entity_types(sense):
    return {kind for kind, pattern in ENTITY_TYPES.items() if re.search(pattern, sense['gloss'], re.I)}


def name_variant(senses_a, senses_b, word_a, word_b):
    for senses, other, counterpart in [(senses_a, senses_b, word_b), (senses_b, senses_a, word_a)]:
        other_text = ' '.join(s.get('etym_text') or '' for s in other)
        for sense in senses:
            text = sense.get('etym_text') or ''
            for match in re.finditer(r'\b(?:variant(?: spelling)?|spelling variant|(?:feminine|masculine|alternative) form)\s+of\s+(?:[A-Z][a-z]+\s+)?([\wÀ-ž]+)', text):
                parent = match[1]
                if parent.casefold() == counterpart.casefold() or re.search(r'\b' + re.escape(parent) + r'\b', other_text, re.I):
                    return {'source_entry_key': sense.get('source_entry_key'), 'parent_form': parent, 'statement': match[0]}
    return None


def lexical_alternatives(sense):
    if is_redirect(sense) or GENERIC_NAME.match(sense['gloss']):
        return set(), ''
    main, separator, context = sense['gloss'].partition('(')
    terms = set()
    for term in re.split(r'[;,]|\s+or\s+', main):
        term = re.sub(r'^(?:to|a|an|the)\s+', '', term.strip(), flags=re.I)
        term = term.strip(' .:!\"“”').casefold()
        if term and len(term.split()) <= 3:
            terms.add(term)
    return terms, context.rstrip(') .').casefold() if separator else ''


def word_overlap(senses_a, senses_b, word_a, word_b, lang_a, lang_b, translation_evidence):
    ordinary = [[s for s in senses if modern(s) and not is_name(s) and not is_redirect(s)]
                for senses in [senses_a, senses_b]]
    evidence = []
    common_classes = {grammatical_class(s) for s in ordinary[0]} & {grammatical_class(s) for s in ordinary[1]}
    for source in translation_evidence:
        entry = source.get('source_entry_key', '').split('|')
        if len(entry) < 2 or entry[0] != 'en' or not modern(source) or is_name(source) or is_redirect(source):
            continue
        if any(lang == 'en' and entry[1].casefold() != word.casefold()
               for lang, word in [(lang_a, word_a), (lang_b, word_b)]):
            continue
        if grammatical_class(source) in common_classes:
            evidence.append({'kind': 'source_sense_translation_link', 'scope': 'lexeme_class',
                'source_entry_key': source['source_entry_key'], 'source_sense_id': source['source_sense_id'],
                'gloss': source['gloss'], 'pos': source.get('pos')})
    for side, (lang, word) in enumerate([(lang_a, word_a), (lang_b, word_b)]):
        if lang != 'en':
            continue
        for sense in ordinary[1 - side]:
            terms, context = lexical_alternatives(sense)
            if word.casefold() in terms and grammatical_class(sense) in common_classes:
                evidence.append({'kind': 'explicit_english_headword_gloss', 'scope': 'lexeme_class',
                    'english_word': word, 'gloss': sense['gloss'], 'qualification': context, 'pos': sense.get('pos')})
    for a in ordinary[0]:
        for b in ordinary[1]:
            terms_a, context_a = lexical_alternatives(a)
            terms_b, context_b = lexical_alternatives(b)
            shared = terms_a & terms_b
            if (shared and grammatical_class(a) == grammatical_class(b)
                    and not (context_a and context_b and context_a != context_b)):
                evidence.append({'kind': 'shared_translated_lexical_alternative', 'scope': 'lexeme_class',
                    'terms': sorted(shared), 'glosses': [a['gloss'], b['gloss']],
                    'qualifications': [context_a, context_b], 'pos': a.get('pos')})
    return evidence


def profile_meanings(senses_a, senses_b, matrix, word_a, word_b, *, evidence_mode=False,
                     lang_a='', lang_b='', translation_evidence=None):
    assert len(matrix) == len(senses_a) and all(len(row) == len(senses_b) for row in matrix)
    usable = [[i for i, sense in enumerate(senses) if modern(sense) and not is_redirect(sense)]
              for senses in [senses_a, senses_b]]
    pairs, associated, historical, rejected = [], [], [], []
    for i, a in enumerate(senses_a):
        for j, b in enumerate(senses_b):
            score = float(matrix[i][j])
            if is_redirect(a) or is_redirect(b):
                if score >= 0.75:
                    rejected.append({'indices': [i, j], 'reason': 'redirect_or_heading'})
                continue
            names = (is_name(a), is_name(b))
            if any(names):
                if score >= 0.75:
                    rejected.append({'indices': [i, j], 'reason': 'name_identity_requires_specific_evidence'})
                continue
            if not modern(a) or not modern(b):
                if score >= 0.75 and grammatical_class(a) == grammatical_class(b):
                    historical.append([i, j])
                continue
            compatible = grammatical_class(a) == grammatical_class(b)
            if score >= 0.75 and compatible:
                pairs.append([i, j])
            elif score >= 0.60:
                associated.append({'indices': [i, j], 'kind': 'related_meanings' if compatible else 'related_form', 'score': score})
    ordinary = [[i for i in side if not is_name(senses[i])]
                for side, senses in zip(usable, [senses_a, senses_b])]
    coverage = []
    for side, (senses, indices) in enumerate(zip([senses_a, senses_b], ordinary)):
        weighted = weights(senses, indices)
        matched = {p[side] for p in pairs}
        coverage.append(sum(w for i, w in weighted if i in matched) / sum(w for _, w in weighted) if weighted else 0.0)
    entity_pairs = []
    if word_a.casefold() == word_b.casefold():
        for i in usable[0]:
            for j in usable[1]:
                a, b = senses_a[i], senses_b[j]
                types = (entity_types(a) & entity_types(b)) - {'person_name'}
                if is_name(a) and is_name(b) and types and matrix[i][j] >= 0.75:
                    entity_pairs.append({'indices': [i, j], 'types': sorted(types)})
                elif evidence_mode and is_name(a) and is_name(b):
                    terms_a, context_a = lexical_alternatives(a)
                    terms_b, context_b = lexical_alternatives(b)
                    concrete = (entity_types(a) | entity_types(b)) - {'person_name'}
                    if (terms_a & terms_b and concrete
                            and not (context_a and context_b and context_a != context_b)):
                        entity_pairs.append({'indices': [i, j], 'types': sorted(concrete),
                            'basis': 'Inferred shared lexical alias and concrete entity context',
                            'shared_aliases': sorted(terms_a & terms_b)})
    variant = name_variant([senses_a[i] for i in usable[0] if is_name(senses_a[i])],
                           [senses_b[i] for i in usable[1] if is_name(senses_b[i])], word_a, word_b)
    lexical = word_overlap(senses_a, senses_b, word_a, word_b, lang_a, lang_b,
                           translation_evidence or []) if evidence_mode else []
    if pairs:
        label = 'equivalent' if min(coverage) >= 0.80 else 'partial_overlap'
    elif entity_pairs:
        label = 'entity_overlap'
    elif variant:
        label = 'related_name_form'
    elif lexical:
        label = 'partial_overlap'
    elif all(any(is_name(senses[i]) for i in indices) for senses, indices in zip([senses_a, senses_b], usable)):
        named = [[senses[i] for i in indices if is_name(senses[i])]
                 for senses, indices in zip([senses_a, senses_b], usable)]
        generic = any(GENERIC_NAME.match(s['gloss']) for side in named for s in side)
        label = 'unverified_name_identity' if generic else 'different_entities'
    elif not all(usable):
        label = 'historical_overlap' if historical else 'no_modern_sense_data'
    elif associated:
        label = max(associated, key=lambda r: r['score'])['kind']
    elif historical:
        label = 'historical_overlap'
    else:
        label = 'different_meanings'
    return {'label': label, 'directional_coverage': coverage, 'modern_pairs': pairs,
            'related_candidates': associated, 'inactive_pairs': historical,
            'entity_pairs': entity_pairs, 'name_variant_evidence': variant,
            'word_overlap_evidence': lexical,
            'rejected_pair_evidence': rejected, 'usable_modern_senses': [len(s) for s in usable],
            'basis': 'Inferred from recorded meanings and grammatical context; not ancestry proof.'}


def self_check():
    a = {'gloss': 'ordinary action', 'pos': 'verb', 'is_active': True}
    assert profile_meanings([a], [a], [[0.9]], 'a', 'b')['label'] == 'equivalent'
    assert profile_meanings([a], [a | {'pos': 'noun'}], [[0.9]], 'a', 'b')['label'] == 'related_form'
    name = {'gloss': 'a surname.', 'pos': 'name', 'is_active': True}
    assert profile_meanings([name], [name], [[1]], 'Brown', 'Green')['label'] == 'unverified_name_identity'
    assert profile_meanings([name, a], [name, a], [[1, 0], [0, 0.9]], 'Brown', 'Green')['label'] == 'equivalent'
    retired = a | {'tags': ['obsolete'], 'is_active': False}
    assert profile_meanings([retired], [a], [[0.9]], 'a', 'b')['label'] == 'historical_overlap'
    historical_subject = a | {'tags': ['historical'], 'is_active': False}
    assert profile_meanings([historical_subject], [a], [[0.9]], 'a', 'b')['label'] == 'equivalent'
    country = name | {'gloss': 'A country in Southern Africa.'}
    assert profile_meanings([country], [country], [[0.9]], 'Lesotho', 'Lesotho')['label'] == 'entity_overlap'
    assert profile_meanings([country], [country], [[0.9]], 'A', 'B')['label'] != 'entity_overlap'
    redirect = a | {'gloss': 'Switzerland and Liechtenstein standard spelling of word'}
    assert profile_meanings([redirect], [a], [[0.9]], 'a', 'b')['label'] == 'no_modern_sense_data'
    heading = a | {'gloss': 'A person:'}
    assert profile_meanings([heading], [a], [[0.9]], 'a', 'b')['label'] == 'no_modern_sense_data'
    translated = a | {'gloss': 'to sow'}
    english = a | {'gloss': 'To scatter or plant seeds.'}
    assert profile_meanings([translated], [english], [[0.25]], 'säen', 'sow',
                            evidence_mode=True, lang_a='de', lang_b='en')['label'] == 'partial_overlap'
    assert profile_meanings([translated | {'pos': 'noun'}], [english], [[0.25]], 'säen', 'sow',
                            evidence_mode=True, lang_a='de', lang_b='en')['label'] != 'partial_overlap'
    assert not word_overlap([a | {'gloss': 'nut (instrument bridge)'}],
                            [a | {'gloss': 'nut (fastener)'}], 'a', 'b', 'de', 'sv', [])
    source = english | {'source_entry_key': 'en|sow|verb|2', 'source_sense_id': 'sowing'}
    assert word_overlap([translated], [english], 'säen', 'sow', 'de', 'en', [source])
    assert not word_overlap([a], [english], 'säen', 'plant', 'de', 'en', [source])
    assert not word_overlap([name], [name], 'Brown', 'Green', 'de', 'en', [source])
    print('Meaning profile self-check passed.')


if __name__ == '__main__':
    self_check()

"""Frozen candidate-channel experiment. Local artifacts only; no database writes."""
import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import random
import sys
import time

import orjson
import pyarrow.parquet as pq
from rapidfuzz import process
from rapidfuzz.distance import Levenshtein

from e0 import BASELINE, DATASET, OUTPUT, ROOT, SEED, digest, key, read_csv, save_json

sys.path.insert(0, str(ROOT / 'pipeline/src'))
from linguistic_metrics import normalize_orthography
from ipa_normalizer import normalize_ipa, phonetic_similarity


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def verified_inputs():
    hashes = load(OUTPUT / 'e0_input_manifest.json')['baseline_and_lookup_hashes']
    for name, expected in hashes.items():
        assert digest(ROOT / name) == expected, name
    return hashes


def channel(row):
    if json.loads(row['translation_source_senses'] or '[]'):
        return 'translation'
    a, b = row['word_a'], row['word_b']
    if a.lower() == b.lower():
        return 'exact'
    assert 3 <= len(a) <= 10 and len(b) >= 3 and abs(len(a) - len(b)) <= 2
    assert normalize_orthography(a)[:3] == normalize_orthography(b)[:3]
    assert row['orthographic_sim'] >= .70
    return 'prefix'


def baseline_channels():
    channels = defaultdict(set)
    counts = defaultdict(Counter)
    columns = ['lang_a', 'word_a', 'lang_b', 'word_b', 'translation_source_senses', 'orthographic_sim']
    for batch in pq.ParquetFile(DATASET).iter_batches(columns=columns):
        for row in batch.to_pylist():
            if row['lang_a'] >= row['lang_b']:
                continue
            selected = channel(row)
            channels[key(row['lang_a'], row['word_a'], row['lang_b'], row['word_b'])].add(selected)
            counts[f"{row['lang_a']}-{row['lang_b']}"][selected] += 1
    assert sum(sum(c.values()) for c in counts.values()) == 819227
    return channels, dict(counts)


def development():
    roles = {(r['panel'], r['case_id']): r for r in load(OUTPUT / 'e0_families_v2.json')['cases']}
    return [{**r, **roles['concept', r['case_id']]} for r in read_csv(OUTPUT / 'e0_concept_results.csv')
            if roles['concept', r['case_id']]['role'] == 'development']


def recall(cases, arms):
    result = {}
    for name, subset in [('all', cases)] + [(p, [r for r in cases if r['pair'] == p])
                                            for p in sorted({r['pair'] for r in cases})]:
        result[name] = {'cases': len(subset), **{arm: sum(r[arm] for r in subset) for arm in arms}}
    return result


def prefix_removal(destination):
    started = time.perf_counter()
    destination.mkdir(exist_ok=False, parents=True)
    hashes = verified_inputs()
    channels, counts = baseline_channels()
    concept = []
    for case in development():
        origin = channels.get(key(case['lang_a'], case['word_a'], case['lang_b'], case['word_b']), set())
        assert bool(origin) == (case['coverage_status'] == 'found')
        concept.append({**case, 'pair': f"{case['lang_a']}-{case['lang_b']}",
                        'channels': sorted(origin), 'control': bool(origin),
                        'A': bool(origin - {'prefix'})})
    reference = {r['case_id']: r for r in load(OUTPUT / 'e2_reference.json')['cases']}
    fixed = {key(r['lang_a'], r['word_a'], r['lang_b'], r['word_b']): r
             for r in load(OUTPUT / 'e1-run003/comparisons.json')}
    from e2 import CONTROL_LABELS
    form_predictions = {r['case_id']: r for r in load(OUTPUT / 'e0_sample_predictions.json')}
    opened = []
    for case in load(OUTPUT / 'e1-run003/case_displays.json'):
        if case['panel'] != 'open':
            continue
        row = fixed[key(case['lang_a'], case['word_a'], case['lang_b'], case['word_b'])]
        label = CONTROL_LABELS[row['category']]
        ref = reference[case['case_id']]
        selected = channel({**row, 'orthographic_sim': form_predictions[case['case_id']]['orthographic_sim']})
        opened.append({**{k: v for k, v in case.items() if k != 'displays'},
                       'pair': f"{row['lang_a']}-{row['lang_b']}", 'channel': selected,
                       'retained_A': selected != 'prefix', 'label': label,
                       'compatible': label in ref['compatible_labels'] if ref['scorable'] else None,
                       'reference': ref})
    scorable = [r for r in opened if r['compatible'] is not None]
    assert len(opened) == 207 and len(scorable) == 197
    def usefulness(rows):
        retained = [r for r in rows if r['retained_A']]
        return {'control_correct': sum(r['compatible'] for r in rows), 'control_count': len(rows),
                'A_correct': sum(r['compatible'] for r in retained), 'A_count': len(retained),
                'difference_points': 100 * (sum(r['compatible'] for r in retained) / len(retained)
                                             - sum(r['compatible'] for r in rows) / len(rows))}
    metrics = usefulness(scorable)
    families = defaultdict(list)
    for row in scorable:
        families[row['family_group']].append(row)
    rng = random.Random(SEED)
    intervals = sorted(usefulness([r for group in rng.choices(list(families.values()), k=len(families))
                                   for r in group])['difference_points'] for _ in range(2000))
    metrics['paired_family_95_interval'] = [intervals[49], intervals[1949]]
    metrics['by_pair'] = {p: usefulness([r for r in scorable if r['pair'] == p])
                          for p in sorted({r['pair'] for r in scorable})}
    metrics['recall'] = recall(concept, ['control', 'A'])
    metrics['channels'] = counts
    metrics['removed_open_cases'] = [r['case_id'] for r in opened if not r['retained_A']]
    metrics['removed_compatible_open_cases'] = [r['case_id'] for r in opened
                                               if not r['retained_A'] and r['compatible']]
    metrics['elapsed_seconds'] = time.perf_counter() - started
    save_json(destination / 'protocol.json', {'experiment': 'E4-A', 'plan_sha256': digest(OUTPUT / 'E4_PLAN.md'),
        'inputs': hashes, 'code_sha256': digest(Path(__file__)), 'seed': SEED,
        'reference_sha256': digest(OUTPUT / 'e2_reference.json'),
        'scope': 'All development concepts and the 207 frozen open cases; no reserved reviews.'})
    save_json(destination / 'concept_results.json', concept)
    save_json(destination / 'open_results.json', opened)
    save_json(destination / 'metrics.json', metrics)
    print(json.dumps(metrics, ensure_ascii=False, indent=2))


def lemma_metadata():
    return {lang: {r['word']: {**r, 'ipa': normalize_ipa(r['ipa'])}
                   for r in pq.read_table(BASELINE / f'lemmas_{lang}.parquet',
                                          columns=['word', 'ipa', 'pos']).to_pylist()}
            for lang in ['da', 'de', 'en', 'nb', 'sv']}


def pronunciation_audit(destination):
    """Distinguish recorded IPA from the existing generated fallback, without rerunning G2P."""
    from parser import parse_kaikki_entry
    destination.mkdir(exist_ok=False, parents=True)
    lexicons = lemma_metadata()
    source_manifest = load(BASELINE / 'etymology_records.jsonl.manifest.json')['languages']
    attested, counts, inputs = {}, {}, {}
    started = time.perf_counter()
    for lang, lexicon in lexicons.items():
        path = ROOT / 'pipeline/data' / source_manifest[lang]['source_file']
        expected = source_manifest[lang]['source_file_sha256']
        assert digest(path) == expected, path
        inputs[str(path.relative_to(ROOT))] = expected
        found = set()
        with path.open('rb') as stream:
            for line in stream:
                raw = orjson.loads(line)
                if not any(isinstance(s, dict) and s.get('ipa') for s in raw.get('sounds') or []):
                    continue
                entry = parse_kaikki_entry(raw, lang)
                if entry and entry['word'] in lexicon and entry['ipa']:
                    if entry['ipa'] == lexicon[entry['word']]['ipa']:
                        found.add(entry['word'])
        attested[lang] = sorted(found)
        counts[lang] = {'lemmas': len(lexicon), 'source_attested_stored_ipa': len(found),
                        'nonempty_stored_ipa': sum(bool(r['ipa']) for r in lexicon.values())}
        print(lang, counts[lang], flush=True)
    save_json(destination / 'attested_words.json', attested)
    save_json(destination / 'protocol.json', {'source_hashes': inputs,
        'lookup_hashes': verified_inputs(), 'parser_sha256': digest(ROOT / 'pipeline/src/parser.py'),
        'code_sha256': digest(Path(__file__)), 'scope': 'Matching IPA on an accepted headword source entry; not a sense-specific pronunciation guarantee.'})
    save_json(destination / 'metrics.json', {'counts': counts, 'elapsed_seconds': time.perf_counter() - started})


def lookup(lexicon, word):
    if word in lexicon:
        return lexicon[word]
    # IE-CoR and E0 use NFC/casefold matching. Preserve exact source capitalization in results.
    matches = [r for w, r in lexicon.items() if w.casefold() == word.casefold()]
    return matches[0] if len(matches) == 1 else None


def learn(training):
    observations = defaultdict(Counter)
    family_support = defaultdict(set)
    seen = set()
    for row in training:
        identity = (row['lang_a'], row['word_a'], row['lang_b'], row['word_b'])
        if identity in seen:
            continue
        seen.add(identity)
        a, b = row['ipa_a'], row['ipa_b']
        for block in Levenshtein.opcodes(a, b):
            if block.tag not in {'equal', 'replace'}:
                continue
            for x, y in zip(a[block.src_start:block.src_end], b[block.dest_start:block.dest_end]):
                for la, lb, source, target in [(row['lang_a'], row['lang_b'], x, y),
                                               (row['lang_b'], row['lang_a'], y, x)]:
                    observations[la, lb, source][target] += 1
                    family_support[la, lb, source, target].add(row['family_group'])
    mappings = defaultdict(dict)
    records = []
    for (la, lb, symbol), counts in sorted(observations.items()):
        target, count = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[0]
        support = sorted(family_support[la, lb, symbol, target])
        accepted = target != symbol and len(support) >= 3 and count / sum(counts.values()) >= .5
        if accepted:
            mappings[la, lb][symbol] = target
        records.append({'source_language': la, 'target_language': lb, 'symbol': symbol,
                        'counts': dict(counts), 'chosen': target, 'families': support, 'accepted': accepted})
    return mappings, records


def retrieve(ipa, target, mapping, source_word):
    if not ipa:
        return []
    mapped = ''.join(mapping.get(ch, ch) for ch in ipa)
    pronunciation_words, strings = target
    pool = set()
    for query in sorted({ipa, mapped}):
        pool.update(match for match, _, _ in process.extract(query, strings,
                     scorer=Levenshtein.normalized_similarity, limit=25))
    scored = []
    for pronunciation in pool:
        score = max(phonetic_similarity(query, pronunciation) for query in {ipa, mapped})
        for word in pronunciation_words[pronunciation]:
            threshold = .75 if min(len(source_word), len(word)) <= 3 else .65
            if score >= threshold:
                scored.append({'word': word, 'ipa': pronunciation, 'retrieval_score': score})
    return sorted(scored, key=lambda r: (-r['retrieval_score'], r['word']))[:5]


def phonetic_retrieval(destination, audit):
    destination.mkdir(exist_ok=False, parents=True)
    started = time.perf_counter()
    hashes = verified_inputs()
    channels, counts = baseline_channels()
    lexicons = lemma_metadata()
    attested = {lang: set(words) for lang, words in load(audit / 'attested_words.json').items()}
    training, evaluation = [], []
    calibration = []
    for case in development():
        if int(case['family_group'][-1], 16) % 2:
            evaluation.append(case)
            continue
        calibration.append(case['case_id'])
        if case['history_reference'] != 'same_expert_set':
            continue
        a, b = lookup(lexicons[case['lang_a']], case['word_a']), lookup(lexicons[case['lang_b']], case['word_b'])
        if a and b and a['word'] in attested[case['lang_a']] and b['word'] in attested[case['lang_b']]:
            training.append({**case, 'word_a': a['word'], 'word_b': b['word'], 'ipa_a': a['ipa'], 'ipa_b': b['ipa']})
    mappings, observations = learn(training)
    assert not ({r['family_group'] for r in training} & {r['family_group'] for r in evaluation})
    indexes = {}
    for lang, lexicon in lexicons.items():
        by_ipa = defaultdict(list)
        for word, record in sorted(lexicon.items()):
            if record['ipa']:
                by_ipa[record['ipa']].append(word)
        indexes[lang] = by_ipa, sorted(by_ipa)
    query_cases = defaultdict(list)
    for case in evaluation:
        for side, other in [('a', 'b'), ('b', 'a')]:
            query_cases[case[f'lang_{side}'], case[f'word_{side}'], case[f'lang_{other}']].append(case['case_id'])
    queries = []
    added, unlearned_added = set(), set()
    for index, ((la, word, lb), case_ids) in enumerate(sorted(query_cases.items())):
        meta = lookup(lexicons[la], word)
        raw = retrieve(meta['ipa'], indexes[lb], {}, meta['word']) if meta else []
        learned = retrieve(meta['ipa'], indexes[lb], mappings[la, lb], meta['word']) if meta else []
        for records, collected in [(raw, unlearned_added), (learned, added)]:
            for record in records:
                record['source_attested_ipa'] = record['word'] in attested[lb]
                identity = key(la, meta['word'], lb, record['word'])
                if identity not in channels:
                    collected.add(identity)
        queries.append({'source_language': la, 'source_reference_word': word, 'target_language': lb,
                        'source_lemma': meta['word'] if meta else None, 'source_ipa': meta['ipa'] if meta else None,
                        'source_attested_ipa': bool(meta and meta['word'] in attested[la]), 'case_ids': sorted(case_ids),
                        'unlearned': raw, 'learned': learned})
        if index % 100 == 0:
            print('queries', index, '/', len(query_cases), flush=True)
    results = []
    for case in evaluation:
        identity = key(case['lang_a'], case['word_a'], case['lang_b'], case['word_b'])
        origin = channels.get(identity, set())
        results.append({**case, 'pair': f"{case['lang_a']}-{case['lang_b']}", 'channels': sorted(origin),
                        'control': bool(origin), 'A': bool(origin - {'prefix'}),
                        'unlearned': bool(origin) or identity in unlearned_added,
                        'B': bool(origin) or identity in added,
                        'A_plus_B': bool(origin - {'prefix'}) or identity in added})
    rng = random.Random(SEED)
    sample = defaultdict(list)
    seen = Counter()
    for identity in sorted(added):
        pair = f'{identity[0][0]}-{identity[1][0]}'
        seen[pair] += 1
        if len(sample[pair]) < 6:
            sample[pair].append(identity)
        else:
            replacement = rng.randrange(seen[pair])
            if replacement < 6:
                sample[pair][replacement] = identity
    # Save headword identities, not their senses; the following fixed-classifier audit reads them separately.
    candidates = [{'lang_a': a[0], 'word_a': a[1], 'lang_b': b[0], 'word_b': b[1]}
                  for pair in sorted(sample) for a, b in sorted(sample[pair])]
    metrics = {'recall': recall(results, ['control', 'A', 'unlearned', 'B', 'A_plus_B']),
               'calibration_cases': len(calibration), 'training_pairs': len(training),
               'training_families': len({r['family_group'] for r in training}),
               'evaluation_families': len({r['family_group'] for r in evaluation}),
               'accepted_replacements': sum(r['accepted'] for r in observations),
               'queries': len(queries), 'source_attested_queries': sum(r['source_attested_ipa'] for r in queries),
               'missing_query_lemmas': sum(r['source_lemma'] is None for r in queries),
               'missing_query_ipa': sum(not r['source_ipa'] for r in queries),
               'additional_candidate_counts': dict(seen), 'all_additional_candidates': len(added),
               'unlearned_additional_candidates': len(unlearned_added),
               'elapsed_seconds': time.perf_counter() - started}
    save_json(destination / 'protocol.json', {'experiment': 'E4-B', 'plan_sha256': digest(OUTPUT / 'E4_PLAN.md'),
        'inputs': hashes, 'code_sha256': digest(Path(__file__)),
        'pronunciation_audit_sha256': digest(audit / 'attested_words.json'), 'seed': SEED,
        'parameters': {'shortlist': 25, 'top_k': 5, 'short_threshold': .75, 'threshold': .65,
                       'mapping_family_support': 3, 'mapping_fraction': .5},
        'calibration_cases': calibration, 'evaluation_cases': [r['case_id'] for r in evaluation]})
    save_json(destination / 'training_pairs.json', training)
    save_json(destination / 'correspondences.json', observations)
    save_json(destination / 'queries.json', queries)
    save_json(destination / 'concept_results.json', results)
    save_json(destination / 'additional_candidates.json', [[list(a), list(b)] for a, b in sorted(added)])
    save_json(destination / 'review_sample.json', candidates)
    save_json(destination / 'metrics.json', metrics)
    print(json.dumps(metrics, ensure_ascii=False, indent=2))


def self_check():
    row = {'word_a': 'Water', 'word_b': 'water', 'translation_source_senses': '[]', 'orthographic_sim': 1}
    assert channel(row) == 'exact'
    assert channel({**row, 'translation_source_senses': '[{"source_entry_key":"x"}]'}) == 'translation'
    assert channel({**row, 'word_a': 'former', 'word_b': 'formel', 'orthographic_sim': 5 / 6}) == 'prefix'
    training = [{'lang_a': 'a', 'lang_b': 'b', 'word_a': str(i), 'word_b': str(i),
                 'ipa_a': 'pat', 'ipa_b': 'fat', 'family_group': str(i)} for i in range(3)]
    maps, _ = learn(training)
    assert maps['a', 'b'] == {'p': 'f'} and maps['b', 'a'] == {'f': 'p'}
    maps, _ = learn([{**r, 'family_group': 'same'} for r in training])
    assert not maps
    assert not retrieve('', ({'a': ['one']}, ['a']), {}, 'source')
    found = retrieve('pat', ({'fat': ['target']}, ['fat']), {'p': 'f'}, 'source')
    assert found[0]['word'] == 'target' and found[0]['retrieval_score'] == 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['A', 'B', 'pronunciations', 'check'])
    parser.add_argument('--output', type=Path)
    parser.add_argument('--audit', type=Path, default=OUTPUT / 'e4-pronunciations')
    args = parser.parse_args()
    self_check()
    if args.action == 'A':
        prefix_removal(args.output or OUTPUT / 'e4-a001')
    elif args.action == 'B':
        phonetic_retrieval(args.output or OUTPUT / 'e4-b001', args.audit)
    elif args.action == 'pronunciations':
        pronunciation_audit(args.output or args.audit)

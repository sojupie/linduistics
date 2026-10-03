"""Freeze an independent IE-CoR panel, then audit the unchanged baseline.

Run with the project Python: pipeline/evaluation/e0.py prepare|audit.
The audit does not write to PostgreSQL or modify pipeline inputs.
"""
import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import itertools
import json
from pathlib import Path
import random
import unicodedata

import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = Path(__file__).resolve().parent
REFERENCE = ROOT / 'pipeline/data/references/iecor-v1.1'
BASELINE = ROOT / 'pipeline/data/reproduce-five-language-20261002'
DATASET = BASELINE / 'all_comparisons_v2.parquet'
EXPECTED_HASH = 'a7e2bfe3ffa75931c9134f3e570eec53cbf644713b738bedc055fdc9b44b120f'
LANGUAGES = {'20': 'da', '22': 'en', '27': 'de', '58': 'nb', '69': 'sv'}
SEED = 20261003


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def read_csv(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))


def save_json(path, value):
    # Preserve each run: accidental overwrites must fail.
    with path.open('x', encoding='utf-8') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')


def normalized(word):
    return unicodedata.normalize('NFC', word.strip()).casefold()


def key(lang_a, word_a, lang_b, word_b):
    return tuple(sorted(((lang_a, normalized(word_a)), (lang_b, normalized(word_b)))))


def prepare():
    """Choose all reference cases without inspecting baseline predictions."""
    forms = defaultdict(list)
    for form in read_csv(REFERENCE / 'cldf_forms.csv'):
        if form['Language_ID'] in LANGUAGES and form['Form'].strip():
            forms[form['Parameter_ID']].append(form)
    cognates = defaultdict(set)
    for row in read_csv(REFERENCE / 'cldf_cognates.csv'):
        if row['Doubt'].lower() == 'false' and row['Cognate_Detection_Method'] == 'expert':
            cognates[row['Form_ID']].add(row['Cognateset_ID'])
    concepts = {r['ID']: r for r in read_csv(REFERENCE / 'cldf_parameters.csv')}
    cases = []
    for concept_id, entries in sorted(forms.items()):
        for a, b in itertools.combinations(sorted(entries, key=lambda f: f['ID']), 2):
            if a['Language_ID'] == b['Language_ID']:
                continue
            if LANGUAGES[a['Language_ID']] > LANGUAGES[b['Language_ID']]:
                a, b = b, a
            sets_a, sets_b = cognates[a['ID']], cognates[b['ID']]
            cases.append({
                'case_id': f"iecor:{a['ID']}:{b['ID']}",
                'concept_id': concept_id,
                'concept': concepts[concept_id]['Name'],
                'expected_meaning': concepts[concept_id]['Concepticon_Definition'],
                'lang_a': LANGUAGES[a['Language_ID']], 'word_a': a['Form'],
                'lang_b': LANGUAGES[b['Language_ID']], 'word_b': b['Form'],
                'form_id_a': a['ID'], 'form_id_b': b['ID'],
                'expert_sets_a': '|'.join(sorted(sets_a)),
                'expert_sets_b': '|'.join(sorted(sets_b)),
                'history_reference': ('same_expert_set' if sets_a & sets_b else
                                      'different_expert_sets' if sets_a and sets_b else 'not_annotated'),
                'source_a': a['url'], 'source_b': b['url'],
            })
    protocol = {
        'experiment': 'E0', 'phase': 'independent concept panel and baseline sampling',
        'seed': SEED, 'baseline_sha256': EXPECTED_HASH,
        'reference': 'IE-CoR 1.1, Heggarty, Anderson and Scarborough (2024), CC-BY 4.0',
        'source_hashes': {p.name: digest(p) for p in sorted(REFERENCE.iterdir()) if p.is_file()},
        'concept_panel': 'Census of all between-language form combinations in the five selected modern varieties',
        'case_count': len(cases),
        'matching': 'NFC, trim, casefold; exact reference spelling. No guessed lemmas or edit-distance mapping.',
        'existing_sample': '5 undirected rows per language-pair/category via seeded reservoir; both directions grouped',
        'review': {
            'meaning': 'Judge headline and secondary matches against published concept definition and disambiguation; record acceptable alternatives and unresolved cases.',
            'history': 'Same expert set is source-supported cognacy. Different sets are disagreement with this reference, not proof of wholly unrelated origins.',
            'blinding': 'Review packet excludes pipeline labels and numeric scores.',
            'gold_limits': 'Published expert annotations support the concept panel only. AI judgments on open vocabulary are not independent gold.',
        },
        'split_status': 'Family-grouped development/test assignment required before E1; no variants scored yet.',
        'remaining_e0_work': ['Independent frequency panel', 'Hard-case and displayed-meaning review',
                              'Family splits and clustered uncertainty', 'Numerical acceptance limits for E1-E4'],
        'write_policy': 'Local evaluation artifacts only; no live database writes.',
    }
    save_json(OUTPUT / 'e0_protocol.json', protocol)
    with (OUTPUT / 'e0_concept_cases.csv').open('x', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(cases[0]))
        writer.writeheader()
        writer.writerows(cases)
    print(f'Frozen {len(cases)} independently sourced cases.')


def audit():
    protocol = json.loads((OUTPUT / 'e0_protocol.json').read_text(encoding='utf-8'))
    if digest(DATASET) != protocol['baseline_sha256']:
        raise ValueError('Baseline content differs from the frozen protocol')
    for name, expected in protocol['source_hashes'].items():
        if digest(REFERENCE / name) != expected:
            raise ValueError(f'Reference changed: {name}')
    cases = read_csv(OUTPUT / 'e0_concept_cases.csv')
    wanted = {key(c['lang_a'], c['word_a'], c['lang_b'], c['word_b']) for c in cases}
    found, samples, totals = {}, defaultdict(list), Counter()
    rng = random.Random(SEED)
    for batch in pq.ParquetFile(DATASET).iter_batches(batch_size=8192):
        for row in batch.to_pylist():
            if row['lang_a'] >= row['lang_b']:
                continue
            pair_key = key(row['lang_a'], row['word_a'], row['lang_b'], row['word_b'])
            if pair_key in wanted:
                found[pair_key] = row
            group = (row['lang_a'], row['lang_b'], row['category'])
            totals[group] += 1
            n = totals[group]
            slot = n - 1 if n <= 5 else rng.randrange(n)
            if slot < 5:
                if n <= 5:
                    samples[group].append(row)
                else:
                    samples[group][slot] = row
    headwords = {}
    for lang in LANGUAGES.values():
        headwords[lang] = {normalized(w) for w in pq.read_table(BASELINE / f'lemmas_{lang}.parquet', columns=['word']).column('word').to_pylist()}
    results, metrics = [], defaultdict(Counter)
    for case in cases:
        row = found.get(key(case['lang_a'], case['word_a'], case['lang_b'], case['word_b']))
        group = f"{case['lang_a']}-{case['lang_b']}"
        status = ('found' if row else 'missing_comparison' if
                  normalized(case['word_a']) in headwords[case['lang_a']] and
                  normalized(case['word_b']) in headwords[case['lang_b']] else 'missing_exact_headword')
        metrics[group][status] += 1
        results.append({**case, 'coverage_status': status,
                        'category': row['category'] if row else '',
                        'relation': row['etymological_relation'] if row else '',
                        'display_a': row['def_a'] if row else '', 'display_b': row['def_b'] if row else ''})
    save_json(OUTPUT / 'e0_baseline_metrics.json', {
        'baseline_sha256': protocol['baseline_sha256'], 'concept_coverage': dict(metrics),
        'sampling_cells': [{'lang_a': a, 'lang_b': b, 'category': category,
                            'population': count, 'sample': len(samples[(a, b, category)]),
                            'inclusion_probability': min(5, count) / count}
                           for (a, b, category), count in sorted(totals.items())],
        'quality_status': 'Coverage measured; displayed meanings and open-vocabulary labels not yet reviewed.',
    })
    with (OUTPUT / 'e0_concept_results.csv').open('x', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(results[0]))
        writer.writeheader()
        writer.writerows(results)
    # Two packets: blind source evidence for review and separate predictions for scoring.
    blind, predictions = [], []
    for group in sorted(samples):
        for i, row in enumerate(samples[group]):
            case_id = f"sample:{group[0]}:{group[1]}:{group[2]}:{i}"
            evidence = {k: row[k] for k in ['lang_a', 'word_a', 'lang_b', 'word_b', 'def_a', 'def_b', 'etym_text_a', 'etym_text_b']}
            for side in ['a', 'b']:
                evidence[f'senses_{side}'] = [{k: v for k, v in s.items() if k not in
                    ['similarity_to_counterpart', 'is_active_match']} for s in json.loads(row[f'senses_{side}'] or '[]')]
            # The ID does not reveal the category to the reviewer.
            anonymous_id = hashlib.sha256(case_id.encode()).hexdigest()[:16]
            blind.append({'case_id': anonymous_id, **evidence})
            predictions.append({'case_id': anonymous_id, **{k: row[k] for k in ['category', 'etymological_relation', 'orthographic_sim', 'phonetic_sim', 'semantic_sim']}})
    rng.shuffle(blind)
    save_json(OUTPUT / 'e0_blind_review.json', blind)
    save_json(OUTPUT / 'e0_sample_predictions.json', predictions)
    print(json.dumps(dict(metrics), indent=2))


def verify():
    """Check saved evidence consistency and unchanged baseline, without rerunning scoring."""
    protocol = json.loads((OUTPUT / 'e0_protocol.json').read_text(encoding='utf-8'))
    assert digest(DATASET) == protocol['baseline_sha256']
    cases = read_csv(OUTPUT / 'e0_concept_cases.csv')
    results = read_csv(OUTPUT / 'e0_concept_results.csv')
    assert len(cases) == protocol['case_count'] == len(results)
    assert len({c['case_id'] for c in cases}) == len(cases)
    assert [c['case_id'] for c in cases] == [c['case_id'] for c in results]
    actual = defaultdict(Counter)
    for row in results:
        actual[f"{row['lang_a']}-{row['lang_b']}"][row['coverage_status']] += 1
    metrics = json.loads((OUTPUT / 'e0_baseline_metrics.json').read_text(encoding='utf-8'))
    assert dict(actual) == metrics['concept_coverage']
    blind = json.loads((OUTPUT / 'e0_blind_review.json').read_text(encoding='utf-8'))
    predictions = json.loads((OUTPUT / 'e0_sample_predictions.json').read_text(encoding='utf-8'))
    assert len(blind) == sum(c['sample'] for c in metrics['sampling_cells'])
    assert {c['case_id'] for c in blind} == {c['case_id'] for c in predictions}
    for row in blind:
        assert 'category' not in row and 'semantic_sim' not in row
        for side in ['a', 'b']:
            assert all('similarity_to_counterpart' not in s and 'is_active_match' not in s for s in row[f'senses_{side}'])
    print('E0 artifact counts, coverage, blinding, and unchanged baseline verified.')


if __name__ == '__main__':
    assert normalized(' Wasser ') == normalized('wasser')
    assert key('en', 'water', 'de', 'Wasser') == key('de', 'wasser', 'en', 'water')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'audit', 'verify'])
    parser.add_argument('--output', type=Path, default=OUTPUT, help='Separate directory for a new run; existing artifacts are never overwritten')
    args = parser.parse_args()
    OUTPUT = args.output
    OUTPUT.mkdir(parents=True, exist_ok=True)
    {'prepare': prepare, 'audit': audit, 'verify': verify}[args.action]()

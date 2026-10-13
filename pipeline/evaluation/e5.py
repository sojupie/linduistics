"""Audit new-language source coverage using the unchanged parser and independent concepts."""
import argparse
from collections import Counter
import json
from pathlib import Path
import sys
import time

import orjson

from e0 import OUTPUT, ROOT, REFERENCE, digest, normalized, read_csv, save_json

sys.path.insert(0, str(ROOT / 'pipeline/src'))
from parser import stream_kaikki_entries, export_lemmas_to_parquet


def source_audit(destination, lemmas):
    destination.mkdir(exist_ok=False, parents=True)
    lemmas.mkdir(exist_ok=False, parents=True)
    previous = json.loads((ROOT / 'pipeline/data/language-expansion/translation_claims_all.jsonl.manifest.json').read_text())
    expected = {r['file']: r['sha256'] for r in previous['source_files']}
    source_hashes, metrics, concepts = {}, {}, []
    forms = read_csv(REFERENCE / 'cldf_forms.csv')
    parameters = {r['ID']: r for r in read_csv(REFERENCE / 'cldf_parameters.csv')}
    started = time.perf_counter()
    for lang, reference_id in [('nl', '21'), ('is', '36')]:
        path = ROOT / f'pipeline/data/kaikki_{lang}.jsonl'
        source_hashes[str(path.relative_to(ROOT))] = digest(path)
        assert source_hashes[str(path.relative_to(ROOT))] == expected[path.name]
        raw_languages, raw_counts = Counter(), Counter()
        with path.open('rb') as stream:
            for line in stream:
                record = orjson.loads(line)
                raw_languages[record.get('lang_code')] += 1
                raw_counts['entries'] += 1
                raw_counts['etymology_text'] += bool(record.get('etymology_text'))
                raw_counts['etymology_templates'] += bool(record.get('etymology_templates'))
                raw_counts['recorded_ipa'] += any(s.get('ipa') for s in record.get('sounds') or [] if isinstance(s, dict))
                raw_counts['translation_records'] += sum(len(s.get('translations') or []) for s in record.get('senses') or [])
        lexicon = stream_kaikki_entries(str(path), lang)
        assert all(s.get('source_entry_key') for r in lexicon.values() for s in r['senses'])
        export_lemmas_to_parquet(lexicon, str(lemmas / f'lemmas_{lang}.parquet'))
        senses = [s for record in lexicon.values() for s in record['senses']]
        entries = {s['source_entry_key'] for s in senses}
        normalized_words = {normalized(w): w for w in lexicon}
        language_concepts = []
        for form in forms:
            if form['Language_ID'] != reference_id or not form['Form'].strip():
                continue
            head = normalized_words.get(normalized(form['Form']))
            concept = parameters[form['Parameter_ID']]
            item = {'language': lang, 'form_id': form['ID'], 'concept_id': form['Parameter_ID'],
                    'word': form['Form'], 'concept': concept['Name'],
                    'expected_meaning': concept['Concepticon_Definition'], 'found_exact': head is not None,
                    'lemma': head, 'senses': lexicon[head]['senses'] if head else [],
                    'recorded_ipa': lexicon[head]['ipa'] if head else None}
            language_concepts.append(item)
            concepts.append(item)
        metrics[lang] = {'raw_languages': dict(raw_languages), 'raw_counts': dict(raw_counts),
            'accepted_lemmas': len(lexicon), 'accepted_source_entries': len(entries),
            'accepted_senses': len(senses), 'active_senses': sum(s.get('is_active', True) for s in senses),
            'source_pronunciation_lemmas': sum(bool(r['ipa']) for r in lexicon.values()),
            'etymology_text_lemmas': sum(bool(r['etym_text']) for r in lexicon.values()),
            'structured_root_lemmas': sum(bool(r['etym_root']) for r in lexicon.values()),
            'multiple_source_entry_lemmas': sum(len({s['source_entry_key'] for s in r['senses']}) > 1 for r in lexicon.values()),
            'lemma_pos': dict(Counter(r['pos'] for r in lexicon.values())),
            'sense_pos': dict(Counter(s['pos'] for s in senses)),
            'concept_forms': len(language_concepts), 'exact_concept_forms_found': sum(r['found_exact'] for r in language_concepts),
            'found_concept_forms_with_pronunciation': sum(bool(r['recorded_ipa']) for r in language_concepts),
            'missing_concept_forms': [{'form_id': r['form_id'], 'word': r['word'], 'concept': r['concept']}
                                      for r in language_concepts if not r['found_exact']]}
        print(lang, json.dumps(metrics[lang], ensure_ascii=False), flush=True)
    save_json(destination / 'concept_inventory.json', concepts)
    save_json(destination / 'metrics.json', {'languages': metrics, 'elapsed_seconds': time.perf_counter() - started})
    save_json(destination / 'protocol.json', {'experiment': 'E5 source audit', 'plan_sha256': digest(OUTPUT / 'E5_SOURCE_PLAN.md'),
        'raw_source_hashes': source_hashes, 'parser_sha256': digest(ROOT / 'pipeline/src/parser.py'),
        'code_sha256': digest(Path(__file__)), 'reference_hashes': {name: digest(REFERENCE / name)
            for name in ['cldf_forms.csv', 'cldf_languages.csv', 'cldf_parameters.csv']},
        'parsed_lookup_hashes': {p.name: digest(p) for p in lemmas.glob('*.parquet')},
        'pronunciation': 'No Dutch/Icelandic G2P converter exists; unsupported fallback remains empty.',
        'scope': 'Source-only audit before candidate admission. No pair predictions or reserved family review.'})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=OUTPUT / 'e5-source-audit')
    parser.add_argument('--lemmas', type=Path, default=ROOT / 'pipeline/data/e5-source-audit')
    args = parser.parse_args()
    source_audit(args.output, args.lemmas)

"""Mine expansion translations and replay every old candidate and final label."""
import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import sys
import time

import pyarrow as pa
import pyarrow.parquet as pq
import psycopg

from e0 import ROOT, OUTPUT, BASELINE, DATASET, digest, frozen_input_hashes, save_json

sys.path.insert(0, str(ROOT / 'pipeline/src'))
import build_crosslingual_dataset as builder
from sense_aligner import classify_pair_senses


def run(destination):
    destination.mkdir(parents=True, exist_ok=False)
    started = time.perf_counter()
    inputs = frozen_input_hashes()
    for name, expected in inputs.items():
        assert digest(ROOT / name) == expected, name
    new_protocol = json.loads((OUTPUT / 'e5-source-audit/protocol.json').read_text())
    lookups, hashes = {}, {}
    for lang in ['da', 'de', 'en', 'nb', 'sv', 'nl', 'is']:
        path = (ROOT / 'pipeline/data/e5-source-audit' if lang in ['nl', 'is'] else BASELINE) / f'lemmas_{lang}.parquet'
        hashes[lang] = digest(path)
        if lang in ['nl', 'is']:
            assert hashes[lang] == new_protocol['parsed_lookup_hashes'][path.name]
        # Translation and collision functions read only these metadata fields.
        lookups[lang] = {r['word']: r for r in pq.read_table(path, columns=['word', 'ipa', 'etym_root']).to_pylist()}
    english = ROOT / 'pipeline/data/kaikki_en.jsonl'
    manifest = json.loads((ROOT / 'pipeline/data/language-expansion/translation_claims_all.jsonl.manifest.json').read_text())
    expected_en = next(r['sha256'] for r in manifest['source_files'] if r['file'] == english.name)
    assert digest(english) == expected_en
    builder.TARGET_LANGS = list(lookups)  # Process-local experiment; production membership is unchanged.
    mined, references = builder.mine_translation_cliques(english, lookups)
    old_rows, categories = defaultdict(list), Counter()
    classified = 0
    conn = psycopg.connect('postgresql://postgres:postgres@localhost:5432/linduistics')
    conn.execute('SET TRANSACTION READ ONLY')
    for batch in pq.ParquetFile(DATASET).iter_batches(batch_size=8192):
        records = batch.to_pylist()
        # Reuse the historical text -> REAL -> psycopg conversion, including its text result representation.
        converted = conn.execute('SELECT %s::text[]::real[], %s::text[]::real[], %s::text[]::real[]',
            tuple([str(r[n]) for r in records] for n in ['orthographic_sim', 'phonetic_sim', 'semantic_sim'])).fetchone()
        for index, row in enumerate(records):
            ra, rb = row['etym_root_a'], row['etym_root_b']
            if row['shared_etym_root'] and not ra and not rb:
                ra = rb = row['shared_etym_root']
            result = classify_pair_senses(row['word_a'], row['lang_a'], [], ra,
                row['word_b'], row['lang_b'], [], rb,
                *(values[index] for values in converted))
            assert (result.category, result.etymological_relation) == (row['category'], row['etymological_relation']), (row['word_a'], row['word_b'])
            classified += 1
            categories[row['category']] += 1
            if row['lang_a'] >= row['lang_b']:
                continue
            pair = row['lang_a'], row['lang_b']
            words = row['word_a'], row['word_b']
            source_refs = {(r['source_entry_key'], r['source_sense_id']) for r in json.loads(row['translation_source_senses'] or '[]')}
            assert source_refs == references[pair].get(words, set()), (pair, words, 'source references changed')
            old_rows[pair].append(words)
    conn.close()
    regression, counts = {}, {}
    for pair in sorted(mined):
        counts[':'.join(pair)] = len(mined[pair])
        if not {'nl', 'is'} & set(pair):
            expected = old_rows[pair]
            seen = set(mined[pair])
            collisions = builder.find_surface_collisions(*pair, lookups[pair[0]], lookups[pair[1]], seen)
            actual = sorted(mined[pair]) + [(a['word'], b['word']) for a, b, _, _ in collisions]
            assert actual == expected, (pair, 'candidate membership or order changed')
            regression[':'.join(pair)] = dict(translation_candidates=len(mined[pair]),
                surface_candidates=len(collisions), total=len(actual), membership_and_order_equal=True)
            print('Verified old candidates', pair, len(actual), flush=True)
            del collisions
        else:
            records = [dict(word_a=a, word_b=b, translation_source_senses=json.dumps([
                dict(source_entry_key=e, source_sense_id=s) for e, s in sorted(references[pair][a, b], key=lambda x: (x[0], x[1] or ''))
            ], ensure_ascii=False)) for a, b in sorted(mined[pair])]
            pq.write_table(pa.Table.from_pylist(records), destination / f'translations_{pair[0]}_{pair[1]}.parquet', compression='zstd')
    assert len(regression) == 10 and classified == 1638454
    save_json(destination / 'metrics.json', dict(old_pair_regression=regression,
        all_old_final_labels_replayed=classified, old_categories=dict(categories),
        translation_counts=counts, elapsed_seconds=time.perf_counter() - started))
    save_json(destination / 'protocol.json', dict(code_sha256=digest(Path(__file__)),
        builder_sha256=digest(Path(builder.__file__)), plan_sha256=digest(OUTPUT / 'E5_ADMISSION_PLAN.md'),
        panel_protocol_sha256=digest(OUTPUT / 'e5-panel002/protocol.json'),
        lemma_hashes=hashes, english_source_sha256=expected_en, baseline_sha256=digest(DATASET),
        translation_artifacts={p.name: digest(p) for p in destination.glob('*.parquet')},
        scope='Full old candidate membership/order, translation source references, and scalar V2 label replay. New translations only; new sense alignment and labels not yet built.',
        score_conversion='Historical text -> PostgreSQL REAL -> psycopg text-result conversion, checked against every old final label. Read-only SQL; no database mutation.'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=OUTPUT / 'e5-candidates001')
    run(parser.parse_args().output)

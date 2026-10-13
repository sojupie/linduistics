"""Read full senses and replay fixed classification for E4's unfiltered sample."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import sys

import pyarrow.parquet as pq

from e0 import BASELINE, DATASET, OUTPUT, ROOT, digest, key, save_json
from e4 import load

sys.path.insert(0, str(ROOT / 'pipeline/src'))
from build_crosslingual_dataset import align_pair_senses
from ipa_normalizer import phonetic_similarity
from linguistic_metrics import orthographic_similarity
from semantic_matcher import SemanticMatcher
from sense_aligner import classify_pair_senses


def classification(row):
    a, b = row.get('etym_root_a'), row.get('etym_root_b')
    if not a and not b and row.get('shared_etym_root'):
        a = b = row['shared_etym_root']
    return classify_pair_senses(word_a=row['word_a'], lang_a=row['lang_a'], senses_a=[], root_a=a,
        word_b=row['word_b'], lang_b=row['lang_b'], senses_b=[], root_b=b,
        ortho_sim=row['orthographic_sim'], phono_sim=row['phonetic_sim'],
        max_semantic_sim=row['semantic_sim'])


def prepare(source, destination):
    destination.mkdir(exist_ok=False, parents=True)
    sample = load(source / 'review_sample.json')
    expected = [r for r in load(source / 'concept_results.json') if not r['control'] and (r['B'] or r['unlearned'])]
    cases = [{**r, 'panel': 'unfiltered_sample'} for r in sample]
    cases.extend({**r, 'panel': 'recovered_concept'} for r in expected)
    wanted = defaultdict(set)
    for row in cases:
        for side in ['a', 'b']:
            wanted[row[f'lang_{side}']].add(row[f'word_{side}'].casefold())
    endpoints = defaultdict(list)
    for lang, words in wanted.items():
        for batch in pq.ParquetFile(BASELINE / f'lemmas_{lang}.parquet').iter_batches():
            for row in batch.to_pylist():
                if row['word'].casefold() not in words:
                    continue
                senses = json.loads(row['senses_json'] or '[]')
                meta = {**row, 'lang': lang, 'senses': senses,
                        'def': (row['glosses'] or [senses[0]['gloss']])[0]}
                endpoints[lang, row['word'].casefold()].append(meta)
    blind = []
    for index, row in enumerate(cases, 1):
        a = endpoints[row['lang_a'], row['word_a'].casefold()]
        b = endpoints[row['lang_b'], row['word_b'].casefold()]
        # An independent reference spelling takes precedence; retain all alternatives otherwise.
        if row['panel'] == 'recovered_concept':
            a = [r for r in a if r['word'] == row['word_a']] or a
            b = [r for r in b if r['word'] == row['word_b']] or b
        blind.append({'review_id': index, 'panel': row['panel'],
                      **{k: row[k] for k in ['lang_a', 'word_a', 'lang_b', 'word_b']},
                      'concept': row.get('concept'), 'expected_meaning': row.get('expected_meaning'),
                      'endpoints_a': a, 'endpoints_b': b})
    save_json(destination / 'blind_packet.json', blind)
    frozen = {key(r['lang_a'], r['word_a'], r['lang_b'], r['word_b']): r
              for r in load(OUTPUT / 'e1-run003/comparisons.json')}
    columns = [c for c in next(iter(frozen.values())) if c not in
               {'matrix', 'selections', 'reconstructed_control', 'eligible_pair_count'}]
    controls = {}
    for batch in pq.ParquetFile(DATASET).iter_batches(columns=columns + ['etym_root_a', 'etym_root_b',
                                                                            'shared_etym_root', 'orthographic_sim', 'phonetic_sim']):
        for row in batch.to_pylist():
            if row['lang_a'] >= row['lang_b']:
                continue
            identity = key(row['lang_a'], row['word_a'], row['lang_b'], row['word_b'])
            if identity in frozen and all(row[c] == frozen[identity][c] for c in columns):
                controls[identity] = row
    assert len(controls) == 1201
    disagreements = []
    for row in controls.values():
        prediction = classification(row)
        if (prediction.category, prediction.etymological_relation) != (row['category'], row['etymological_relation']):
            disagreements.append({'word_a': row['word_a'], 'word_b': row['word_b'], 'category': row['category'],
                                  'replayed_category': prediction.category})
    assert not disagreements, disagreements[:5]
    matcher = SemanticMatcher()
    matcher.preencode_glosses([s['gloss'] for variants in endpoints.values() for meta in variants for s in meta['senses']])
    predictions = []
    for case in blind:
        contexts = []
        for a in case['endpoints_a']:
            for b in case['endpoints_b']:
                semantic, _, da, db, sa, sb = align_pair_senses(a, b, matcher)
                selected_a = next(s for s in sa if s['is_active_match'])
                selected_b = next(s for s in sb if s['is_active_match'])
                row = {'word_a': a['word'], 'lang_a': a['lang'], 'word_b': b['word'], 'lang_b': b['lang'],
                       'etym_root_a': selected_a.get('etym_root'), 'etym_root_b': selected_b.get('etym_root'),
                       'orthographic_sim': orthographic_similarity(a['word'], b['word']),
                       'phonetic_sim': phonetic_similarity(a['ipa'], b['ipa']) if a['ipa'] and b['ipa'] else 0,
                       'semantic_sim': semantic}
                prediction = classification(row)
                contexts.append({**row, 'display_a': da, 'display_b': db,
                                 'senses_a': sa, 'senses_b': sb, 'category': prediction.category,
                                 'etymological_relation': prediction.etymological_relation})
        predictions.append({'review_id': case['review_id'], 'contexts': contexts})
    save_json(destination / 'fixed_predictions.json', predictions)
    save_json(destination / 'protocol.json', {'source_hashes': {name: digest(source / name)
        for name in ['review_sample.json', 'concept_results.json', 'protocol.json']},
        'code_sha256': digest(Path(__file__)), 'control_replayed_comparisons': len(controls),
        'control_category_and_relation_disagreements': disagreements,
        'classifier_sha256': digest(ROOT / 'pipeline/src/sense_aligner.py'),
        'alignment_sha256': digest(ROOT / 'pipeline/src/build_crosslingual_dataset.py'),
        'model': matcher.model_name, 'revision': matcher.revision,
        'note': 'V2 scalar-score classification reproduced exactly; no E1/E2/E3 replacement. Full sense identities saved.'})
    print('Saved', len(blind), 'review cases; replay matched all', len(controls), 'frozen controls.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=OUTPUT / 'e4-b001')
    parser.add_argument('--output', type=Path, default=OUTPUT / 'e4-b001-review')
    args = parser.parse_args()
    prepare(args.source, args.output)

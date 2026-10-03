"""Run E1 against frozen development cases, without database writes."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import sys
import time

import numpy as np
import pyarrow.parquet as pq

from e0 import DATASET, EXPECTED_HASH, OUTPUT, SEED, digest, key, read_csv, save_json

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from semantic_matcher import SemanticMatcher, DEFAULT_MODEL_NAME, DEFAULT_MODEL_REVISION
from sense_display import eligible_pairs, select_display, self_check


def score(destination):
    destination.mkdir(parents=True, exist_ok=False)
    families = json.loads((OUTPUT / 'e0_families_v2.json').read_text(encoding='utf-8'))
    roles = {(r['panel'], r['case_id']): r for r in families['cases']}
    concepts = [r for r in read_csv(OUTPUT / 'e0_concept_results.csv')
                if roles['concept', r['case_id']]['role'] == 'development' and r['coverage_status'] == 'found']
    opened = json.loads((OUTPUT / 'e0_open_development_packet.json').read_text(encoding='utf-8'))
    cases = [dict(r, panel=panel, family_group=roles[panel, r['case_id']]['family_group'])
             for panel, rows in [('concept', concepts), ('open', opened)] for r in rows]
    wanted = {key(r['lang_a'], r['word_a'], r['lang_b'], r['word_b']) for r in cases}
    assert digest(DATASET) == EXPECTED_HASH
    protocol = {
        'experiment': 'E1', 'run_id': 'E1-001', 'plan_sha256': digest(OUTPUT / 'E1_PLAN.md'),
        'baseline_sha256': EXPECTED_HASH, 'families_sha256': digest(OUTPUT / 'e0_families_v2.json'),
        'model': DEFAULT_MODEL_NAME, 'model_revision': DEFAULT_MODEL_REVISION, 'seed': SEED,
        'concept_cases': len(concepts), 'open_cases': len(opened), 'unique_comparisons': len(wanted),
        'parameters': {'close_cosine_margin': 0.10, 'entry_order_weight': 0.05},
        'code_hashes': {str(p): digest(p) for p in [Path(__file__), Path('pipeline/src/sense_display.py'),
                       Path('pipeline/src/semantic_matcher.py')]},
        'write_policy': 'New local evaluation directory only; no database writes or source modifications.',
    }
    save_json(destination / 'protocol.json', protocol)
    columns = ['lang_a', 'word_a', 'lang_b', 'word_b', 'def_a', 'def_b', 'senses_a', 'senses_b',
               'semantic_sim', 'category', 'etymological_relation', 'translation_source_senses']
    rows = {}
    for batch in pq.ParquetFile(DATASET).iter_batches(batch_size=16384, columns=columns):
        for row in batch.to_pylist():
            identity = key(row['lang_a'], row['word_a'], row['lang_b'], row['word_b'])
            if identity in wanted and identity not in rows:
                rows[identity] = row
    assert len(rows) == len(wanted), (len(rows), len(wanted))
    matcher = SemanticMatcher()
    glosses = set()
    for row in rows.values():
        for side in ['a', 'b']:
            row[f'parsed_{side}'] = json.loads(row[f'senses_{side}'])
            assert row[f'parsed_{side}'], 'Missing recorded senses'
            glosses.update(s['gloss'] for s in row[f'parsed_{side}'])
    print(f'Encoding {len(glosses)} unique glosses for {len(rows)} frozen comparisons.', flush=True)
    started = time.monotonic()
    matcher.preencode_glosses(sorted(glosses))
    scored = {}
    for identity, row in rows.items():
        a, b = row.pop('parsed_a'), row.pop('parsed_b')
        matrix = np.clip(matcher.encode([s['gloss'] for s in a]) @ matcher.encode([s['gloss'] for s in b]).T, 0, 1)
        if row['word_a'].strip().lower() == row['word_b'].strip().lower():
            word = row['word_a'].strip().lower()
            for i, sa in enumerate(a):
                for j, sb in enumerate(b):
                    if sa['gloss'].strip().lower() == word or sb['gloss'].strip().lower() == word:
                        matrix[i, j] = 1
        refs = json.loads(row['translation_source_senses'] or '[]')
        eligible = eligible_pairs(a, b, row['lang_a'], row['lang_b'], refs)
        selections = {}
        for variant in ['A', 'B']:
            chosen = select_display(a, b, matrix, eligible, variant)
            selections[variant] = {'indices': list(chosen) if chosen else None,
                'display_a': a[chosen[0]]['gloss'] if chosen else row['def_a'],
                'display_b': b[chosen[1]]['gloss'] if chosen else row['def_b'],
                'selected_cosine': float(matrix[chosen]) if chosen else None}
        control_recomputed = max(eligible, key=lambda ij: float(matrix[ij])) if eligible else None
        scored[identity] = dict(row, matrix=matrix.tolist(), selections=selections,
            reconstructed_control={'display_a': a[control_recomputed[0]]['gloss'] if control_recomputed else row['def_a'],
                'display_b': b[control_recomputed[1]]['gloss'] if control_recomputed else row['def_b'],
                'cosine': float(matrix[control_recomputed]) if control_recomputed else None},
            eligible_pair_count=len(eligible))
    save_json(destination / 'comparisons.json', list(scored.values()))
    old_reviews = {}
    for path in OUTPUT.glob('e0_display_review_*.json'):
        for r in json.loads(path.read_text(encoding='utf-8'))['judgments']:
            old_reviews[r['concept_id'], r['lang'], r['word'], r['display']] = r['decision']
    review_items, results = {}, []
    for case in cases:
        row = scored[key(case['lang_a'], case['word_a'], case['lang_b'], case['word_b'])]
        forward = case['lang_a'] == row['lang_a'] and case['word_a'].casefold() == row['word_a'].casefold()
        displays = {'control': (row['def_a'], row['def_b'])}
        displays.update({v: (s['display_a'], s['display_b']) for v, s in row['selections'].items()})
        record = {k: case[k] for k in ['case_id', 'panel', 'family_group', 'lang_a', 'word_a', 'lang_b', 'word_b']}
        record['displays'] = {}
        for variant, pair in displays.items():
            pair = pair if forward else pair[::-1]
            record['displays'][variant] = list(pair)
            if case['panel'] == 'concept':
                for side, gloss in zip(['a', 'b'], pair):
                    item_key = (case['concept_id'], case[f'lang_{side}'], case[f'word_{side}'], gloss)
                    if item_key not in old_reviews:
                        review_items[item_key] = {'concept_id': case['concept_id'], 'concept': case['concept'],
                            'expected_meaning': case['expected_meaning'], 'lang': case[f'lang_{side}'],
                            'word': case[f'word_{side}'], 'display': gloss}
        results.append(record)
    packet = sorted(review_items.values(), key=lambda r: (int(r['concept_id']), r['lang'], r['word'], r['display']))
    for i, r in enumerate(packet, 1):
        r['review_id'] = i
    save_json(destination / 'concept_review_packet.json', packet)
    save_json(destination / 'case_displays.json', results)
    changes = {v: sum(r['displays'][v] != r['displays']['control'] for r in results) for v in ['A', 'B']}
    controls = sum((r['def_a'], r['def_b']) != (r['reconstructed_control']['display_a'], r['reconstructed_control']['display_b']) for r in scored.values())
    summary = {'run_id': 'E1-001', 'unique_glosses_encoded': len(glosses), 'seconds': time.monotonic() - started,
        'cases': len(results), 'changed_cases': changes, 'new_concept_glosses_to_review': len(packet),
        'reconstructed_control_display_differences': controls,
        'status': 'Scored; new displays need blinded review before accuracy measurements.'}
    save_json(destination / 'score_summary.json', summary)
    print(json.dumps(summary), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=OUTPUT / 'e1-run001')
    args = parser.parse_args()
    self_check()
    score(args.output)

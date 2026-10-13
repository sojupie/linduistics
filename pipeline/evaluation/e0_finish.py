"""Verify completed development reviews and report difficult cases and reference notation.

Run with the project interpreter. Outputs are new records; no dataset is changed.
"""
from collections import Counter, defaultdict
import json
import re
import sys

import pyarrow.parquet as pq

from e0 import BASELINE, DATASET, OUTPUT, ROOT, digest, key, normalized, read_csv, save_json

sys.path.insert(0, str(ROOT))
from pipeline.src.sense_aligner import parse_root


def preserve(path, result):
    if path.exists():
        assert json.loads(path.read_text(encoding='utf-8')) == result, f'Saved result changed: {path}'
    else:
        save_json(path, result)


def reference_forms(word):
    match = re.fullmatch(r'([^()\s]+)\s*\(([^()\s]+)\)', word)
    return [match[1], match[2]] if match else [word]


def main():
    protocol = json.loads((OUTPUT / 'e0_protocol.json').read_text(encoding='utf-8'))
    assert digest(DATASET) == protocol['baseline_sha256']
    packet_path = OUTPUT / 'e0_open_development_packet.json'
    packet = json.loads(packet_path.read_text(encoding='utf-8'))
    roles = {r['case_id']: r for r in json.loads((OUTPUT / 'e0_families_v2.json').read_text(encoding='utf-8'))['cases']}
    expected = {r['review_id']: r for r in packet}
    judgments = {}
    for path in sorted(OUTPUT.glob('e0_open_review_*.json')):
        review = json.loads(path.read_text(encoding='utf-8'))
        assert review['packet_sha256'] == digest(packet_path), path
        for row in review['judgments']:
            index = row['review_id']
            assert index not in judgments and row['case_id'] == expected[index]['case_id']
            assert roles[row['case_id']]['role'] == 'development'
            judgments[index] = row
    assert set(judgments) == set(expected), 'Development review incomplete'
    groups = defaultdict(list)
    per_pair = defaultdict(Counter)
    for case in packet:
        judgment = judgments[case['review_id']]
        senses = case['senses_a'] + case['senses_b']
        history = ' '.join(s.get('etym_text') or '' for s in senses).lower()
        flags = []
        root_languages = {root[0] for s in senses if (root := parse_root(s.get('etym_root')))}
        if len(root_languages) > 1:
            flags.append('different_recorded_root_languages')
        # Matches the baseline generator's three-character prefix channel.
        same_prefix = normalized(case['word_a'])[:3] == normalized(case['word_b'])[:3]
        if same_prefix and judgment['meaning_profile'].startswith('disjoint'):
            flags.append('prefix_collision_control')
        if not same_prefix and judgment['history_evidence'] in {'shared_ancestor_recorded', 'shared_source_recorded'}:
            flags.append('related_forms_without_shared_prefix')
        if any(len({s['gloss'] for s in case[f'senses_{side}'] if s.get('is_active')}) > 1 for side in 'ab'):
            flags.append('multiple_active_senses')
        if any(len({s.get('source_entry_key') for s in case[f'senses_{side}']}) > 1 for side in 'ab'):
            flags.append('multiple_source_entries')
        if any(s['pos'] == 'name' for s in senses):
            flags.append('names_and_entity_identity')
        if any(not s.get('is_active', True) for s in senses):
            flags.append('inactive_usage')
        if any(len(w) <= 3 for w in [case['word_a'], case['word_b']]):
            flags.append('short_words')
        if '+' in history or 'compound' in history or 'component' in judgment['history_evidence']:
            flags.append('composition_or_derivation')
        if 'borrow' in history or 'borrow' in judgment['history_evidence']:
            flags.append('borrowing')
        if 'source_gap' in judgment['meaning_profile']:
            flags.append('missing_source_meaning')
        if 'secondary' in judgment['meaning_profile'] or 'historical_overlap' in judgment['meaning_profile']:
            flags.append('secondary_or_historical_overlap')
        if 'different_pos' in judgment['meaning_profile'] or 'not_equivalent' in judgment['meaning_profile']:
            flags.append('related_but_not_interchangeable')
        for flag in flags:
            groups[flag].append(case['case_id'])
        per_pair[f"{case['lang_a']}-{case['lang_b']}"][judgment['headline_pair']] += 1
    preserve(OUTPUT / 'e0_open_summary_v2.json', {
        'supersedes': 'e0_open_summary.json; added the externally checked missing noun sense to review 179 and corrected redirect spelling in review 184 before freezing their batch.',
        'reviewed_development_cases': len(judgments),
        'reviewed_family_groups': len({roles[r['case_id']]['family_group'] for r in judgments.values()}),
        'meaning_profiles': dict(Counter(r['meaning_profile'] for r in judgments.values())),
        'headline_judgments': dict(Counter(r['headline_pair'] for r in judgments.values())),
        'historical_evidence': dict(Counter(r['history_evidence'] for r in judgments.values())),
        'per_pair_headline_judgments': dict(per_pair),
        'hard_case_groups': dict(groups),
        'limits': 'Groups overlap and are diagnostic slices of the generated development sample, not independent population estimates. Agent judgments are not independent human gold. Unknown history is not a negative relationship label.',
        'packet_sha256': digest(packet_path),
        'review_file_hashes': {p.name: digest(p) for p in sorted(OUTPUT.glob('e0_open_review_*.json'))},
    })

    # Only explicit reference notation is expanded; never guess a spelling.
    absent = [r for r in read_csv(OUTPUT / 'e0_concept_results.csv') if r['coverage_status'] == 'missing_exact_headword']
    heads = {lang: {normalized(w) for w in pq.read_table(BASELINE / f'lemmas_{lang}.parquet', columns=['word']).column('word').to_pylist()} for lang in ['da', 'de', 'en', 'nb', 'sv']}
    sought, notation = defaultdict(list), []
    for case in absent:
        alternatives = {}
        for side in 'ab':
            word = case[f'word_{side}']
            alternatives[side] = reference_forms(word)
        if all(alternatives[s] == [case[f'word_{s}']] for s in 'ab'):
            continue
        record = {'case_id': case['case_id'], 'alternatives': alternatives, 'present_alternatives': {}, 'candidate_rows': []}
        for side in 'ab':
            record['present_alternatives'][side] = [w for w in alternatives[side] if normalized(w) in heads[case[f'lang_{side}']]]
        for a in record['present_alternatives']['a']:
            for b in record['present_alternatives']['b']:
                sought[key(case['lang_a'], a, case['lang_b'], b)].append(record)
        notation.append(record)
    for batch in pq.ParquetFile(DATASET).iter_batches(columns=['lang_a', 'word_a', 'lang_b', 'word_b', 'def_a', 'def_b']):
        for row in batch.to_pylist():
            if row['lang_a'] < row['lang_b']:
                for record in sought.get(key(row['lang_a'], row['word_a'], row['lang_b'], row['word_b']), []):
                    record['candidate_rows'].append(row)
    assert all(r['present_alternatives']['a'] and r['present_alternatives']['b'] for r in notation if r['candidate_rows'])
    preserve(OUTPUT / 'e0_reference_notation_v2.json', {
        'supersedes': 'e0_reference_notation.json; first extraction failed to recognize the whitespace before parentheses, reporting zero cases. This correction retains that record.',
        'notation_cases': len(notation), 'cases_with_comparison': sum(bool(r['candidate_rows']) for r in notation),
        'cases': notation, 'original_absent_cases': len(absent),
        'limits': 'Original coverage counts remain unchanged. Alternate-form existence does not verify the intended concept sense. Phrases and hyphenated forms remain separately reported unsupported inputs.',
        'baseline_sha256': digest(DATASET),
    })
    print(json.dumps({'open_reviewed': len(judgments), 'hard_group_counts': {g: len(c) for g, c in groups.items()}, 'notation_cases': len(notation), 'notation_pairs_found': sum(bool(r['candidate_rows']) for r in notation)}, indent=2))


if __name__ == '__main__':
    assert reference_forms('nese (nase)') == ['nese', 'nase']
    assert reference_forms('røyk(røk)') == ['røyk', 'røk']
    assert reference_forms('i går') == ['i går']
    assert reference_forms('belly-button') == ['belly-button']
    main()

"""Evaluate E2 meaning profiles against frozen references; no database writes."""
import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import random
import sys
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq

from e0 import BASELINE, OUTPUT, SEED, digest, key, save_json

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from meaning_profile import profile_meanings, self_check

CONTROL_LABELS = {
    'full_cognate': 'equivalent', 'true_cognate': 'equivalent',
    'unrelated_equivalent': 'equivalent', 'translation_pair': 'equivalent', 'sister_loanword': 'equivalent',
    'semantic_narrowing': 'partial_overlap', 'semantic_broadening': 'partial_overlap',
    'partial_cognate': 'partial_overlap', 'semantic_divergence': 'different_meanings',
    'archaic_cognate': 'historical_overlap', 'cognate_false_friend': 'different_meanings',
    'accidental_lookalike': 'different_meanings', 'false_friend': 'different_meanings',
    'independent_root': 'no_supported_match', 'other': 'no_supported_match',
}


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def translation_sources(rows):
    wanted = {(ref['source_entry_key'], ref['source_sense_id']) for row in rows
              for ref in json.loads(row.get('translation_source_senses') or '[]')
              if ref.get('source_entry_key') and ref.get('source_sense_id')}
    words = sorted({entry.split('|')[1].casefold() for entry, _ in wanted})
    sources = defaultdict(list)
    for batch in pq.ParquetFile(BASELINE / 'lemmas_en.parquet').iter_batches(columns=['word', 'senses_json']):
        mask = pc.is_in(pc.utf8_lower(batch.column('word')), value_set=pa.array(words))
        for row in batch.filter(mask).to_pylist():
            for sense in json.loads(row['senses_json'] or '[]'):
                identity = (sense.get('source_entry_key'), sense.get('source_sense_id'))
                if identity in wanted:
                    sources[identity].append(sense)
    return sources, wanted


def evaluate(destination, run_id, variant):
    destination.mkdir(parents=True, exist_ok=False)
    source = OUTPUT / 'e1-run003'
    reference = load(OUTPUT / 'e2_reference.json')
    completion = load(source / 'completion.json')
    form_predictions = {r['case_id']: r for r in load(OUTPUT / 'e0_sample_predictions.json')}
    assert digest(source / 'comparisons.json') == completion['artifact_hashes']['comparisons.json']
    assert digest(source / 'case_displays.json') == completion['artifact_hashes']['case_displays.json']
    for name, expected in reference['reference_files'].items():
        assert digest(OUTPUT / name) == expected
    rows = load(source / 'comparisons.json')
    sources, wanted = translation_sources(rows) if variant == 'evidence' else ({}, set())
    lookup = BASELINE / 'lemmas_en.parquet'
    if variant == 'evidence':
        manifest = load(OUTPUT / 'e0_input_manifest.json')
        assert digest(lookup) == manifest['baseline_and_lookup_hashes'][str(lookup.relative_to(Path.cwd()))]
    cases = load(source / 'case_displays.json')
    roles = {(r['panel'], r['case_id']): r for r in load(OUTPUT / 'e0_families_v2.json')['cases']}
    assert all(roles[r['panel'], r['case_id']]['role'] == 'development' for r in cases)
    protocol = {'run_id': run_id, 'variant': variant, 'source_comparisons_sha256': digest(source / 'comparisons.json'),
        'dictionary_evidence_plan_sha256': digest(OUTPUT / 'E2_EVIDENCE_PLAN.md') if variant == 'evidence' else None,
        'english_lemma_sha256': digest(lookup) if variant == 'evidence' else None,
        'requested_translation_identities': len(wanted), 'resolved_translation_identities': len(sources),
        'form_predictions_sha256': digest(OUTPUT / 'e0_sample_predictions.json'),
        'reference_sha256': digest(OUTPUT / 'e2_reference.json'), 'plan_sha256': digest(OUTPUT / 'E2_PLAN.md'),
        'classification_code_sha256': digest(Path('pipeline/src/meaning_profile.py')),
        'evaluation_code_sha256': digest(Path(__file__)), 'parameters': {'match_cosine': 0.75,
            'association_cosine': 0.60, 'equivalent_directional_coverage': 0.80},
        'display': 'Unchanged baseline in both arms', 'history': 'Copied legacy field, not newly verified',
        'seed': SEED, 'write_policy': 'New local result directory only; no database or input changes.'}
    save_json(destination / 'protocol.json', protocol)
    predictions = {}
    saved = {}
    for row in rows:
        identity = key(row['lang_a'], row['word_a'], row['lang_b'], row['word_b'])
        saved[identity] = row
        a, b = [json.loads(row[f'senses_{side}']) for side in ['a', 'b']]
        references = json.loads(row.get('translation_source_senses') or '[]')
        translations = [sense for ref in references for sense in sources.get(
            (ref.get('source_entry_key'), ref.get('source_sense_id')), [])]
        predictions[identity] = profile_meanings(a, b, row['matrix'], row['word_a'], row['word_b'],
            evidence_mode=variant == 'evidence', lang_a=row['lang_a'], lang_b=row['lang_b'],
            translation_evidence=translations)
    expected = {r['case_id']: r for r in reference['cases']}
    results = []
    for case in cases:
        if case['panel'] != 'open':
            continue
        identity = key(case['lang_a'], case['word_a'], case['lang_b'], case['word_b'])
        row, profile = saved[identity], predictions[identity]
        raw_form = form_predictions[case['case_id']]
        assert raw_form['category'] == row['category'] and raw_form['semantic_sim'] == row['semantic_sim']
        threshold = 0.75 if min(len(row['word_a']), len(row['word_b'])) <= 3 else 0.65
        high_form = max(raw_form['orthographic_sim'], raw_form['phonetic_sim']) >= threshold
        ref = expected[case['case_id']]
        labels = {'control': CONTROL_LABELS[row['category']], 'variant': profile['label'], 'always_partial': 'partial_overlap'}
        decisions = {arm: label in ref['compatible_labels'] if ref['scorable'] else None for arm, label in labels.items()}
        results.append({**case, 'labels': labels, 'decisions': decisions, 'reference': ref,
            'meaning_profile': profile, 'history': {'legacy_relation': row['etymological_relation'], 'verification': 'Unchanged input, not an E2 historical finding'},
            'form': {'orthographic_sim': raw_form['orthographic_sim'], 'phonetic_sim': raw_form['phonetic_sim'], 'high_resemblance': high_form},
            'product_label': 'False friend' if profile['label'] == 'different_meanings' and high_form else {
                'equivalent': 'Shared meaning', 'partial_overlap': 'Partial overlap', 'related_form': 'Related forms',
                'related_meanings': 'Related meanings', 'entity_overlap': 'Same named entity',
                'related_name_form': 'Related name forms', 'unverified_name_identity': 'Name identity not established',
                'different_entities': 'Different named entities', 'historical_overlap': 'Historical overlap',
                'no_modern_sense_data': 'No modern sense data', 'different_meanings': 'Different meanings'}[profile['label']],
            'maximum_semantic_sim': row['semantic_sim']})
    assert len(results) == 207 and len({r['case_id'] for r in results}) == 207
    scorable = [r for r in results if r['reference']['scorable']]
    assert len(scorable) == 197
    counts = {arm: sum(r['decisions'][arm] for r in scorable) for arm in ['control', 'variant', 'always_partial']}
    families = defaultdict(list)
    for row in scorable:
        families[row['family_group']].append(row)
    rng = random.Random(SEED)
    differences = []
    for _ in range(2000):
        selected = [r for family in rng.choices(list(families.values()), k=len(families)) for r in family]
        differences.append(100 * sum(r['decisions']['variant'] - r['decisions']['control'] for r in selected) / len(selected))
    differences.sort()
    comparisons = {}
    dense = {r['case_id']: r for r in load(OUTPUT / 'e2-run001' / 'case_results.json')}
    for comparator in ['always_partial', 'dense_only']:
        rng = random.Random(SEED)
        samples = []
        def delta(r):
            previous = dense[r['case_id']]['decisions']['variant'] if comparator == 'dense_only' else r['decisions'][comparator]
            return r['decisions']['variant'] - previous
        for _ in range(2000):
            selected = [r for family in rng.choices(list(families.values()), k=len(families)) for r in family]
            samples.append(100 * sum(delta(r) for r in selected) / len(selected))
        samples.sort()
        comparisons[comparator] = {'difference_percentage_points': 100 * sum(delta(r) for r in scorable) / len(scorable),
            'paired_family_95_interval': [samples[49], samples[1949]]}
    per_pair, confusion = defaultdict(Counter), defaultdict(Counter)
    for r in scorable:
        pair = f"{r['lang_a']}-{r['lang_b']}"
        per_pair[pair]['cases'] += 1
        for arm in counts:
            per_pair[pair][arm] += r['decisions'][arm]
        confusion[r['reference']['meaning_profile']][r['labels']['variant']] += 1
    slices = load(OUTPUT / 'e0_open_summary_v2.json')['hard_case_groups']
    groups = {}
    for name, ids in slices.items():
        subset = [r for r in scorable if r['case_id'] in set(ids)]
        groups[name] = {'cases': len(subset), **{arm: sum(r['decisions'][arm] for r in subset) for arm in counts}}
    flags = []
    for kind, metrics in [('pair', per_pair), ('group', groups)]:
        for name, values in metrics.items():
            if values['cases'] >= 20 and 100 * (values['variant'] - values['control']) / values['cases'] < -5:
                flags.append(f'{kind}:{name}')
    coverage = {arm: sum(r['labels'][arm] != 'no_supported_match' for r in results) for arm in counts}
    warning_labels = {'no_supported_match', 'no_modern_sense_data', 'unverified_name_identity'}
    actionable = {arm: sum(r['labels'][arm] not in warning_labels for r in results) for arm in counts}
    warnings = {arm: Counter(r['labels'][arm] for r in results if r['labels'][arm] in warning_labels) for arm in counts}
    gain = 100 * (counts['variant'] - counts['control']) / len(scorable)
    generic_controls = [r for r in results if r['reference']['meaning_profile'] in {'generic_name_match_unverified', 'generic_name_overlap_unresolved'}]
    generic_flagged = all(r['labels']['variant'] == 'unverified_name_identity' for r in generic_controls)
    subset = [r for r in results if r['reference']['meaning_profile'] in {'no_observed_overlap', 'distinct_named_entity_and_common_concept'}
              and r['case_id'] in slices.get('composition_or_derivation', [])]
    compounds_flagged = all(r['labels']['variant'] not in {'equivalent', 'entity_overlap'} for r in subset)
    concept_cases = [r for r in cases if r['panel'] == 'concept']
    concept_labels = Counter(predictions[key(r['lang_a'], r['word_a'], r['lang_b'], r['word_b'])]['label'] for r in concept_cases)
    retained_inputs = digest(source / 'comparisons.json') == protocol['source_comparisons_sha256']
    assert retained_inputs
    summary = {'run_id': run_id, 'variant': variant, 'cases': 207, 'scorable': len(scorable), 'unresolved_references': 10,
        'family_groups': len(families), 'compatible_counts': counts, 'gain_percentage_points': gain,
        'paired_family_95_interval': [differences[49], differences[1949]], 'per_pair': per_pair,
        'diagnostic_groups': groups, 'confusion': confusion, 'coverage_counts': coverage,
        'actionable_coverage_counts': actionable, 'warning_counts': warnings, 'additional_comparisons': comparisons,
        'flagged_losses': flags, 'generic_name_controls': len(generic_controls), 'generic_name_controls_flagged': generic_flagged,
        'compound_controls': len(subset), 'compound_controls_flagged': compounds_flagged,
        'concept_positive_panel_label_counts': concept_labels, 'original_inputs_unchanged': retained_inputs,
        'gain_gate_met': gain >= 5 and differences[49] > 0,
        'coverage_gate_met': 100 * (actionable['variant'] - actionable['control']) / 207 >= -2,
        'beats_always_partial': counts['variant'] > counts['always_partial'],
        'limits': 'Compatibility with source-guided agent judgments, not expert accuracy. Unresolved cases remain visible. No history, display, candidate, or score changes.'}
    save_json(destination / 'case_results.json', results)
    save_json(destination / 'metrics.json', summary)
    print(json.dumps({k:v for k,v in summary.items() if k not in {'confusion','diagnostic_groups','per_pair'}}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=OUTPUT / 'e2-run001')
    parser.add_argument('--run-id', default='E2-001')
    parser.add_argument('--variant', choices=['dense', 'evidence'], default='dense')
    args = parser.parse_args()
    self_check()
    evaluate(args.output, args.run_id, args.variant)

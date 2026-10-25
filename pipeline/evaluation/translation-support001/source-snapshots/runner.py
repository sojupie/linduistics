"""Run T1-001 on frozen development records; no database or model calls."""
import argparse
from collections import Counter
import json
from pathlib import Path
import random
import sys

from pipeline.evaluation.e0 import BASELINE, OUTPUT, ROOT, digest, frozen_input_hashes, save_json
from pipeline.evaluation.e2_scope import familiar_rows, source_senses
from pipeline.evaluation.e2 import translation_sources

# The runner and source API have the same descriptive name; load the API by path.
import importlib.util
spec = importlib.util.spec_from_file_location('translation_support_api', ROOT / 'pipeline/src/translation_support.py')
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)
from meaning_profile import source_association_key


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def identity(row):
    return tuple(row[c] for c in ('lang_a', 'word_a', 'lang_b', 'word_b'))


def run(destination):
    destination.mkdir(parents=True, exist_ok=False)
    old = OUTPUT / 'e2-scope001'
    assert digest(old / 'matrix_cache.json') == read(old / 'revision/protocol.json')['matrix_cache_sha256']
    lookup = BASELINE / 'lemmas_en.parquet'
    assert digest(lookup) == frozen_input_hashes()[lookup.relative_to(ROOT).as_posix()]
    pilot_refs = {r['id']: r for r in read(old / 'references.json')['cases']}
    pilot = [r for r in read(old / 'frame.json') if r['id'] in pilot_refs]
    rows = familiar_rows() + pilot
    assert len(rows) == 1251 and len({identity(r) for r in rows}) == 1251
    sources, wanted = translation_sources(rows)
    cached = {tuple(r['words']): r for r in read(old / 'matrix_cache.json')}
    expected = {tuple(r['words']): r for n in ('diagnostic_results.json', 'sample_results.json')
                for r in read(old / 'revision' / n)}
    profiles, judgments, conflicts = [], [], []
    counts, statuses, routes = Counter(), Counter(), Counter()
    for row in rows:
        words = identity(row)
        cache = cached[words]
        associations = {tuple(a['identity_and_gloss']): a['scores'] for a in cache['associations']}
        before = json.dumps(row, sort_keys=True)
        profile = api.describe_meaning_evidence(row, sources, source_associations=associations, matrix=cache['matrix'])
        assert before == json.dumps(row, sort_keys=True), words
        # Freeze scores too: evidence never manufactures a cosine of one.
        assert cache['matrix'] == cached[words]['matrix']
        profiles.append(profile)
        counts['comparisons'] += 1
        counts['dictionary_supported'] += profile['current_dictionary_support']
        counts['lexical_supported'] += profile['current_lexical_support']
        counts['embedding_suggested'] += bool(profile['embedding_sense_suggestions'])
        supported = profile['current_dictionary_support'] or profile['current_lexical_support']
        counts['dictionary_or_lexical_supported'] += supported
        counts['supported_without_embedding_match'] += supported and not profile['embedding_sense_suggestions']
        statuses.update(link['status'] for link in profile['dictionary_links'])
        routes.update(link['route'] for link in profile['dictionary_links'])
        if words in expected:
            reference = expected[words]['reference']
            assert profile['existing_experimental_meaning_label'] == expected[words]['profiles']['variant']['label']
            compatible = bool({'equivalent', 'partial_overlap'} & set(reference['compatible_labels'])) if reference['scorable'] else None
            result = {'words': list(words), 'panel': 'pilot' if 'id' in row else 'diagnostic',
                      'support_asserted': supported, 'compatible_current_overlap': compatible, 'reference': reference}
            judgments.append(result)
            if supported and compatible is False:
                conflicts.append(result)
    low = [p for p in profiles if (p['current_dictionary_support'] or p['current_lexical_support'])
           and not p['embedding_sense_suggestions']]
    low.sort(key=lambda p: tuple(p['words']))
    sampled = random.Random(20261025).sample(low, min(12, len(low)))
    needed = {tuple(p['words']) for p in sampled} | {tuple(r['words']) for r in conflicts}
    row_map = {identity(r): r for r in rows}
    by_words = {tuple(p['words']): p for p in profiles}
    packet = []
    for words in sorted(needed):
        row = row_map[words]
        packet.append({'words': list(words), 'reason_selected': 'reference_conflict' if any(tuple(c['words']) == words for c in conflicts) else 'seeded_low_embedding_sample',
                       'senses': [json.loads(row['senses_' + side]) for side in 'ab'],
                       'evidence': by_words[words], 'reference': next((r['reference'] for r in judgments if tuple(r['words']) == words), None)})
    save_json(destination / 'profiles.json', profiles)
    save_json(destination / 'reference_results.json', judgments)
    save_json(destination / 'review_packet.json', packet)
    save_json(destination / 'metrics.json', {'counts': counts, 'link_statuses': statuses, 'routes': routes,
        'reference_panels': {panel: dict(Counter('unresolved' if r['compatible_current_overlap'] is None else
            'supported_compatible' if r['support_asserted'] and r['compatible_current_overlap'] else
            'supported_conflict' if r['support_asserted'] else 'no_support_asserted'
            for r in judgments if r['panel'] == panel)) for panel in ('diagnostic', 'pilot')},
        'requested_source_identities': len(wanted), 'resolved_source_identities': len(sources),
        'review_cases': len(packet), 'low_embedding_diagnostic_sample': len(sampled)})
    inputs = [OUTPUT / 'TRANSLATION_SUPPORT_PLAN.md', OUTPUT / 'e1-run003/comparisons.json', old / 'matrix_cache.json',
              old / 'frame.json', old / 'references.json', old / 'revision/diagnostic_results.json', old / 'revision/sample_results.json', lookup]
    code = [Path(__file__), ROOT / 'pipeline/src/translation_support.py', ROOT / 'pipeline/src/meaning_profile.py',
            OUTPUT / 'e2.py', OUTPUT / 'e2_scope.py']
    save_json(destination / 'protocol.json', {'run': 'T1-001', 'seed': 20261025,
        'inputs': {p.relative_to(ROOT).as_posix(): digest(p) for p in inputs},
        'code': {p.relative_to(ROOT).as_posix(): digest(p) for p in code},
        'preservation': 'All rows and scores read only; E2 audit labels reproduce on all 257 reviewed cases.',
        'review_limits': 'Familiar development material and source-guided judgments; no independent confirmation or population estimate.'})
    print(json.dumps(read(destination / 'metrics.json'), indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    run(parser.parse_args().output)

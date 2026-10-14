"""Frozen sense-scope pilot: prepare evidence first, score after review."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import os
from pathlib import Path
import sys

import pyarrow.parquet as pq

from pipeline.evaluation.e0 import BASELINE, DATASET, EXPECTED_HASH, OUTPUT, ROOT, digest, save_json
from pipeline.evaluation.verification import DIMENSIONS, select, prepare as prepare_review, report as report_review

sys.path.insert(0, str(ROOT / 'pipeline/src'))
sys.path.insert(0, str(OUTPUT))
from e2 import translation_sources
from meaning_profile import profile_meanings, source_association_key
from semantic_matcher import SemanticMatcher, DEFAULT_MODEL_NAME, DEFAULT_MODEL_REVISION
from sense_aligner import parse_root

SEED = 20261014
PLAN = OUTPUT / 'E2_SCOPE_PLAN.md'


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def identity(row):
    return row['lang_a'], row['word_a'], row['lang_b'], row['word_b']


def familiar_rows():
    folder = OUTPUT / 'e1-run003'
    completion = read(folder / 'completion.json')
    for name in ('comparisons.json', 'case_displays.json'):
        assert digest(folder / name) == completion['artifact_hashes'][name], f'Frozen E1 input changed: {name}'
    return read(folder / 'comparisons.json')


def source_senses(row, sources):
    return [s for ref in json.loads(row.get('translation_source_senses') or '[]')
            for s in sources.get((ref.get('source_entry_key'), ref.get('source_sense_id')), [])]


def evidence(row, sources):
    # Remove previous matching predictions, retain recorded source content.
    fields = ('gloss', 'pos', 'tags', 'is_active', 'source_entry_key', 'source_sense_id',
              'source_identity_candidates', 'etym_root', 'etym_text')
    return {'words': [row['lang_a'], row['word_a'], row['lang_b'], row['word_b']],
            'displays': [row['def_a'], row['def_b']],
            'senses': [[{k: s[k] for k in fields if k in s} for s in json.loads(row[f'senses_{side}'])]
                       for side in ('a', 'b')],
            'translation_sources': [{k: s[k] for k in fields if k in s} for s in source_senses(row, sources)]}


def prepare(directory):
    directory.mkdir(parents=True, exist_ok=False)
    assert digest(DATASET) == EXPECTED_HASH
    registry = read(OUTPUT / 'e0_families_v2.json')['groups']
    nodes = {token: (group_id, group['role']) for group_id, group in registry.items() for token in group['members']}
    familiar = {identity(row) for row in familiar_rows()}
    frame, withheld, families = [], Counter(), {}
    columns = ['lang_a', 'word_a', 'lang_b', 'word_b', 'def_a', 'def_b', 'pos_a', 'pos_b',
               'senses_a', 'senses_b', 'etym_root_a', 'etym_root_b', 'etymological_relation',
               'translation_source_senses', 'category', 'semantic_sim']
    for batch in pq.ParquetFile(DATASET).iter_batches(columns=columns, batch_size=16384):
        for row in batch.to_pylist():
            if row['lang_a'] >= row['lang_b']:
                continue
            assignments = [nodes.get(f'lex:{row["lang_"+s]}:{row["word_"+s].casefold()}') for s in ('a', 'b')]
            if any(a and a[1] != 'development' for a in assignments):
                withheld['reserved_or_mixed'] += 1
                continue
            if not all(assignments):
                withheld['unknown_assignment'] += 1
                continue
            if identity(row) in familiar:
                withheld['familiar_comparison'] += 1
                continue
            tokens = set()
            for side in ('a', 'b'):
                for sense in json.loads(row[f'senses_{side}']):
                    root = parse_root(sense.get('etym_root'))
                    if root:
                        tokens.add('root:' + ':'.join(root))
                root = parse_root(row[f'etym_root_{side}'])
                if root:
                    tokens.add('root:' + ':'.join(root))
            if any(nodes.get(t, ('', 'development'))[1] != 'development' for t in tokens):
                withheld['reserved_root'] += 1
                continue
            # A bridge has known development parents; no claim of family independence.
            family = '+'.join(sorted({a[0] for a in assignments}))
            families[family] = 'development'
            row.update(id=hashlib.sha256(json.dumps(identity(row), ensure_ascii=False).encode()).hexdigest()[:20],
                       family=family, family_parents=sorted({a[0] for a in assignments}),
                       stratum=row['lang_a'] + '-' + row['lang_b'])
            frame.append(row)
    assert len({row['id'] for row in frame}) == len(frame)
    quotas = {row['stratum']: 5 for row in frame}
    probes = [dict(id=r['id'], family=r['family'], stratum=r['stratum'],
                   control={'claims': dict.fromkeys(DIMENSIONS), 'evidence': True},
                   variant={'claims': dict.fromkeys(DIMENSIONS), 'evidence': True}) for r in frame]
    chosen, strata = select(probes, families, quotas, SEED)
    sources, wanted = translation_sources(frame)
    by_id = {r['id']: r for r in frame}
    packet = [{'id': r['id'], 'evidence': evidence(by_id[r['id']], sources)} for r in chosen]
    save_json(directory / 'frame.json', frame)
    save_json(directory / 'families.json', families)
    save_json(directory / 'evidence_packet.json', packet)
    save_json(directory / 'protocol.json', {
        'phase': 'development', 'plan_sha256': digest(PLAN), 'seed': SEED,
        'baseline_sha256': EXPECTED_HASH, 'families_sha256': digest(OUTPUT / 'e0_families_v2.json'),
        'frame_sha256': digest(directory / 'frame.json'), 'packet_sha256': digest(directory / 'evidence_packet.json'),
        'english_lemmas_sha256': digest(BASELINE / 'lemmas_en.parquet'),
        'strata': strata, 'excluded': withheld, 'frame_cases': len(frame), 'sample_cases': len(packet),
        'scope': 'Previously unreviewed comparisons in known development families only; not the whole dataset.',
        'code_sha256': digest(Path(__file__)), 'source_identity_requests': len(wanted),
    })
    save_json(directory / 'references.json', {'packet_sha256': digest(directory / 'evidence_packet.json'),
        'reviewer': 'source-guided agent; not human gold',
        'cases': [{'id': r['id'], 'compatible_labels': [], 'scorable': None,
                   'display_status': '', 'candidate_note': '', 'history_note': '', 'reason': ''} for r in packet]})
    print(json.dumps({'frame': len(frame), 'sample': len(packet), 'strata': strata, 'excluded': withheld}, indent=2))


def score(directory):
    protocol = read(directory / 'protocol.json')
    assert digest(PLAN) == protocol['plan_sha256']
    assert digest(DATASET) == protocol['baseline_sha256']
    assert digest(directory / 'frame.json') == protocol['frame_sha256']
    assert digest(directory / 'evidence_packet.json') == protocol['packet_sha256']
    assert digest(OUTPUT / 'e0_families_v2.json') == protocol['families_sha256']
    assert digest(BASELINE / 'lemmas_en.parquet') == protocol['english_lemmas_sha256']
    references = read(directory / 'references.json')
    assert references['packet_sha256'] == protocol['packet_sha256']
    assert {r['id'] for r in references['cases']} == {r['id'] for r in read(directory / 'evidence_packet.json')}
    assert all(type(r['scorable']) is bool and r['reason'] and r['candidate_note'] and r['history_note'] and
               r['display_status'] in ('supported', 'contradicted', 'unresolved') and
               (not r['scorable'] or r['compatible_labels']) for r in references['cases'])
    familiar = familiar_rows()
    pilot = read(directory / 'frame.json')
    rows = familiar + pilot
    sources, _ = translation_sources(rows)
    matcher = SemanticMatcher()
    glosses = set()
    for row in rows:
        row['translations'] = source_senses(row, sources)
        row['parsed'] = [json.loads(row[f'senses_{s}']) for s in ('a', 'b')]
        glosses.update(s['gloss'] for side in row['parsed'] for s in side)
        glosses.update(s['gloss'] for s in row['translations'])
    print(f'Encoding {len(glosses)} glosses with the pinned model on CPU.', flush=True)
    matcher.preencode_glosses(sorted(glosses))
    predictions, cache = {}, []
    for row in rows:
        a, b = row['parsed']
        vectors = [matcher.encode([s['gloss'] for s in side]) for side in (a, b)]
        matrix = row.get('matrix')
        if matrix is None:
            matrix = (vectors[0] @ vectors[1].T).tolist()
        associations = {source_association_key(s): [(matcher.encode([s['gloss']])[0] @ v.T).tolist()
                                                   for v in vectors] for s in row['translations']}
        arguments = dict(evidence_mode=True, lang_a=row['lang_a'], lang_b=row['lang_b'], translation_evidence=row['translations'])
        control = profile_meanings(a, b, matrix, row['word_a'], row['word_b'], **arguments)
        variant = profile_meanings(a, b, matrix, row['word_a'], row['word_b'], sense_scoped=True,
                                   source_associations=associations, scope_policy='gate', **arguments)
        predictions[identity(row)] = {'control': control, 'variant': variant}
        cache.append({'words': identity(row), 'matrix': matrix,
                      'associations': [{'identity_and_gloss': k, 'scores': v} for k, v in associations.items()]})
    old = read(OUTPUT / 'e2-run002/case_results.json')
    diagnostic = []
    for row in old:
        p = predictions[identity(row)]
        assert p['control'] == row['meaning_profile'], ('Control changed', identity(row))
        reference = row['reference']
        diagnostic.append({'case_id': row['case_id'], 'words': identity(row), 'reference': reference,
                           'profiles': p, 'decisions': {v: p[v]['label'] in reference['compatible_labels']
                                                       if reference['scorable'] else None for v in p}})
    reference_by_id = {r['id']: r for r in references['cases']}
    sample = []
    for row in pilot:
        if row['id'] in reference_by_id:
            p = predictions[identity(row)]
            reference = reference_by_id[row['id']]
            sample.append({'id': row['id'], 'words': identity(row), 'stratum': row['stratum'],
                           'profiles': p, 'reference': reference,
                           'decisions': {v: p[v]['label'] in reference['compatible_labels']
                                         if reference['scorable'] else None for v in p}})
    save_json(directory / 'matrix_cache.json', cache)
    save_json(directory / 'diagnostic_results.json', diagnostic)
    save_json(directory / 'sample_results.json', sample)
    metrics = {}
    for name, values in [('diagnostic', diagnostic), ('pilot', sample)]:
        metrics[name] = {'cases': len(values), 'scorable': sum(r['decisions']['control'] is not None for r in values),
                         'compatible': {v: sum(r['decisions'][v] is True for r in values) for v in ('control', 'variant')},
                         'changed': sum(r['profiles']['control']['label'] != r['profiles']['variant']['label'] for r in values),
                         'gains': sum(r['decisions']['control'] is False and r['decisions']['variant'] is True for r in values),
                         'losses': sum(r['decisions']['control'] is True and r['decisions']['variant'] is False for r in values)}
    metrics['preservation'] = {'concept_comparisons': sum(r['panel'] == 'concept' for r in read(OUTPUT / 'e1-run003/case_displays.json')),
                               'candidate_display_history_inputs_unchanged': True,
                               'live_database_changed': False}
    metrics['limits'] = 'Pilot frame only; first agent review; no reserved confirmation or automatic adoption.'
    save_json(directory / 'metrics.json', metrics)
    save_json(directory / 'scoring_protocol.json', {'model': DEFAULT_MODEL_NAME, 'revision': DEFAULT_MODEL_REVISION,
        'references_sha256': digest(directory / 'references.json'), 'meaning_code_sha256': digest(ROOT / 'pipeline/src/meaning_profile.py'),
        'runner_sha256': digest(Path(__file__)), 'matrix_cache_sha256': digest(directory / 'matrix_cache.json')})
    print(json.dumps(metrics, indent=2))


def revise(directory):
    """Use the frozen matrices and judgments; no re-encoding or reference changes."""
    output = directory / 'revision'
    output.mkdir()
    protocol = read(directory / 'protocol.json')
    scoring = read(directory / 'scoring_protocol.json')
    assert digest(directory / 'matrix_cache.json') == scoring['matrix_cache_sha256']
    assert digest(directory / 'references.json') == scoring['references_sha256']
    assert digest(directory / 'frame.json') == protocol['frame_sha256']
    assert digest(DATASET) == protocol['baseline_sha256']
    assert digest(BASELINE / 'lemmas_en.parquet') == protocol['english_lemmas_sha256']
    assert digest(OUTPUT / 'e0_families_v2.json') == protocol['families_sha256']
    pilot = read(directory / 'frame.json')
    familiar = familiar_rows()
    sources, _ = translation_sources(familiar + pilot)
    cache = {tuple(r['words']): r for r in read(directory / 'matrix_cache.json')}
    predictions = {}
    for row in familiar + pilot:
        saved = cache[identity(row)]
        associations = {tuple(v['identity_and_gloss']): v['scores'] for v in saved['associations']}
        arguments = dict(evidence_mode=True, lang_a=row['lang_a'], lang_b=row['lang_b'],
                         translation_evidence=source_senses(row, sources))
        a, b = [json.loads(row[f'senses_{s}']) for s in ('a', 'b')]
        predictions[identity(row)] = {
            'control': profile_meanings(a, b, saved['matrix'], row['word_a'], row['word_b'], **arguments),
            'variant': profile_meanings(a, b, saved['matrix'], row['word_a'], row['word_b'],
                                       **arguments, sense_scoped=True, source_associations=associations, scope_policy='audit')}
    metrics = {}
    for name in ('diagnostic', 'sample'):
        original = read(directory / (name + '_results.json'))
        results = []
        for record in original:
            p = predictions[tuple(record['words'])]
            assert p['control'] == record['profiles']['control']
            ref = record['reference']
            decisions = {v: p[v]['label'] in ref['compatible_labels'] if ref['scorable'] else None for v in p}
            results.append(record | {'profiles': p, 'decisions': decisions})
        metrics[name] = {'cases': len(results), 'scorable': sum(r['decisions']['control'] is not None for r in results),
            'compatible': {v: sum(r['decisions'][v] is True for r in results) for v in ('control', 'variant')},
            'changes': sum(r['profiles']['control']['label'] != r['profiles']['variant']['label'] for r in results),
            'gains': sum(r['decisions']['control'] is False and r['decisions']['variant'] is True for r in results),
            'losses': sum(r['decisions']['control'] is True and r['decisions']['variant'] is False for r in results)}
        save_json(output / (name + '_results.json'), results)
    save_json(output / 'metrics.json', metrics)
    save_json(output / 'protocol.json', {'revision_plan_sha256': digest(OUTPUT / 'E2_SCOPE_REVISION_PLAN.md'),
        'original_protocol_sha256': digest(directory / 'protocol.json'), 'matrix_cache_sha256': scoring['matrix_cache_sha256'],
        'references_sha256': scoring['references_sha256'], 'code_sha256': digest(ROOT / 'pipeline/src/meaning_profile.py'),
        'runner_sha256': digest(Path(__file__)), 'scope': 'Exploratory follow-up on unchanged sample and references; not adopted.'})

    # Reuse the formal review/report tool, with the full frozen frame and original weights.
    frame = []
    for row in pilot:
        p = predictions[identity(row)]
        source = evidence(row, sources)
        arms = {version: {'evidence': source, 'claims': dict.fromkeys(DIMENSIONS)} for version in p}
        for version, profile in p.items():
            arms[version]['claims']['meaning'] = profile['label'] if profile['label'] != 'no_modern_sense_data' else None
            arms[version]['claims']['display'] = 'An ordinary useful paired headline for these words.'
        frame.append(dict(id=row['id'], family=row['family'], stratum=row['stratum'], **arms))
    save_json(output / 'review_frame.json', frame)
    families = directory / 'families.json'
    plan_inputs = {'frame': output / 'review_frame.json', 'families': families,
                   'original_plan': PLAN, 'revision_plan': OUTPUT / 'E2_SCOPE_REVISION_PLAN.md',
                   'references': directory / 'references.json', 'matrix_cache': directory / 'matrix_cache.json'}
    save_json(output / 'review_plan.json', dict(phase='development', seed=SEED,
        hypothesis='Reject explicit source usage/grammar conflicts without vetoing weakly embedded translations.',
        measures=['meaning', 'display'], tradeoffs='Preserve useful overlap; disclose unresolved or absent claims.',
        decision_rule='Exploratory pilot only; inspect all losses before extending; no automatic adoption.',
        rubric=read(directory / 'references.json')['rubric'],
        quotas={name: s['n'] for name, s in protocol['strata'].items()},
        inputs={name: {'path': os.path.relpath(path, output), 'sha256': digest(path)} for name, path in plan_inputs.items()}))
    prepare_review(output / 'review_plan.json', output / 'review')
    audit = read(output / 'review/audit.json')
    references = {r['id']: r for r in read(directory / 'references.json')['cases']}
    assert {r['id'] for r in audit['cases']} == references.keys()
    facts = read(output / 'review/facts.json')
    facts['reviewer'] = dict(name='Codex source-guided first review', kind='agent', date='2026-10-14')
    for item in facts['observations']:
        ref = references[item['id']]
        item['observation'] = ref['reason'] + ' Candidate: ' + ref['candidate_note'] + ' History: ' + ref['history_note']
    # These observations were frozen before prediction, not generated from arm correctness.
    (output / 'review/facts.json').write_text(json.dumps(facts, ensure_ascii=False, indent=2) + '\n')
    review = read(output / 'review/review.json')
    review['reviewer'] = facts['reviewer']
    review['facts_sha256'] = digest(output / 'review/facts.json')
    packet = {r['id']: r for r in read(output / 'review/packet.json')}
    for item in review['judgments']:
        ref = references[item['id']]
        claim = packet[item['id']]['arms'][item['arm']]['claims'][item['dimension']]
        if claim is None:
            status = 'not_applicable'
        elif item['dimension'] == 'display':
            status = ref['display_status']
        else:
            status = ('supported' if claim in ref['compatible_labels'] else 'contradicted') if ref['scorable'] else 'unresolved'
        item.update(status=status, reason=ref['reason'] if claim is not None else 'No claim made in this dimension of the meaning experiment.')
    (output / 'review/review.json').write_text(json.dumps(review, ensure_ascii=False, indent=2) + '\n')
    report_review(output / 'review', output / 'review/review.json', output / 'weighted_report.json')
    print(json.dumps(metrics, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('prepare', 'score', 'revise'))
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    {'prepare': prepare, 'score': score, 'revise': revise}[args.command](args.directory)

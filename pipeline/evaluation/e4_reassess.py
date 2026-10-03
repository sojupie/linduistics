"""Separate candidate support from fixed-label agreement in the saved E4 cases."""
import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path

from e0 import OUTPUT, digest, read_csv, save_json


GROUPS = {
    'meaning_overlap': 'ordinary_overlap ordinary_partial_overlap ordinary_overlap_source_gap ordinary_overlap_specialized_display_unresolved contextual_partial_overlap regional_overlap regional_partial_overlap material_use_partial_overlap secondary_overlap specialized_overlap specialized_overlap_source_gap',
    'related_grammar_or_concepts': 'related_meaning_different_pos related_meaning_not_equivalent related_meaning_not_equivalent_source_gap',
    'verified_entity_or_recorded_name_forms': 'same_named_entity same_named_entity_partial_overlap same_named_entity_partial_profile related_name_forms related_name_forms_recorded',
    'different_entities': 'different_named_entities distinct_named_entities distinct_named_entity_and_common_concept',
    'unverified_names': 'generic_name_match_unverified generic_name_overlap_unresolved',
    'disjoint_observed': 'disjoint_observed no_observed_overlap',
    'inactive_or_historical_only': 'historical_overlap_only inactive_overlap no_active_overlap_observed',
    'unresolved': 'contextual_overlap_unresolved forwarding_entry_unresolved specialized_overlap_unresolved',
}
PROFILE_GROUP = {p: g for g, profiles in GROUPS.items() for p in profiles.split()}
assert len(PROFILE_GROUP) == sum(len(p.split()) for p in GROUPS.values())

# These support notes are source-review assessments, not population gold labels.
# Other disjoint cases remain possible surface contrasts with unverified history.
SUPPORT_NOTES = {
    ('logik', 'logi'): 'Plausible deceptive contrast: logic and lodging have close forms and distinct recorded meanings. Whole-word historical independence is not established.',
    ('Synapse', 'synse'): 'Potential surface contrast with different grammar: synapse versus opinion-giving. A Norwegian derivation does not establish the complete German history.',
    ('glutaric', 'glutamin'): 'Specialist contrast: acid-related adjective versus glutamine noun. Technical resemblance does not establish equivalent chemistry or useful general-vocabulary confusion.',
    ('Helix', 'helig'): 'Potential form contrast: helix versus holy. Only the Swedish Germanic history is supplied; unrelated whole-word ancestry remains unproven.',
    ('part', 'par'): 'Plausible short-form contrast: portion or role versus pair or golf par. Shared associations with quantities are not equivalent meanings.',
    ('fond', 'font'): 'Plausible deceptive contrast: fund versus font. History on only one side cannot establish independent origins.',
    ('drita', 'drista'): 'Potential deceptive contrast with grammar restriction: drunk versus dare. The supplied Swedish derivation alone does not resolve both histories.',
    ('fortale', 'forta'): 'Potential form contrast: wrong-word slip versus hurrying. Danish foreword is a different entry and must not be used to supply the selected sense.',
    ('Stiel', 'still'): 'Potential deceptive contrast with different grammar: stem or handle versus still. Form resemblance does not establish meaning overlap.',
    ('pulsering', 'pulverig'): 'Weak broad candidate support: pulsation versus powdery share initial letters and differ in grammar; no meaning or whole-word historical connection is supplied. Learner confusion is unmeasured.',
    ('rendern', 'renter'): 'Potential deceptive contrast: rendering versus repairing tapestry or a property renter. A borrowing from render does not establish descent from renter.',
    ('skudår', 'skulder'): 'Potential short-form contrast: leap year versus shoulder. No common sense or whole-word history is supplied; practical confusion remains unmeasured.',
    ('Chromatin', 'chrismation'): 'Specialist cross-domain contrast: chromatin versus chrismation. Different supplied Greek elements do not prove independent complete ancestry; general-game suitability is unverified.',
    ('lind', 'lina'): 'Potential short-form contrast with grammar restriction: gentle versus rope or line. The Swedish given name belongs to another entry.',
    ('indio', 'indigo'): 'Potential deceptive contrast: indigenous-person/place descriptions versus colour or dye. Entity scope and whole-word history need separate handling.',
    ('uden', 'enn'): 'Weak modern counterpart: the supplied function-word meanings differ and the forms provide little deceptive resemblance; no independent translation support is shown.',
    ('verletzen', 'invadera'): 'Weak modern counterpart: causing injury can accompany invasion, but the supplied verbs are neither equivalent nor deceptively similar.',
    ('Obersattel', 'mutter'): 'Poor translation comparison: different objects share the English word nut. This is an explicit polysemy trap, not support for the source words as counterparts.',
    ('blunt', 'stump'): 'Weak translation support: bluntness and a stump are associated concepts with different observed meanings and little form resemblance.',
    ('gen', 'gen'): 'Entry-identity problem: Danish noun gene borrows German Gen, while the selected German entry is dated directional gen. Case and entry distinctions matter.',
    ('band', 'bindel'): 'Potential deceptive contrast: borrowed musical band versus strap; deeper binding history is unresolved.',
    ('bengalrev', 'bengalen'): 'Component-only association: Bengal region plus fox does not establish full-word equivalence. Name versus species adds a task restriction.',
    ('antipain', 'antipapist'): 'Component-only association: anti- does not connect the complete meanings. A contrast is observable, but ordinary learner confusion is unverified.',
    ('bakke', 'bakluke'): 'Component/entry ambiguity: a possible back-like component does not connect the selected tray and the complete tailgate compound.',
    ('underviser', 'underside'): 'Component-only association: under-like forms do not establish teacher/underside equivalence or full-word history.',
    ('Nordost', 'nordkyst'): 'Component-only association: north is shared, but northeast and north coast differ; any whole-word-family use needs stronger evidence.',
    ('underlag', 'underdog'): 'Component-only association: under does not establish equivalence or shared whole-word descent.',
    ('sommerhus', 'sommerfugl'): 'Component-only association: summer is shared, but summerhouse and butterfly are distinct compounds.',
    ('magneton', 'magnetit'): 'Technical contrast with component/topic association; magnetic-moment unit and mineral are not equivalents. Specialist task usefulness is unverified.',
    ('kreatur', 'kreager'): 'Weak identity support: livestock and a generic surname have neither a shared meaning nor an established name identity.',
    ('Message', 'messene'): 'Weak identity support: a message and a named Greek city have different domains; common initial spelling is not an entity relation.',
    ('platea', 'platta'): 'Name/common-word contrast: Pennsylvania borough versus flat object or record. Neither equivalent identity nor full-word history is established.',
    ('Alexandrit', 'alexander'): 'Name/technical contrast: mineral versus given name; a shared Alexander-like element is not a documented whole-word path here.',
    ('margarine', 'margaric'): 'Source records a shared ultimate Greek form, while modern spread and adjective meanings differ. This is a historically informative contrast, not modern equivalence.',
    ('Feminat', 'femina'): 'Source records Latin femina on both sides, but committee and feather meanings differ; retain shared-source scope rather than assert identical transmission.',
    ('blive', 'blive'): 'Source explicitly connects drown to remain-at-sea. This is an informative historical/modern contrast despite no ordinary equivalence.',
    ('ball', 'balle'): 'Source explicitly records common balluz ancestry for the relevant entries and differing current meanings; a potentially useful related false-friend contrast.',
    ('lune', 'Luna'): 'Source records a shared lunar source for mood versus deity/name; historically informative with name and homograph scope restrictions.',
    ('malmen', 'malme'): 'Source records connected malmaz history, but tooth grinding and heartwood differ in grammar and meaning.',
    ('malme', 'malm'): 'Source records shared malmaz history, while current heartwood and ore/urban/military meanings differ.',
}


def summarize(cases):
    result = {}
    for arm, retained in [('removed', False), ('retained', True)]:
        counts = defaultdict(Counter)
        for c in cases:
            if c['retained_A'] != retained:
                continue
            outcome = ('unresolved_label_reference' if c['compatible'] is None else
                       'compatible_label' if c['compatible'] else 'wrong_label')
            counts[c['support_group']][outcome] += 1
        result[arm] = {g: {'cases': sum(counts[g].values()), **dict(counts[g])} for g in GROUPS}
    return result


def run(destination):
    destination.mkdir(exist_ok=False)
    source = OUTPUT / 'e4-a002'
    opened = json.loads((source / 'open_results.json').read_text())
    assert len(opened) == len({c['case_id'] for c in opened}) == 207
    for c in opened:
        c['support_group'] = PROFILE_GROUP[c['reference']['meaning_profile']]
        if c['support_group'] == 'disjoint_observed':
            c['support_review'] = SUPPORT_NOTES[c['word_a'], c['word_b']]
        else:
            c['support_review'] = c['reference']['reference_reason']
    concepts = json.loads((source / 'concept_results.json').read_text())
    reference = {c['case_id']: c for c in read_csv(OUTPUT / 'e0_concept_cases.csv')}
    decisions = {c['case_id']: c['decisions']['control'] for c in
                 json.loads((OUTPUT / 'e1-run003/concept_case_results.json').read_text())}
    lost = [{**c, 'history_reference': reference[c['case_id']]['history_reference'],
             'baseline_display_decision': decisions.get(c['case_id'], 'not_reviewed')}
            for c in concepts if c['control'] and not c['A']]
    assert len(lost) == 9
    historical = {}
    for status in ['same_expert_set', 'different_expert_sets', 'not_annotated']:
        subset = [c for c in concepts if reference[c['case_id']]['history_reference'] == status]
        historical[status] = dict(expected=len(subset), control_found=sum(c['control'] for c in subset),
                                  retained_found=sum(c['A'] for c in subset))
    grouped = summarize(opened)
    assert sum(g['cases'] for a in grouped.values() for g in a.values()) == 207
    result = dict(groups=grouped, by_pair={p: summarize([c for c in opened if c['pair'] == p])
                 for p in sorted({c['pair'] for c in opened})}, independent_history_panel=historical,
                 lost_expected_comparisons=lost,
                 limits='Frozen stratified diagnostic sample and source-guided agent meaning reviews; not independent candidate-quality gold or population precision. Expert same-set positives are limited to reference concepts.')
    save_json(destination / 'results.json', result)
    save_json(destination / 'case_results.json', opened)
    save_json(destination / 'protocol.json', dict(code_sha256=digest(Path(__file__)),
        plan_sha256=digest(OUTPUT / 'E4_REASSESSMENT_PLAN.md'),
        adoption_policy_sha256=digest(OUTPUT / 'ADOPTION_CRITERIA_V2.md'),
        input_hashes={str(p.relative_to(OUTPUT)): digest(p) for p in
            [source / 'open_results.json', source / 'concept_results.json', OUTPUT / 'e0_concept_cases.csv',
             OUTPUT / 'e1-run003/concept_case_results.json']},
        scope='All original E4 development open cases and concept cases; no reserved predictions.',
        original_decision_preserved=True, original_judgments_changed=False))
    lines = ['# E4 reassessment: every removed and retained open case', '',
             'Support and fixed-label agreement are separate. Original source-review reasons remain unchanged.', '',
             '| Words | Arm | Support group | Fixed label agrees? | Original meaning reason | Support assessment |',
             '| --- | --- | --- | --- | --- | --- |']
    for c in opened:
        cells = [f"{c['word_a']} / {c['word_b']} ({c['pair']})", 'Retained' if c['retained_A'] else 'Removed',
                 c['support_group'], 'Unresolved' if c['compatible'] is None else 'Yes' if c['compatible'] else 'No',
                 c['reference']['reference_reason'], c['support_review']]
        lines.append('| ' + ' | '.join(str(v).replace('|', '/') for v in cells) + ' |')
    (destination / 'CASES.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(json.dumps(dict(groups=grouped, independent_history_panel=historical,
                         lost_history=dict(Counter(c['history_reference'] for c in lost))), indent=2))


if __name__ == '__main__':
    test = summarize([dict(retained_A=False, compatible=False, support_group='meaning_overlap')])
    assert test['removed']['meaning_overlap'] == {'cases': 1, 'wrong_label': 1}
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=OUTPUT / 'e4-reassessment001')
    run(parser.parse_args().output)

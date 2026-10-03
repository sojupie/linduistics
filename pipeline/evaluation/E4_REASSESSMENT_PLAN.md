# E4 reassessment plan

Recorded after adoption-policy commit `e31534b`, before calculating the new
group counts. This is a post-result development reassessment, not a new blinded
experiment. The original E4-A002 results remain unchanged.

## Fixed inputs and grouping

Use `e4-a002/open_results.json` for all 207 development cases and their frozen
meaning reviews. Use `e4-a002/concept_results.json` for independent expected-pair
retrieval, including original missing cases. Resolve expert-set references from
`e0_concept_cases.csv`. Read no reserved-family predictions or judgments.

Group meaning profiles as follows before scoring counts. These groups describe
the support for a comparison, not whether its existing classifier label is right.

| Group | Frozen profiles |
| --- | --- |
| Meaning overlap | ordinary_overlap; ordinary_partial_overlap; ordinary_overlap_source_gap; ordinary_overlap_specialized_display_unresolved; contextual_partial_overlap; regional_overlap; regional_partial_overlap; material_use_partial_overlap; secondary_overlap; specialized_overlap; specialized_overlap_source_gap |
| Related grammar or concepts | related_meaning_different_pos; related_meaning_not_equivalent; related_meaning_not_equivalent_source_gap |
| Verified entity or recorded name-form relation | same_named_entity; same_named_entity_partial_overlap; same_named_entity_partial_profile; related_name_forms; related_name_forms_recorded |
| Different entities | different_named_entities; distinct_named_entities; distinct_named_entity_and_common_concept |
| Unverified names | generic_name_match_unverified; generic_name_overlap_unresolved |
| Disjoint observed meanings | disjoint_observed; no_observed_overlap |
| Inactive or historical-only support | historical_overlap_only; inactive_overlap; no_active_overlap_observed |
| Unresolved meanings or forwarding entries | contextual_overlap_unresolved; forwarding_entry_unresolved; specialized_overlap_unresolved |

Assert complete mapping and unique case identities. Cross-tabulate each group
by removed/retained and label-compatible/incompatible/unresolved. Also report
language pairs separately. Do not pool the stratified diagnostic sample into a
population precision estimate.

## Case review and historical scope

Preserve every source-review reason. For every disjoint case, assess the specific
evidence independently of the classifier: recorded historical connection,
plausible deceptive form, component-only association, a polysemous translation
trap, or unresolved whole-word history. These are support flags, not a binary
valid/invalid gold label. One case may have more than one flag.

A real modern contrast with close forms can be useful even without known
ancestry. Different meanings with distant forms and a known polysemous bridge
are weak support for a bilingual counterpart. Generic name descriptions are
insufficient evidence of identity. Component overlap does not establish whole-
word cognacy, but does not by itself make a surface contrast useless. Record
task restrictions instead of excluding all names, technical terms or old words.

For the nine lost expected comparisons, report their independent concept and
expert-set relation and any baseline wrong meaning/label separately. Report
same-expert-set coverage over all development reference cases before and after
removal. Different expert sets are not negative historical truth. Do not infer
modern full overlap from same-set cognacy.

## Decision rule

Use `ADOPTION_CRITERIA_V2.md`. Neither fixed-label agreement nor table size
decides whether removal improves candidate quality. If this diagnostic review
shows losses of supported pairs together with removal of weak pairs, record
the trade-off and the limits. Do not adopt a newly invented selective policy
without a separate planned test. A changed judgment requires a saved reason;
do not overwrite the original meaning reference or outcome.

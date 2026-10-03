# E3: recover typed historical relationships

Fixed on branch `e3`, 2026-10-03, before implementing or scoring the historical-link variant.

## Hypothesis

Recorded inheritance, borrowing, and cognate statements recover historical relationships missed by normalized root equality. Entry identity and relation type prevent a shared component or unrelated homograph from becoming an inherited whole-word claim.

## Fixed inputs and control

Use the original E1-003 comparison rows and source identities, the five-language lemma lookups, and existing normalized source etymology records. Hash every source artifact used. Preserve the baseline meanings, displayed definitions, scores, candidates, and categories. Neither E1 nor E2 adopted a replacement method.

The source file is `pipeline/data/reproduce-five-language-20261002/etymology_records.jsonl`, from the reproduced baseline. Index its exact entry identities and forms; load development endpoint records and uniquely resolved transmission ancestors. Inspect no reserved comparison or review case. Record a missing ancestor as a terminal recorded form, distinct from a resolved ancestor entry.

Evaluate all 207 open-vocabulary development cases. Keep their frozen historical review reasons visible, including uncertain judgments. Use the 995 concept cases separately for historical agreement checks; concept equivalence is not proof of shared ancestry. Do not open reserved test families.

The control is normalized root equality from `classifier.etymological_relation`. A matching root establishes only a recorded shared root for this comparison; it does not distinguish borrowing from uninterrupted inheritance. Missing or unequal roots remain unknown.

## Variant

1. Reuse the existing extraction and attached-claim formats. Match source records to exact entry identities. Preserve alternative source identities as ambiguous; do not choose the first record or lowercase distinct German entries together.
2. Accept typed inheritance and borrowing records as directed historical links. Accept explicit cognate statements as recorded pair relationships, without inventing an inheritance path. Keep uncertainty markers and source references on every link.
3. Keep generic derivation, composition, calque, and semantic-loan statements separate. They may establish a related formation or component, but do not alone prove inherited whole-word cognacy. Retain broad `derived_from` statements as source relationships whose transmission type is unspecified.
4. Compare direct links and shared recorded ancestors. Traverse only links whose target identity can be resolved without a homograph choice. Preserve all path types and evidence. Stop a path at an unavailable ancestor rather than inventing an intermediate step.
5. Distinguish inherited paths, borrowing paths, explicit cognate statements, shared sources with unspecified transmission, component relationships, and unresolved relationships. Missing paths never establish unrelatedness. Do not infer attested history from meaning or spelling similarity.
6. Do not let a graph link from one entry establish history for every sense or homograph of its headword. Report entry-scoped alternatives when pair-level history is ambiguous.

## Review and measurements

Before scoring, save the historical-reference mapping from the existing E0 review fields. Preserve each review's original reason. Separate source-supported judgments from inferred or unresolved ones; an inferred judgment is not independent proof of a new path.

`e3_reference.json` freezes all 207 review reasons, 60 source-supported positive-history cases, and 19 component controls. These flags identify recovery candidates for inspection; they do not automatically validate a new path or its transmission type. Report all new relationships outside those positives as well.

Report root-control support, new typed relationships, unresolved identities and ancestors, uncertain source claims, and conflicts by language pair. Inspect every newly recovered relationship against its retained records and every new whole-word claim in the compound, borrowing, and homograph groups. Include failed retrievals, not only successful examples.

The saved E0 gate requires at least five additional reviewed, source-supported relationships across at least two language pairs, with no false path in the reviewed controls. Each new path must retain entry identity, relation types, and source evidence. Do not count a renamed root match, an inferred family, or a shared component as a recovered attested whole-word relationship.

Run small checks for inheritance, shared borrowing, different ancestor depths, unresolved targets, ambiguous entries, cycles, and component-only overlap. Reproduce saved predictions from the same inputs. A source-based development pass does not establish a population false-link rate or independence from the dictionary being evaluated.

## Deliverables and decision

Save the protocol, reference mapping, executable variant, per-case evidence, readable report, and reproduction proof. Record adopt, revise, or reject with the measured gains and losses. No live database or production pipeline wiring changes during this experiment. Continue E4 independently after recording E3's result.

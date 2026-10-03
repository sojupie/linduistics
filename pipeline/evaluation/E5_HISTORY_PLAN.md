# E5 historical evidence evaluation

Recorded before evaluating historical paths on the eleven new-language
development pairs. Use the unchanged E3 source-scoped relationship method with
its broad shared-source option. This is an evidence evaluation, not a replacement
classifier. The revised adoption policy applies; no new numeric pass threshold
is introduced.

## Scope and controls

Use only the frozen development concept packets and open samples already
reviewed. Keep missing independently expected concept pairs in the retrieval
denominator. Use IE-CoR's saved same-expert-set annotations as limited positive
cognacy evidence. Different sets do not establish independent origins. Inspect
no reserved predictions or judgments.

Verify review-packet hashes and the combined old/new source-record hash. Reuse
`e3.source_records`, `e3.entry_keys` and `historical_links.historical_relationships`.
Preserve entry case, relation type, source uncertainty and every evidence path.
Do not infer transmission from modern meaning or a shared compound component.

Evaluate two scopes separately:

1. Only the source entries selected for the displayed senses. Resolve no missing
   identity by guessing among candidate entries.
2. All exact source entries in the two inventories. A relationship in this scope
   is a possible entry-level correspondence, not proof that it applies to the
   displayed senses or to all uses of the headwords.

Save uncertain paths, unavailable or ambiguous identities, excluded formation
claims and component-only paths. Broad `derived_from` sources remain distinct
from documented inheritance or explicit cognate statements. Borrowing paths
remain distinct from inheritance. Source uncertainty must remain attached even
when a positive expert annotation exists.

## Measures and interpretation

Report each pair's independent same-set expected pairs, retrieved pairs, suitable
displays and supported historical-path counts. For all inventory and selected
entry scopes, separate inherited/cognate-statement support, borrowing-related
support, unspecified shared-source support, component support and no recovered
path. These may overlap and do not sum to a single accuracy score.

For the open sample, retain its modern meaning judgment and fixed label
agreement separately. Classifier root equality and stored origin may be compared
with new evidence, but missing paths are not negative historical truth. Save
every new non-component supported path for source review, including source
qualification and potential homograph ambiguity.

Review paths whose source support conflicts with the independently annotated
concept relation or whose displayed meaning is wrong. Do not assume every such
case is a false graph edge: the reference may cover a different sense or the
source may record a loan rather than inherited cognacy. Record the specific
claim and its scope before drawing a conclusion.

An absence of recoverable structured paths does not require discarding useful
inference or labeling the words unclassified. This experiment measures the
recorded evidence layer. The separately reviewed modern meaning results remain
usable and the practical classifier remains unchanged.

## Deliverables

Save code/input hashes, both source scopes, all case results, per-pair measures
and a readable account of recovered evidence, unresolved scope and limits.
Complete source review of new supported paths before claiming their correctness
or game eligibility. No live database writes or production changes.

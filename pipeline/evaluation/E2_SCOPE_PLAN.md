# E2-003: scope dictionary evidence to endpoint meanings

Frozen 2026-10-14 before implementing or scoring this variant. Offline pilot;
no publication and no reserved-family review. This follows ADOPTION_CRITERIA_V2
and docs/DATASET_VERIFICATION.md; the old five-point gates do not decide adoption.

## Hypothesis and change

An English translation source can describe the wrong sense of either endpoint.
Checking its entry identity, grammar, usage and meaning against both inventories
will remove some unsupported overlap claims without losing most useful overlap.

Keep candidate membership, displays, original dense matrices, dense thresholds,
history and source records fixed. Compare E2-002 with the scoped variant. Preserve
the legacy, dense-only and always-partial results as additional diagnostics.

For a source-sense translation link, identify the precise English entry and sense.
When English is an endpoint, require that identity in its sense or recorded merged
identity candidates; same spelling alone cannot choose a homograph. On the other
endpoint(s), require a usable modern grammatical match and gloss association to
that source meaning. Use the existing 0.60 association threshold for this extra
check, not a newly tuned value. Record accepted endpoint indices, source identity,
association values, usage restrictions and reasons for rejected links.

Matching short translations remain inferred overlap, not ancestry or exhaustive
equivalence. Record the actual sense indices for shared lexical alternatives and
English headword aliases. Preserve narrower, regional and secondary modern senses.
Absent or rejected dictionary evidence leaves the existing dense inference path
available; it must not force an other/unclassified category. Do not change name
identity logic or promote word-level hints into full equivalence.

## Evaluation fixed before results

1. Reuse all 207 old development open cases, including ten unresolved references,
   as diagnostics. Report every label change, gain and loss against E2-002, not
   just improvement over the legacy classifier. Review each changed case from
   its recorded definitions and source evidence. Preserve original judgments.
2. Keep all 995 found development IE-CoR comparisons in the preservation check.
   Retrieval and display cannot improve in this experiment because neither is
   changed. Report their preservation separately from meaning classification.
3. Freeze an unseen pilot sample before generating variant predictions. The frame
   is canonical five-language comparisons whose endpoints belong to known frozen
   development families, excluding all comparisons used by E1/E2. Withhold cases
   with any known reserved root in the full sense inventories. Use exact case-
   preserving comparison identities. Unknown lexical assignments remain excluded.
4. Sample five rows per undirected language pair, or census a smaller stratum,
   with seed 20261014. Save frame counts, identities, input hashes and N/n weights.
   Review evidence before claims. Each case needs an explicit modern meaning and
   display judgment plus candidate value and source-history limitations. Record
   source-guided agent reviews as such, not independent human gold.
5. Score both methods on exactly those cases. Report paired changes, all losses,
   unresolved bounds, per-pair counts and weights. The pilot estimates only its
   small known-development frame, not all 819,227 canonical comparisons. The
   family registry presently leaves most vocabulary unassigned; do not hide that
   coverage limit or use a row bootstrap as proof of independent family accuracy.

Cache source-gloss associations for the frozen cases using the pinned MiniLM
revision already used by E1. Use CPU and identical cache values in all variant
calculations. Original endpoint matrices remain unchanged. Fresh pilot endpoint
matrices use the same pinned model in both arms. Save model file hashes, package
versions, code hashes, matrices and the complete review inputs.

## Decision

A useful result repairs unsupported dictionary claims while retaining reasonable
modern overlap, including secondary meanings. Small gains can matter. A loss of
useful partial overlap caused solely by sparse translations counts against this
method. High diagnostic agreement alone cannot justify adopting it.

Review every changed judgment and explicit uncertainty before deciding whether
to extend, revise or defer. If the pilot cannot distinguish benefit from cost,
say so and name the additional cases or review needed. Do not retune the 0.60
check, replace judgments or change the sample to obtain a pass. Any such change
needs a new plan and separate run. Wider family assignment, independent duplicate
review and reserved-family confirmation are still required before adoption.

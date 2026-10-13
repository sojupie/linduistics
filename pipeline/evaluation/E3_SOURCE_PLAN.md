# E3-002: shared sources without invented transmission types

Fixed after inspecting E3-001 and before implementing or scoring this variant, 2026-10-03.

E3-001 recovered three source-supported open cases across three language pairs. It did not meet the five-recovery gate. It omitted shared sources recorded through broad `derived_from` claims. Inspection also found a source placeholder `-` treated as an ancestor form. Preserve the run as a diagnostic prototype, not an adopted method.

## Change and hypothesis

Add direct recorded-source comparisons without traversing broad derivation edges. Two records that explicitly name the same source can establish a shared recorded source even when the extraction cannot distinguish borrowing from inheritance. Keep the original source claims and label the transmission type unspecified. Do not promote this to inherited cognacy.

If either entry records compound, affix, blend, or another component formation, report a shared component source instead. Such a record cannot satisfy the whole-word recovery gate. Keep partial relationships useful and visible rather than discarding them or renaming them unknown.

Reject empty or punctuation-only target forms in every path. A placeholder is not an ancestor. Add a runnable check that two unrelated entries with the same placeholder do not acquire a relationship.

Keep source records, root control, reference flags, meanings, display selection, candidates, and scores fixed. Preserve source-entry scope, including name/common-word homographs. A relationship involving a name entry does not establish that the ordinary noun shares that history. Report such mismatches explicitly in concept-reference comparisons.

## Evaluation and decision

Repeat all 207 open cases and the separate 995 concept checks. Review every newly supported relationship, every component-control claim, all source-supported relationships missed by the variant, and every disagreement with expert concept groups. Unknown history remains neither a positive nor a negative reference. Count a recovery only after its retained source records support the stated relation and entry scope.

The gate remains five additional reviewed source-supported relationships across at least two pairs, with no false path introduced in reviewed controls. Component-only records, source placeholders, and renamed control-root matches do not count. Reproduce the outputs; ignore elapsed runtime when comparing metrics. Do not change published data.

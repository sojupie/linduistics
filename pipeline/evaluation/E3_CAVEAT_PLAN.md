# E3-003: retain source uncertainty on historical relationships

Fixed after inspecting E3-002's source records and before changing or scoring this variant, 2026-10-03.

The extractor preserves `source_etymology_status` as a separate claim. E3-002 retained relation-level uncertainty but did not propagate this entry-level status. A broad source mention could therefore appear confirmed even when the source explicitly marked its etymology unknown and proposed alternatives.

Attach the source etymology text and recorded unknown/uncertain status to every relationship. Include the records for both endpoints and any traversed intermediate entry. Retain possible relationships as possible evidence, rather than treating them as confirmed links or discarding the candidate. Count confirmed whole-word recovery separately from component records and possible historical relationships.

Keep all source files, reference flags, control roots, meanings, candidates, and scores fixed. The acceptance gate remains unchanged. Review the resulting caveats and every changed confirmation status; reproduce the final outputs. The manual recovery review must exclude a relationship supported only by a mismatched name/common-word entry from the expected ordinary-word recovery count.

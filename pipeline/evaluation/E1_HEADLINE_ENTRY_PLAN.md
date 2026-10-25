# E1-007: ordinary lexical entries before proper-name fallbacks

Recorded 2026-10-25 after reviewing E/E1-006 and before implementing or scoring F.

E has 85 suitable specified-concept displays in the same 100-case sample, versus D's 84 and the original 65. It repairs two sampled black-color entries but loses the specific Sun reading to a generic star. It removes the winter metadata headline. Its dog headline still chooses a Chinese-zodiac proper-name entry instead of the animal noun: allowing nonpersonal names to act as nouns for grammatical comparison did not select the correct entry type.

## Fixed revision F

Keep E's metadata, spelling, usage and first-reading rules. After preparing current substantive candidates and applying E's entry-spelling preference, prefer non-name lexical entries on each endpoint when any exist. A named entry is `pos == 'name'` or explicitly tagged `proper-noun`. If only named entries exist, retain them. Keep all named readings in the unchanged source inventory and original strongest-match output. Then apply E's existing within-entry order and pair preferences.

This is a default-entry preference, not a statement that proper names cannot be valid translations. It may lose a specific celestial or other named reading when a generic noun exists. That cost must remain visible. It uses source entry metadata, not a list of words or entity-specific exceptions. No other rule, score, numeric threshold, source link or classification changes.

## Evaluation

Reuse the exact 100 sampled concept cases, 995-case frame weights and 207 open diagnostic cases. Freeze E's reviews, reuse only identical display judgments, and review every new sampled gloss and changed open display. Preserve E's existing Sun loss and report every additional gain/loss against original, D and E. Inspect all F-versus-E changes, including unsampled diagnostic proposals; do not count those as independent benchmark successes. Reproduce all earlier selectors and every original strongest-match display.

This is an exploratory revision informed by known development failures. Its benefit must be confirmed more broadly after freezing the selected method. No production change or publication follows from this run.

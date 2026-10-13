# E5: audit sources before admitting new languages

Fixed before inspecting Dutch and Icelandic admission results. The experiment adds languages one at a time in an offline build. No live database publication is part of this run.

## Sources and hypothesis

The existing Dutch and Icelandic Kaikki dumps are the first source candidates. Check their actual language codes, edition evidence, source entry identities, glosses, parts of speech, recorded pronunciations, and etymology. An English-edition dump of a target language may be sufficient, but the language name on its download URL does not establish that sufficiency.

Reuse the accepted parser and source extractors. Keep the original five source inputs and baseline output immutable. New-language pronunciation gaps remain empty unless an existing supported converter supplies a value; the current converter supports neither Dutch nor Icelandic. Do not invent a new spelling-to-sound rule during an admission test or pretend spelling is recorded IPA.

Audit all accepted entries and the independent IE-CoR Dutch and Icelandic concept forms. Report exact headword coverage first, then documented form alternatives separately. Count active senses, source identities, POS, source pronunciations, etymology prose, and structured roots. Distinguish content coverage from the number of scraped entries. Translation coverage comes from the unchanged English pivot and retained target source-sense references; zero translations in a target-language dump does not imply that English has none for it.

Inspect reproducible source samples across ordinary concepts, names, short forms, compounds, borrowing, and multiple-entry headwords. Record missing or weak fields rather than treating the source's edition as an automatic rejection.

## Admission protocol after the audit

Choose the first language and freeze numerical coverage and review gates after this source audit, before generating or scoring new comparisons. Define the per-pair development/test families for each addition from independent concept data and record all missing cases. Keep the old reserved families unopened until the final combined evaluation.

Build new pairs with the accepted candidate and display methods and the historical V2 final classifier. Neither E1/E2 nor E4 supplied an approved replacement. Evaluate E3's source-scoped evidence separately, retaining its qualifiers and entry context. Adding a language must not secretly change old meanings, thresholds, source inputs, or labels.

Verify every unchanged old comparison and input, including source claims, ordering, and score storage. A byte-preserved copy is an output-preservation check, not proof that a changed generator would reproduce it: separately test the old-pair candidate and classifier paths with the added membership. Then add the second language and repeat the checks, including the Dutch–Icelandic pair.

Report per-pair expected comparison recall, displayed meanings, practical label compatibility, unresolved sources, and reviewed game suitability. Aggregate success cannot conceal a weak pair. Save failed admission attempts, reasons, and a concrete next source/method check. Do not publish automatically when a development gate passes.

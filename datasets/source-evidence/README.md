# Germanic lexical source evidence: a small slice

This is a compact, inspectable data slice built from Wiktionary page revisions. It focuses on examples where spelling-pair labels hide different evidence: a changed etymology, borrowing, compound structure, homographs, and a near-match that resolves to a different Swedish word.

It is deliberately small and selected for debugging. It is not a random sample, a vocabulary-wide cognate estimate, or an expert adjudication. A page-level revision can contain several language sections; `claims.csv` records which section each extracted assertion came from.

## Files

- `source-pages.csv` pins each consulted Wiktionary page to a revision ID and records the displayed edit date and retrieval date.
- `claims.csv` contains short structured assertions from the named page section. It does not reproduce entry prose. A claim is what that source page records, not an independently verified historical conclusion. `root_recorded` records an explicitly named deeper form; it does not mean the modern entry inherited that form directly. Component and interfix rows describe the source's formation analysis.
- `pair-reviews.csv` records bounded checks of ten comparison pairs. `comparison_id` and the selected sense IDs link each review to the current CLDF case slice; `sense_link_status` distinguishes linked, ambiguous, and missing source-sense identities. These IDs identify candidate senses used for comparison, not a claim that the source etymology is sense-specific. When a selected form identity is ambiguous, the CLDF `forms.csv` row retains all candidate source entry and sense IDs and links them to the exported `entries.csv` and `senses.csv`; it does not choose among them. “No direct claim found” means none was found in the listed page sections; it does not mean the words are unrelated. The `ombudsman` cases separate direct borrowing, inherited paths, shared older forms, and shared donors. The `clown` cases record direct borrowing into Swedish, Danish, Bokmål, and German while keeping the English entry's uncertain deeper origin as a separate question.

The `ombudsman` case is a useful small source-to-data example: English and German entries record borrowing from Swedish; the Bokmål entry records inheritance from Old Norse; and the Danish entry traces its form through Old Danish to Old Norse. The `clown` case adds a different pattern: four entries record borrowing from English, while the English entry offers competing or uncertain deeper-origin analyses. These are source-reported paths that can coexist. The rows do not force them into a single cognate/loan box or settle the project’s eventual pair-level taxonomy.

## Claim fields

`source_language_or_stage` and `target_language_or_stage` use language codes for modern varieties and readable names for historical stages. `source_form` and `target_form` preserve the forms recorded in that page revision. `scope` describes what the claim concerns: `entry` for a whole lexical entry, `etymon` for an older or donor form, and `formation` for a component or linking element.

| `claim_type` | Meaning in this file |
| --- | --- |
| `borrowed_from` | The source explicitly names a donor form or language. Direction is from `source_form` to the named donor. |
| `inherited_from` | The source explicitly describes inheritance from the named earlier form. |
| `derived_from` | The source explicitly identifies a derivational relation. |
| `cognate_mention` | The source explicitly names a cognate form; this records the source's statement, not our verification. |
| `root_recorded` | The source names a root or older form for the entry; this does not assert a direct transmission path. |
| `historical_form` | The source names a form in an earlier stage without enough wording here to normalize the transmission as borrowing or inheritance. |
| `compound_component` | The source identifies a component of the form; it does not by itself establish a relationship between the whole word and another word. |
| `interfix` | The source identifies a linking element such as Bokmål `-s-`. |
| `alternative_form_of` | The source describes one form as an alternative form of another. |

Claims from the same entry are separate rows so a direct loan, an older source, and a component analysis can coexist. `pair-reviews.csv` links a reviewed pair to the CLDF comparison candidate and its selected source-sense IDs when present. A blank ID can mean that several source-sense candidates remain or that no source identity was found; `sense_link_status` distinguishes those cases. It is not a missing sense or a negative relationship claim. The review and project note do not turn source claims into a single etymological verdict.

To check these pages for newer edits, run `python pipeline/src/fetch_wiktionary_revision_snapshot.py --output pipeline/data/source-page-revision-snapshot.csv`. It writes a separate snapshot and input-hash manifest; it never changes the pinned rows in this directory.

`blive` appears twice in `source-pages.csv`: the earlier revision matches the local Kaikki snapshot’s direct Bokmål-to-Danish derivation claim; the later revision replaces that path with a Middle Norwegian inheritance claim and a Danish cognate mention. Both source states remain queryable.

## Attribution and license

Source material is from Wiktionary contributors, available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The revision links in `source-pages.csv` identify the pages used. This project extracted and normalized source assertions into tables and added the pair-review notes; it did not copy the entries’ prose. Wiktionary notes that some entries may include third-party material under separate terms, so check the entry and its history before reusing a specific claim. This slice is also offered under CC BY-SA 4.0. It does not imply endorsement by Wiktionary or the Wikimedia Foundation.

## Limits

- These examples were chosen because they expose particular transformation risks; counts from this file must not be generalized to a language’s lexicon.
- Relations have different scopes. `borrowed_from` connects a borrowing to a donor; `compound_component` connects a whole form to a component; `cognate_mention` records a source page’s explicit mention. None alone settles the relation between every sense of two headwords.
- An exact target-form match can still resolve to several entries or parts of speech. In the `clown` case, `en:clown` matches both English noun and verb entries; the selected comparison noun is retained separately and is not silently treated as the source claim's unique target.
- Proto-language forms and target spellings are stored as source-reported values. This file does not assert that equal or different root strings prove cognacy or non-cognacy.
- The current seed contains 15 pinned page revisions, 34 structured assertions, and ten bounded pair checks. These records were reviewed for this release; this is not a complete audit of the source entries or the comparison population.

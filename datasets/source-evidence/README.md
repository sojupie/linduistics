# Germanic lexical source evidence: a small slice

This is a compact, inspectable data slice built from Wiktionary page revisions. It focuses on examples where spelling-pair labels hide different evidence: a changed etymology, borrowing, compound structure, homographs, and a near-match that resolves to a different Swedish word.

It is deliberately small and selected for debugging. It is not a random sample, a vocabulary-wide cognate estimate, or an expert adjudication. A page-level revision can contain several language sections; `claims.csv` records which section each extracted assertion came from.

## Files

- `source-pages.csv` pins each consulted Wiktionary page to a revision ID and records the displayed edit date and retrieval date.
- `claims.csv` contains short structured assertions from the named page section. It does not reproduce entry prose. A claim is what that source page records, not an independently verified historical conclusion. `root_recorded` records an explicitly named deeper form; it does not mean the modern entry inherited that form directly. Component and interfix rows describe the source's formation analysis.
- `pair-reviews.csv` records bounded checks of six comparison pairs. “No direct claim found” means none was found in the listed page sections; it does not mean the words are unrelated. The `ombudsman` cases separate direct borrowing, inherited paths, shared older forms, and shared donors.

The `ombudsman` case is a useful small source-to-data example: English and German entries record borrowing from Swedish; the Bokmål entry records inheritance from Old Norse; and the Danish entry traces its form through Old Danish to Old Norse. These are source-reported paths that can coexist. The rows do not force them into a single cognate/loan box or settle the project’s eventual pair-level taxonomy.

To check these pages for newer edits, run `python pipeline/src/fetch_wiktionary_revision_snapshot.py --output pipeline/data/source-page-revision-snapshot.csv`. It writes a separate snapshot and input-hash manifest; it never changes the pinned rows in this directory.

`blive` appears twice in `source-pages.csv`: the earlier revision matches the local Kaikki snapshot’s direct Bokmål-to-Danish derivation claim; the later revision replaces that path with a Middle Norwegian inheritance claim and a Danish cognate mention. Both source states remain queryable.

## Attribution and license

Source material is from Wiktionary contributors, available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The revision links in `source-pages.csv` identify the pages used. This project extracted and normalized source assertions into tables and added the pair-review notes; it did not copy the entries’ prose. Wiktionary notes that some entries may include third-party material under separate terms, so check the entry and its history before reusing a specific claim. This slice is also offered under CC BY-SA 4.0. It does not imply endorsement by Wiktionary or the Wikimedia Foundation.

## Limits

- These examples were chosen because they expose particular transformation risks; counts from this file must not be generalized to a language’s lexicon.
- Relations have different scopes. `borrowed_from` connects a borrowing to a donor; `compound_component` connects a whole form to a component; `cognate_mention` records a source page’s explicit mention. None alone settles the relation between every sense of two headwords.
- Proto-language forms and target spellings are stored as source-reported values. This file does not assert that equal or different root strings prove cognacy or non-cognacy.
- Only the twelve listed page revisions and six listed pair checks were reviewed for this release.

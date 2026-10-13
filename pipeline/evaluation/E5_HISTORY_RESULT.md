# E5 historical evidence: development measurement

The recorded plan preceded this run. It evaluates historical evidence separately
from retrieval, displayed senses and modern meaning labels. The run completed;
source review has not. No adoption decision follows from these path counts.

## Independent positive cognacy reference

IE-CoR's same-expert-set concept forms supply the positive reference below.
The expected denominator includes missing comparisons. Suitable display counts
come from the saved source-guided agent reviews against the benchmark concept;
they are not independent human annotations.

| Pair | Expected cognate comparisons | Retrieved | Suitable displays | Selected entries with inheritance or explicit cognate evidence | Selected entries with unspecified shared-source evidence |
| --- | ---: | ---: | ---: | ---: | ---: |
| Danish–Dutch | 74 | 67 | 56 | 30 | 30 |
| German–Dutch | 94 | 87 | 70 | 65 | 16 |
| English–Dutch | 63 | 59 | 33 | 44 | 12 |
| Norwegian–Dutch | 75 | 63 | 54 | 16 | 24 |
| Dutch–Swedish | 74 | 68 | 56 | 37 | 20 |
| Danish–Icelandic | 88 | 69 | 60 | 46 | 37 |
| German–Icelandic | 67 | 55 | 42 | 16 | 14 |
| English–Icelandic | 55 | 40 | 23 | 32 | 18 |
| Norwegian–Icelandic | 90 | 69 | 61 | 27 | 46 |
| Dutch–Icelandic | 65 | 54 | 47 | 20 | 22 |
| Swedish–Icelandic | 89 | 70 | 57 | 44 | 32 |

Evidence columns can overlap. They count recovered, unqualified source paths,
not validated historical classifications. Unspecified shared sources do not
establish inherited cognacy. A path on a selected entry does not make its
displayed sense appropriate: English–Dutch retrieves 59 positive comparisons,
but only 33 have suitable displays. Historical support cannot repair that
separate failure by itself.

## Scope and limits

The run covers all 1,293 development concept cases and 372 broader sample cases.
It preserves both selected-entry and full-inventory evidence, ambiguous source
identities, source uncertainty, borrowing and component-only support separately.
There are 631 cases with selected-entry non-component evidence awaiting source
review. Their paths are saved, not declared correct.

IE-CoR can spot-test these expected forms and documented concept cognacy. It
cannot validate the full modern sense inventory, all useful translations,
borrowing histories or false friends. Different expert sets are not proof of
unrelated origins. Failure to recover a structured path is not proof against
cognacy and does not require an unclassified label.

The broader sample remains stratified and diagnostic; its pooled counts are not
population accuracy. Modern meaning judgments and fixed classifier labels remain
unchanged. Reserved cases were not evaluated and the live database was not written.

## Reproduction and remaining review

Run `pipeline\.venv\Scripts\python.exe -X utf8 pipeline/evaluation/e5_history.py
--output <new-directory>`. The saved protocol verifies source and review inputs
and records method, plan and policy hashes. The existing historical method's
self-check and entry-scope assertions passed.

Metrics and protocol are retained with the run. Detailed case and path records
remain on disk in `e5-history001/case_results.json` and
`e5-history001/source_review_candidates.json`; regenerate them with the command
above. They repeat source inventories and are excluded from Git.

Before claiming historical correctness, review supported paths and their source
qualifications, especially disagreements with the benchmark and cases with wrong
displayed senses. Definition quizzes and whole-word family games need their own
eligibility checks. This measurement neither grants nor rejects language admission.

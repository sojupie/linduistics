# Data integrity follow-up

## Addressed in the 2026-09-28 taxonomy refresh

- Etymology prose can mention sister words and unrelated roots. Root extraction now uses structured source templates; prose is retained for display only. The Danish *ost* example is covered by `pipeline/tests/test_parser.py`.
- Shared roots are emitted only when both structured roots normalize to the same language and lemma. Cognate-cluster generation reads `shared_etym_root` instead of grouping by root prefixes or partial strings.
- The pair detail view shows separate per-word roots when there is no shared root.
- `false_friend` remains queryable for similar-form, low-meaning pairs. Its origin relation is stored independently as `cognate`, `false_cognate`, or `unknown`.

## Still open

- The one-row-per-spelling model cannot represent distinct homographs and their separate roots (for example, Swedish *gift*). Supporting them requires entry/sense identity in candidate generation and pair storage; the current refresh does not solve this.
- The lexicon's sister-cognate section is still named and shaped around Pan-Germanic clusters. Generalize it around a shared root and language set before presenting it as a generic cognate cluster; show no shared cluster for unrelated roots.
- The `other` records with unknown origin remain unresolved. See the aggregate breakdown and validation limits in `docs/DATASET_SPECIFICATION.md`; the full result set has not been manually labeled.
- The parser fallback that accepts any asterisk-leading value from a structured template is broader than the prioritized template-code mapping. Audit its coverage with source-linked examples before tightening or expanding the root parser.
- Review stratified examples for German *Rat*, Danish *rat*, and any multi-language cluster before claiming that specific historical edge cases are verified. No row-level spot check was part of this refresh.

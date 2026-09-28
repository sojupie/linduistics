# Source-backed person and formation facts

## What the slice contains

`pipeline/data/source_facts_all.jsonl` is a compact view of three kinds of facts extracted from the five local Wiktionary-derived dumps (`da`, `de`, `en`, `nb`, and `sv`):

| Fact | Records | Meaning in the source data |
| --- | ---: | --- |
| `named_after` | 1,506 | The entry says that its term is named after an entity. Three records have no linked entity. |
| `coined_by` | 2,379 | The entry attributes coinage to a person or other entity. |
| `onomatopoeic` | 1,561 | The source marks the formation as onomatopoeic. Some entries use the source label `imitative`. |

The 2,379 `coined_by` records also have `formation_type: coinage`. The relation and formation counts overlap. The output has 5,446 rows because each source claim is one row, even when it states both facts.

Each row has a stable `fact_id`, source-entry key, language, headword, part of speech, Wiktionary source URL, normalized fact fields, and the source template name and arguments. The export does not copy the full etymology prose. Every output row has a source URL. The manifest records the input and output hashes, row counts, and language distribution.

## What the labels mean

These are extracted source statements, not independently checked historical facts. `named_after` links an entry to a named entity; `coined_by` records the source’s attribution of a coinage. A Wikidata identifier stays typed as `wikidata_id`; names remain names. The raw template arguments remain alongside the normalized fields.

`onomatopoeic` is a formation fact, not an edge to another word. Its optional `source_label` preserves a label such as `imitative`; it does not create a new formation category. The source’s `named-after/list` helper templates remain in the full source export but do not produce duplicate facts.

Wiktionary documents `named after` as an eponym template with a person and optional identity details. Its `coinage` template records a coiner and optional date; `coin` and `coined` are listed as shortcuts. Its etymology-template module documents `onomatopoeic` and `onom` as formation markers. These definitions guided the separate fields in this slice: [named after](https://en.wiktionary.org/wiki/Template:named_after), [coinage](https://en.wiktionary.org/wiki/Template:coinage), [etymology templates](https://en.wiktionary.org/wiki/Module:etymology/templates/documentation).

## Coverage limits

- The counts describe template records in these five source dumps. They are not rates of coinage or onomatopoeia in any language.
- English supplies 4,642 of the 5,446 rows. The other language counts are Danish 69, German 391, Norwegian Bokmål 36, and Swedish 308. This reflects the current extracted source material, not comparative vocabulary coverage.
- The three `named_after` rows without a linked entity remain useful as source statements, but they cannot support a person-level link.
- Template extraction follows top-level structured etymology templates. Prose and nested inline etymologies can contain additional evidence that this slice does not normalize.
- A source link and template argument show what the entry records. They do not establish that the attribution is correct.

## Rebuild

Regenerate the full source records first, then produce this slice:

```powershell
pipeline\.venv\Scripts\python.exe pipeline\src\extract_etymology_records.py --output pipeline\data\etymology_records_all.jsonl --force
pipeline\.venv\Scripts\python.exe pipeline\src\export_source_facts.py --source-records pipeline\data\etymology_records_all.jsonl --output pipeline\data\source_facts_all.jsonl --force
```

Both generated files are local, ignored artifacts. The compact output is a useful release candidate, not a published dataset. Before distribution, add source attribution, license terms, and a versioned source manifest. Keep it as readable JSONL until a CLDF mapping makes reuse clearer.

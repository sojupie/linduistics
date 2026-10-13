# E5 source audit: Dutch first, Icelandic second

The existing sources are sufficient to **test admission**, not yet to approve either language. Use Dutch first: its independent concept coverage is stronger and the unchanged English pivot records more translation links for it. Then test Icelandic, including its pair with Dutch.

## What the files contain

These are Dutch and Icelandic entries from English Wiktionary, not native-edition dictionaries. Kaikki's [Dutch page](https://kaikki.org/dictionary/Dutch/index.html) and [Icelandic page](https://kaikki.org/dictionary/Icelandic/index.html) identify the edition as `enwiktionary`; checked 2026-10-03. Those pages describe the current download edition, while the local files are identified by their saved hashes. Both local hashes match the preserved language-expansion source manifest. All local raw records have the expected target language code.

English-edition data is not automatically inadequate: these files contain English glosses, exact source identities, ordinary vocabulary, recorded IPA, and etymology. The measurements below decide whether that coverage is enough for a candidate admission run.

| Field after the unchanged parser | Dutch | Icelandic |
| --- | ---: | ---: |
| Accepted lemmas | 60,067 | 17,209 |
| Distinct accepted source entries | 64,066 | 18,171 |
| Retained sense records | 81,605 | 23,181 |
| Active sense records | 76,162 | 22,730 |
| Lemmas with source pronunciation | 43,408 (72.3%) | 14,502 (84.3%) |
| Lemmas with etymology prose | 50,062 (83.3%) | 10,353 (60.2%) |
| Lemmas with an extracted structured root | 6,458 (10.8%) | 3,534 (20.5%) |
| Lemmas combining multiple source entries | 3,416 | 836 |

The accepted Dutch inventory includes 32,368 noun, 10,103 verb, 6,926 adjective, and 9,085 name lemma records. Icelandic includes 10,997 noun, 1,868 verb, 2,047 adjective, and 1,742 name lemma records. Aggregated lemma POS is not the POS of every retained sense; the saved audit reports both.

Structured roots cover a minority of either inventory. Missing roots must not become a ban on useful comparisons. Multiple source entries require the same sense and homograph care measured in E1–E3.

## Independent ordinary-vocabulary coverage

Use the previously downloaded IE-CoR reference: modern Dutch ID 21 and modern Icelandic ID 36. Count exact NFC/casefold spellings first, without guessing a lemma or splitting notation.

| Reference forms | Dutch | Icelandic |
| --- | ---: | ---: |
| Total | 171 | 173 |
| Exact accepted headword found | 170 (99.4%) | 166 (96.0%) |
| Found form also has recorded pronunciation | 170 | 163 |

Dutch's missing exact form is `bang zijn` (fear), a phrase excluded by the existing parser.

Icelandic's seven missing exact forms are `hræðast` (fear), `kasta upp` (vomit), `vera hræddur` (fear), `kné, hné` (knee), `morkinn` (rotten), `beiskur` (bitter), and `í gær` (yesterday). Three are phrases, one is explicit alternative notation, and three require a raw-entry/form/source-gap check. Keep all seven in exact coverage; do not silently substitute a guessed spelling. Admission evaluation must assess the retained senses against the concepts, not equate a found spelling with a correct meaning.

## Translation and pronunciation boundaries

The target dumps contain one Dutch translation record and no Icelandic translation records. The saved English source manifest separately records 75,400 Dutch-target and 22,365 Icelandic-target translation claims. Those are source claims, not counts of validated target comparisons. The unchanged English pivot must still resolve target headwords and preserve its source-sense references.

The current spelling-to-sound converter supports neither new language. Consequently **16,659 Dutch and 2,707 Icelandic parsed lemmas have empty pronunciation**. The parser prints a fallback attempt, but the unsupported converter correctly returns an empty string. This audit has not filled those gaps with spelling or invented rules. Candidate generation can retain translation and spelling channels while reporting unavailable phonetic evidence.

## What this audit establishes

Both source files offer strong coverage of the independent ordinary concept forms, enough to proceed to measured new-pair builds. It does not establish pair recall, correct displayed meanings, correct labels, ancestry consistency, or usable game questions. Those admission measurements and their limits must be fixed next, before looking at candidate outcomes.

Parsed lookups are isolated under `pipeline/data/e5-source-audit`. The protocol, source hashes, POS counts, and independent source inventories are saved under `e5-source-audit` in this evaluation directory. Reproduce with `pipeline\.venv\Scripts\python.exe -X utf8 pipeline/evaluation/e5.py --output <new-audit-directory> --lemmas <new-lookup-directory>`. The old lookups and dataset remain unchanged.

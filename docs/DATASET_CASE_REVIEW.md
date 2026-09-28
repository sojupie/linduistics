# Reviewed lexical-history cases

This is a working ledger from the local, source-sense-aware candidate build. It records what the current Wiktionary-derived inputs say and what our pipeline does with them. It is not expert adjudication, independent confirmation, or a representative sample.

The reviewed JSONL files and manifests are generated locally under `pipeline/data/` and are ignored by Git. They retain source-entry keys, source-sense matches, source claims, and comparison values. The seed cases below are deliberate examples, not a random sample.

## Cases

| Comparison | Current candidate row | Source-backed evidence in the selected entries | What the row should preserve |
| --- | --- | --- | --- |
| German *haben* – English *own* | `translation_pair` / `unknown`; verb–verb | The mined translation points to English verb sense `en-own-en-verb-en:owner`; the rebuilt row now selects that verb sense instead of the adjective. | Keep the translation claim linked to its source sense. Translation evidence does not by itself establish shared origin. |
| German *fressen* – English *fret* | `other` / `unknown`; verb–verb | Both entries link the selected verb to Proto-West Germanic `*fraetan`. The English entry also records a Proto-Germanic form and a separate, qualified explanation for some “chafe” senses. Two translation-source senses are retained; one matches the active English sense. | Preserve the shared source path and the non-active translation claim separately. The different scalar root strings do not mean “unrelated.” |
| Swedish *fleece* – English *fleece* | `other` / `unknown`; noun–noun | The Swedish entry says it was borrowed from English. The active English entry traces the word through Old and Middle English to Proto-West Germanic `*fleus`. | Represent a Swedish-to-English borrowing edge and the English entry's older ancestry as separate links. Do not copy the English root into Swedish as though Swedish inherited it. |
| Swedish *clown* – English *clown* | `other` / `unknown`; noun–noun | The Swedish entry says it was borrowed from English. The English etymology text gives alternatives and qualifies its possible connection to Proto-Indo-European `*gel-`; the current scalar root does not express that qualification. | Keep the direct loan and the English source's uncertainty distinct. A root field extracted from prose must not erase words such as “likely,” “could,” or “alternatively.” |
| Swedish *greve* – Danish *greve* | `other` / `unknown`; noun–noun | The active Swedish entry explicitly calls Danish *greve* a cognate. The two root strings differ: Proto-West Germanic `*garāfijō` and `*grāfijō`. | Keep the source claim queryable with its direction and entry link. A root-string difference must not cancel a source claim or become evidence of separate origin. |
| Swedish *universitet* – Danish *universitet* | `other` / `unknown`; noun–noun | The Swedish root is recorded as Latin *universitas*. The Danish entry traces through Medieval Latin *universitas* to Latin *ūniversitās*. | Preserve each path and form as recorded. Do not globally strip diacritics just to make root strings equal; any normalization needs an explicit, testable rule. |
| Swedish *ombudsman* – English *ombudsman* | `true_cognate` / `cognate`; noun–noun | Both selected entries point to Old Norse *umboðsmaðr*. The English entry also says it was borrowed from Swedish. | Allow a direct borrowing path and a deeper shared-origin path on the same comparison. One exclusive label cannot express both. |
| Swedish *ombudsman* – Danish *ombudsmand* | `true_cognate` / `cognate`; noun–noun | Both selected entries point to Old Norse *umboðsmaðr*. The entries also analyze the words as compounds. | Keep the common-origin evidence and each language's component analysis. The source claims do not by themselves establish the route by which Danish received the word. |
| Swedish *sandbank* – English *sandbank* | `other` / `unknown`; noun–noun | The active English entry names Swedish *sandbank* as a cognate. The selected Swedish comparison sense has two same-POS source-sense matches, so its identity is ambiguous. | Retain the English assertion while leaving the pair-to-Swedish-sense link unresolved. Do not promote it to a confirmed pair relation yet. |
| Swedish *gift* – English *gift* | `false_friend` / `cognate`; Swedish adjective “married” vs English verb “give as a gift” | Both active source senses carry Proto-Germanic `*giftiz`, but the candidate compares different parts of speech and very different meanings. | Keep misleading form/meaning similarity separate from historical paths, and flag the sense/POS mismatch. The two signals can coexist; neither should overwrite the other. |
| Swedish *bankman* – English name entry “surname” | `false_friend` / `unknown`; Swedish noun vs English name | Swedish has a source entry analyzing *bank + man*. The English comparison sense has no active source-sense match in the local source export. | Keep it as a quiz/candidate lead if useful, but mark the cross-language lexical identity as unresolved. Do not infer English components or a whole-word relation from the spelling. |
| Swedish *bank* – English *bank* | `other` / `unknown`; selected senses are both river-bank senses | The selected Swedish root is Proto-Germanic `*bankiz`; the selected English entry records `*bankô`. The headword also has other senses and multiple source claims, so this row does not answer every “bank” comparison. | Resolve the exact sense and etymology before classifying the pair. Do not treat the headword string or one root field as the complete history of *bank*. |

Source pages for these examples: [German *haben*](https://en.wiktionary.org/wiki/haben#German), [English *own*](https://en.wiktionary.org/wiki/own#English), [German *fressen*](https://en.wiktionary.org/wiki/fressen#German), [English *fret*](https://en.wiktionary.org/wiki/fret#English), [Swedish and English *fleece*](https://en.wiktionary.org/wiki/fleece), [Swedish and English *clown*](https://en.wiktionary.org/wiki/clown), [Swedish and Danish *greve*](https://en.wiktionary.org/wiki/greve), [Swedish and Danish *universitet*](https://en.wiktionary.org/wiki/universitet), [Swedish and English *ombudsman*](https://en.wiktionary.org/wiki/ombudsman), [Danish *ombudsmand*](https://en.wiktionary.org/wiki/ombudsmand#Danish), [Swedish and English *sandbank*](https://en.wiktionary.org/wiki/sandbank), [Swedish and English *gift*](https://en.wiktionary.org/wiki/gift), [Swedish *bankman*](https://en.wiktionary.org/wiki/bankman#Swedish), and [Swedish and English *bank*](https://en.wiktionary.org/wiki/bank).

## What `other` contains in the refreshed sample

The 270 rejoined rows now carry 31 `true_cognate`, 26 `partial_cognate`, 30 `false_friend`, 31 `translation_pair`, and 152 `other` candidate labels. Those are counts in this old, deliberately stratified sample after rejoining it to the new local build. They are not rates for the current database or for either language's vocabulary.

The narrow pair-claim matcher found a source statement naming the compared form or language in 28 of the 152 `other` rows. Evidence types overlap:

| Pair-specific source evidence found | Rows in sampled `other` |
| --- | ---: |
| Direct borrowing claim | 11 |
| Explicit source cognate mention | 9 |
| Shared borrowing source | 6 |
| Same inherited form recorded by both entries | 5 |
| Explicit source noncognate mention | 1 |
| Any of these | 28 |

The remaining 124 rows have no pair-specific claim found by this strict matcher. That does not mean they are unrelated or lack etymology: a source may name an ancestor rather than the compared form, use a different spelling, omit a language link, or have no entry in the extracted source records. Even the 28 matches are source claims, not automatic pair verdicts. In eight of nine cognate-mention cases and four of five shared-inherited-form cases, the claiming entry links to an active comparison sense; that link still does not make an entry-level statement sense-specific.

These cases do not form a replacement set of mutually exclusive labels. They show that the current `other` bucket crosses several paths and evidence states, so the useful next step is to query the underlying claims and links rather than rename the bucket.

## What this says about the data model

The current candidate labels mix different questions. The same pair can have a form/meaning pattern, one or more historical paths, and uneven evidence linking those paths to the selected senses. Keep these as separate, queryable dimensions:

- **Lexical identity:** language-specific form, entry, etymology, and sense IDs. A spelling can have homographs and multiple histories.
- **Historical paths:** directed source claims such as `borrowed_from`, `inherited_from`, `derived_from`, or a component relation. A pair may have several paths.
- **Comparison observations:** spelling, pronunciation, meaning, and translation evidence. These help find and describe pairs; they do not prove origin.
- **Evidence linkage:** whether a claim is linked to the active source sense, only to an entry, ambiguous, or not found in the current input. Keep the source statement even when its link to the selected sense is unresolved.
- **Candidate pattern:** labels such as `false_friend` should describe the observed comparison pattern, not assert that the words have unrelated origins. A pattern and a historical relation can coexist.

For now, `other` means only that no more specific candidate rule assigned a label. It is not a linguistic class. Its cases should become explainable through evidence links, such as a direct loan, a shared source lineage, an unresolved sense match, a candidate-retrieval gap, or no normalized source claim found. These are evidence states and paths, not mutually exclusive replacements for `other`.

The strongest claim this slice can make is “the recorded Wiktionary entries say X, and our transformation linked them in Y way.” Both language sides come from the same source family, so this is not independent confirmation of historical truth. Keep the transformations reproducible and make the provenance inspectable; that is the useful dataset contribution at this stage.

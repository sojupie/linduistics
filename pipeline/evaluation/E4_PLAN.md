# E4: test candidate channels

Fixed on branch `e4`, before running either variant.

## Hypothesis and controls

Short-prefix retrieval adds weak comparisons. Removing it may improve the usefulness of retained comparisons, but may also lose ordinary vocabulary. Pronunciation retrieval without a spelling-prefix condition may recover missing comparisons. Learned correspondences must improve retrieval on families that did not supply those correspondences.

Keep the five-language baseline, meanings, encoder, source records, and classification rules fixed. Do not write to PostgreSQL or change production candidate generation. Verify the E0 input hashes. Read development cases only; the final test families remain reserved.

The builder mines translations first, then exact spelling collisions, then prefix matches. Every mined translation carries an English source-entry reference, even when its source-sense ID is missing. Therefore classify saved rows by this precedence: nonempty `translation_source_senses`, case-insensitive exact spelling, then prefix. Check every remaining row against the actual prefix rule: source length 3–10, target length at least 3, equal normalized first three characters, raw length difference at most two, and orthographic similarity at least 0.70. Fail on an unexplained row rather than assign its channel by guesswork. Report full-table channel counts without treating them as accuracy estimates.

## A: remove prefixes

Retain translations and exact spelling matches. Compare all development concept cases, including pairs missing from the original table. Primary recall uses exact reference spellings under E0's NFC/casefold matching; recorded inflections and explicit alternative reference spellings remain separate.

For candidate usefulness, reuse the 207 frozen open-vocabulary judgments and E2's predeclared mapping from baseline categories to practical labels. A compatible fixed label is the measurable usefulness criterion here. Report the retained share with a compatible label, all removed cases, and lost compatible comparisons. Ten unresolved references remain visible but do not count as correct. Resample the same review families in both arms for the change in retained compatible share. This diagnostic sample is not a population precision estimate. Keep each original judgment and reason, including legitimate false friends; disjoint meanings alone do not make a candidate useless.

Apply E0's gates: recall loss at most two percentage points overall and five per pair; usefulness gain at least five points with a positive paired family interval. A smaller table does not pass by itself.

## B: pronunciation retrieval

Add pronunciation candidates to the unchanged control, including its prefix channel. Also report the combination with A separately. This makes the phonetic test interpretable even if prefix removal fails.

Divide development concept families before learning: an even final hexadecimal digit in the saved family ID assigns a family to calibration; an odd digit assigns it to evaluation. Use only calibration comparisons with the same expert cognate set to align pronunciations. Do not learn from evaluation or reserved families, meanings, or classifier output. Deduplicate training word pairs. Use deterministic Levenshtein alignment of normalized IPA, counting aligned substitutions and unchanged symbols. Accept a directed symbol replacement only when it appears in at least three different calibration families and accounts for at least half of aligned observations of that symbol. Keep all counts and training identities. This tests a simple correspondence model, not a complete model of sound change.

The lemma IPA field mixes source pronunciation and generated spelling-to-sound fallback. Audit the original five Kaikki dumps using the existing parser. Mark a stored IPA as source-attested only when an accepted source entry supplies that same normalized IPA. Preserve fallback as a distinct signal; do not describe generated strings as recorded pronunciation. Train correspondences on source-attested endpoints only. Retrieve with both stored types, and report their results separately.

For each unique headword and comparison language in evaluation families, search the entire target lemma vocabulary. No spelling prefix or frequency cutoff. Reuse normalized IPA and RapidFuzz: shortlist the 25 nearest unique pronunciation strings under ordinary Levenshtein similarity, for both unchanged and mapped source pronunciation. Rerank the union with the existing articulatory phonetic score. Keep at most five target headwords per query whose score is at least 0.75 for a word of at most three characters, otherwise 0.65. Resolve equal scores by target headword. Exclude empty pronunciation strings. Run an unlearned phonetic arm with the identical procedure so gains from retrieval and gains from learned correspondences stay separate. The shortlist is a computational limit and can miss a good articulatory match; measure that limitation rather than claim exhaustive nearest-neighbor search.

Expected-pair recall uses evaluation concept families, including original missing comparisons. Report every gain, loss, missing lemma, unavailable IPA, generated fallback, and per-pair count. Apply the existing gate: at least ten additional expected comparisons across at least two language pairs, with the same recall-loss limits. Do not tune these parameters after viewing evaluation results.

For false retrievals, save all additional candidates from evaluated queries. Select six per language pair by seeded reservoir, before reading their meanings or categories, including candidates that the fixed classifier would reject. Read every selected case against its full source sense inventory. Compute its output using the same sense alignment and V2 reclassification as the reproduced baseline, without E1/E2/E3 replacements. Separate useful same-meaning comparisons, plausible deceptive lookalikes, related forms, unrelated weak matches, and unresolved cases. Preserve entry identities, scores, and review reasons. Inspect all newly recovered expected pairs as well. An expected pair being retrieved does not establish that its displayed meaning or label is correct.

## Evidence and decision

Save executable code, input hashes, training and evaluation identities, channel counts, case results, review sample, all reviewed errors, runtime, and a readable report. Reproduce predictions; timings may differ. Record accept, revise, or reject for each arm. Do not infer publication approval from development success. Continue E5 after recording the result.

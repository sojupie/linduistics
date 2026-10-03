# Linduistics: dataset review brief

**Status: October 3, 2026.** This brief seeks an independent assessment of our data model, classification methods, and evaluation plan. Our proposed solutions are open to challenge.

## 1. The product and its requirements

Linduistics is a comparative lexicon and language-learning application. It lets people explore word pairs, compare definitions and pronunciation, inspect recorded etymology, and play games about cognates, false friends, and word families. Language overview tables and maps summarize the dataset.

The active languages are English, German, Swedish, Danish, and Norwegian Bokmål. We previously added Dutch and Icelandic, then rolled back that expansion after regressions. We still want to support more languages.

The product needs useful comparisons of ordinary vocabulary, sensible definitions, and reliable enough labels for learning activities. It is not intended to make every classification conditional on having a complete, machine-readable historical proof. Inference from incomplete evidence is acceptable, but systematic errors and misleading claims are not.

Two questions remain unresolved: what each product category should mean, and how much evidence should justify assigning it. For example, should shared international borrowings sit alongside inherited cognates, occupy a separate category, or depend on the learning task?

## 2. Source data and current processing

We primarily use local Kaikki JSONL extracts of Wiktionary data. They contain headwords, parts of speech, definitions, senses, pronunciation where available, etymology text and templates, and translation records. Coverage and structure vary by language and dictionary edition. A file containing entries for a language is not necessarily a comprehensive dictionary written in that language.

The pipeline currently:

1. Parses entries and aggregates senses under headwords, retaining source identities and sense-level etymology where available.
2. Generates candidate pairs from mined translations, spelling collisions, and near-matches sharing a short prefix.
3. Computes spelling and pronunciation similarity and definition similarity using `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`.
4. Compares sense definitions and chooses a highest-scoring active sense pair. It can restrict English translation matches to the recorded source sense when that identity is available.
5. Attaches matched source claims to the comparison senses.
6. Assigns final categories from scalar similarity scores and root fields.
7. Publishes comparisons and related form, inflection, synonym, and cluster tables to PostgreSQL. A Go API serves the application.

Important limitations:

- The final classifier receives empty sense lists. It does not independently evaluate the stored sense inventory or attached source claims.
- Structured roots are incomplete. Different recorded root strings may represent different depths of a shared history, rather than unrelated origins.
- The highest embedding score need not identify the main meaning, a useful teaching example, or broad equivalence between words.
- A similarity score is not a calibrated probability of translation or shared ancestry.
- Generic definitions, short glosses, names, compounds, and uneven sense inventories can distort matches.

## 3. What happened in previous iterations

### Smaller heuristic dataset

An early five-language dataset had roughly 403,000 directed rows. Candidate caps kept the output smaller. Similarity rules assigned many cognate and translation labels; mined translations received an artificial minimum semantic score of 0.95.

This produced cleaner-looking results, but the score floor concealed measurement differences. Similar form and meaning did not settle historical relationships or distinguish inheritance from borrowing.

### Larger dataset with strict root requirements

Removing candidate caps expanded the dataset to 1,638,454 rows. Requiring matching structured roots for cognate labels excluded many useful comparisons when root evidence was missing. Removing the translation score floor also changed which pairs passed the thresholds.

The result was approximately 70% `other`, 22% false friends, and very few cognates. Weak prefix matches increased noise while missing roots blocked plausible classifications. These were shares of generated rows, not vocabulary proportions.

### Five-language v2 relabeling

A subsequent classifier kept those rows but allowed inference when roots were missing. It assigned more detailed labels and marked some rows `is_core`. This was a real database update, and it became the accepted pre-expansion baseline.

However, the update classified scalar scores and roots rather than performing new sense alignment. Some label meanings exceeded what the rules measured. For example, moderate meaning similarity could produce `semantic_narrowing` without establishing a direction of narrowing.

### Seven-language expansion and further attempted fixes

The expansion combined new Dutch and Icelandic comparisons with an older saved file. That file lacked the database's newer v2 labels, so loading it reverted the original language pairs to older classifications. Later rebuilding also lost attached source claims from live comparison senses.

Further fixes adjusted root extraction and classification fallbacks. Small named examples improved, but this did not establish broad quality. During those iterations, the user found problems such as an ordinary *water/Wasser* comparison displayed through the secondary meaning “urine,” misleading compound classifications, and shared borrowings classified poorly when root strings differed.

These are examples from earlier iterations, not a claim that each has been reproduced in the current restored build. They illustrate why category totals and a short example list failed as acceptance tests.

The repeated process failure was that development produced a large file and partial checks, then left the user to discover broader problems through ordinary browsing.

## 4. What we have now established

We restored the pre-expansion five-language code and rebuilt the data from the original local dumps. We did not restore a database backup. The preserved backup remains on disk for reference.

We then formalized the build without changing its classifications:

- A tracked runner covers the complete sequence, including the recovered source-claim matcher.
- Separate build directories contain manifests, stage logs, and readable reports.
- Hash checks and recorded dependencies, model revision, and environment govern reuse of completed stages.
- The final comparison file contains labels, senses, roots, scores, source claims, and core tags together.
- Publication replaces the related application tables in one transaction, with rollback on failure.
- Historical numeric conversion, row order, and existing IDs are preserved.

A fresh run produced a final file byte-identical to the accepted reference. Full-field checks of the published comparisons and lookup tables found no differences. The pipeline passed 104 tests, including a deliberate PostgreSQL publication failure that verified rollback.

The active comparison dataset contains:

| Database category | Directed rows |
| --- | ---: |
| `full_cognate` | 165,482 |
| `semantic_narrowing` | 233,192 |
| `accidental_lookalike` | 903,784 |
| `cognate_false_friend` | 3,930 |
| `unrelated_equivalent` | 140,088 |
| `independent_root` | 191,462 |
| `semantic_divergence` | 516 |
| **Total** | **1,638,454** |

There are 288,512 core rows and 40,376 attached source claims on 35,188 rows. Historical relation remains `unknown` on 1,194,068 rows, including some rows assigned practical categories through inference.

**This establishes reproducibility, not linguistic accuracy.** The current build is an engineering baseline; it has not passed an independently reviewed quality benchmark. Replacing `other` with more specific names also cannot establish improvement by itself.

The core tags deserve particular scrutiny: the historical script ranked words by their occurrence in generated comparison rows, not independent corpus frequency. Words with many candidate matches can rank highly. Those tags are preserved for equivalence, not defended as a representative vocabulary sample. Each undirected comparison also has two directed rows; the total is not a count of independent examples.

## 5. Proposed improvements, not yet validated

Our current proposal is to:

- Separate selected display meanings from the highest-scoring sense match, and retain multiple meaningful sense correspondences.
- Evaluate meaning overlap across senses before assigning a whole-word category.
- Use explicit relationship claims and compatible ancestry paths rather than treating unequal root strings as proof of unrelatedness.
- Combine form, meaning, translation evidence, part of speech, word length, and sound correspondences for useful fallback classification.
- Handle compounds and generic name definitions explicitly.
- Improve candidate selection so weak spelling collisions do not dominate the results.
- Preserve evidence and decision reasons without making missing root templates an automatic route to “unclassified.”

We proposed roughly 1,000 reviewed benchmark pairs across the existing language combinations, including ordinary and difficult cases. Expected answers would cover categories, selected meanings, and historical relationships separately. We would reserve an untouched test portion and keep related word families together to reduce leakage between development and testing.

Each experiment would change one method, compare it with the baseline, inspect failures, and report gains and losses by category and language pair. Larger runs would include reviews of changed and unchanged records, API queries, and ordinary lexicon use. The developer would perform these checks; the user would not supply the test cases.

Language expansion would proceed one language at a time, with source audits, reviewed cases for every new pairing, and checks that existing comparisons do not change unintentionally.

These are proposals. The benchmark size, sampling method, labels, acceptance criteria, and proposed remedies all need scrutiny.

## 6. Where we need an independent opinion

### A. Are we modeling the right things?

- Can one exclusive category describe a polysemous word pair adequately?
- Should historical relationship, meaning overlap, and potential learner confusion be separate dimensions?
- How should inheritance, direct borrowing, shared borrowing, partial equivalence, and compound relationships appear in this product?
- Do labels such as “true cognate,” “accidental lookalike,” and “semantic narrowing” make stronger claims than our evidence supports?
- Should lexicon results and game questions use the same acceptance standard?

### B. Are the signals and rules defensible?

- Is a general sentence-embedding model suitable for comparing dictionary definitions across these sources and languages?
- How should direct translation evidence interact with embedding scores when they disagree?
- What can we infer from form and meaning alone, and how should we calibrate that inference?
- How can we compare incomplete ancestry records without constructing a large historical-language database?
- Are threshold changes a useful first intervention, or would a different representation or a small supervised model address the causes more directly?

### C. How should we choose comparisons and denominators?

- Which candidate-generation methods balance useful coverage against noise?
- How do we measure pairs the pipeline fails to generate, rather than only evaluating retained pairs?
- What independent vocabulary or concept sample would support coverage checks and defensible overview statistics?
- Should overview percentages describe cataloged pairs only, or can we support stronger claims with a different sampling design?

### D. What would constitute credible validation?

- How should we select and review benchmark cases without favoring the current rules?
- How much native-speaker or linguistic review is necessary, and where can source-backed review or automated checks suffice?
- How should disagreements and genuinely ambiguous cases be scored?
- How do we avoid an AI developer generating expected answers that merely reinforce its own assumptions?
- What measures and acceptance limits would show meaningful improvement, including useful coverage and correctly selected meanings?
- How do we prevent repeated tuning to a small holdout set from turning it into another development set?

### E. How should new languages be admitted?

- What minimum source coverage and review evidence should a new language satisfy?
- How should we handle dictionary-edition differences and sparse pronunciation or etymology?
- What shared behavior should remain invariant, and what should be calibrated separately for each language pair?
- How can we detect errors that aggregate totals hide?

## 7. The advice we are asking for

Please challenge the assumptions above, including the taxonomy and proposed evaluation plan. We would value:

1. The most consequential methodological mistakes, ranked by impact.
2. A practical evaluation design that can distinguish real improvement from relabeling, cherry-picked examples, and reduced coverage.
3. The first two or three experiments worth running, with explicit success and failure criteria.
4. A defensible process for adding languages without repeating previous regressions.
5. Any approach we should stop pursuing, with an explanation of why.

We want an achievable learning product that makes sensible inferences from imperfect sources. We do not want either confident labels unsupported by evaluation or a system that avoids useful decisions by placing every difficult case in an unresolved category.

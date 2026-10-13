# Linduistics: questions for an independent dataset review

## Purpose

Linduistics is a comparative lexicon and language-learning application for English, German, Swedish, Danish, and Norwegian Bokmål. It shows word pairs, definitions, pronunciation, and etymology, and uses the pairs in learning games. We want to add Dutch, Icelandic, and eventually more languages.

We need useful classifications of ordinary vocabulary despite incomplete dictionary evidence. Reasonable inference is acceptable. Missing machine-readable roots should not automatically consign plausible comparisons to an “other” or “unclassified” category. At the same time, labels must be reliable enough to teach from.

We are seeking advice on the data model, inference methods, and evaluation design. Our current categories and proposed solutions are open to challenge.

## Sources and current method

We use Kaikki extracts of Wiktionary. Entries contain headwords, parts of speech, senses and definitions, pronunciation where available, translation records, and etymology text and templates. Coverage differs across languages and dictionary editions. An English-Wiktionary extract of another language may have different strengths and gaps from that language's own dictionary edition.

The pipeline:

1. Aggregates dictionary entries and senses under headwords, retaining source identities and available sense-level etymology.
2. Generates word-pair candidates from translation records, identical spellings, and near-matches sharing a short prefix.
3. Computes spelling and pronunciation similarity. It compares definitions using `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`.
4. Selects the highest-scoring active sense pair, sometimes restricted by the source sense of a recorded translation.
5. Attaches matched etymological claims to the stored senses.
6. Classifies each pair using its selected similarity scores and root fields. The final classification step does not independently assess the complete sense inventory or attached claims.

The current rules treat matching normalized roots as evidence of cognacy and different recorded roots as distinct origins. When roots are missing, strong form and meaning similarity can produce a cognate label; moderate meaning similarity can produce a semantic-shift label; similar forms with low meaning similarity can produce a false-friend label. Other branches assign translation-equivalent or independent-root labels.

The dataset contains approximately 1.64 million directed records, with each comparison stored in both directions. Its composition reflects candidate-generation rules. It is not a representative vocabulary sample. The existing “core” selection ranks words by occurrence in comparison records, rather than independent usage frequency.

## What we have tried and learned

- **Similarity heuristics with capped candidates:** produced useful-looking results, but mixed historical relationships with form and meaning resemblance. Giving recorded translations an artificial minimum semantic score concealed disagreements with the embedding model.
- **Uncapped candidates with strict matching-root requirements:** added many weak spelling matches while excluding plausible cognates lacking structured roots. Roughly 70% of records fell into “other.” This was much less useful.
- **Inference when roots are missing:** restored useful categories, but relied on fixed similarity thresholds. Some labels claim properties the rules do not establish: a middle similarity score does not demonstrate semantic narrowing, and unequal root strings do not demonstrate unrelated ancestry.
- **Root extraction and threshold adjustments:** improved selected examples, but we lacked evidence that the broader dataset improved. An attempted language expansion also exposed inconsistent processing between old and new pairs.

We now have a reproducible five-language baseline. We have not established its linguistic accuracy through an independently reviewed benchmark.

## Problems that better methods must address

**Polysemy and displayed meanings.** In an earlier build, searching for ordinary English *water* and German *Wasser* surfaced their shared secondary meaning “urine.” A valid secondary match can obscure the main comparison. A single winning sense also cannot establish that two words broadly mean the same thing.

**Incomplete or incompatible root records.** Sources may record different historical depths of a shared ancestry. Shared borrowings may have equivalent meanings even when extracted root fields differ. Exact root equality misses relationships; automatically treating inequality as unrelatedness invents contradictions.

**Compounds and generic definitions.** Shared components can make different compounds look more closely related than the complete words are. Definitions such as “a surname” can make unrelated names appear semantically identical.

**Candidate-selection bias.** Prefix matches add many pairs that have little learning value. Evaluating only generated pairs also hides useful comparisons that were never generated.

**Uncalibrated scores and labels.** Definition similarity varies with gloss length, wording, language, and sense coverage. We have no established mapping from these scores to the probability of a correct classification.

**Weak evaluation.** Category totals and a handful of familiar examples failed to expose broader errors. Ordinary browsing revealed failures our checks missed.

## Questions where we need advice

### 1. What should the dataset represent?

Can one exclusive category adequately describe a word pair with several meanings? Should historical relationship, meaning overlap, and learner confusion be separate dimensions? How should inherited cognates, direct borrowings, shared borrowings, compounds, and partial equivalence be represented?

Are labels such as “true cognate,” “accidental lookalike,” and “semantic narrowing” appropriate for the available evidence? Should learning games require stronger evidence than general lexicon results?

### 2. How should inference work with incomplete sources?

Which signals are dependable enough to combine: translations, gloss embeddings, spelling, pronunciation, part of speech, sound correspondences, and etymological statements? How should conflicting signals be resolved?

Is the current embedding approach suitable? Would calibrated rules, a small supervised model, or a different representation be a better starting point? How can incomplete ancestry records support useful decisions without requiring a comprehensive historical-language database?

### 3. How should we choose pairs and measure coverage?

What candidate-generation methods would retain useful vocabulary while reducing weak collisions? What independent vocabulary or concept sample could expose missing pairs and support meaningful overview statistics? How should ordinary words, names, rare senses, and compounds be weighted?

### 4. How can we establish that a change is better?

Our provisional plan is a reviewed benchmark across language pairs, ordinary vocabulary, and difficult cases. It would assess classifications and selected meanings separately, reserve an untouched test set, and keep related word families together to reduce leakage. Experiments would measure both classification errors and useful coverage.

How should this benchmark be sampled, sized, and reviewed? How should ambiguity and reviewer disagreement be scored? What native-speaker or linguistic input is necessary? How can we avoid an AI developer creating expected answers that reproduce its own assumptions? What acceptance criteria would justify a release?

### 5. How should we admit new languages?

What source coverage and evaluation should a new language satisfy? Which methods should be shared, and which need language-pair calibration? How can we detect regressions in existing languages and systematic errors in new ones when aggregate totals look plausible?

## Requested recommendation

Please identify the most consequential weaknesses in this approach and propose the first two or three experiments worth running, with explicit success and failure criteria. We welcome advice to change the taxonomy, evaluation plan, or underlying method, including approaches we should stop pursuing.

# Linduistics: Dataset & Implementation Limitations

This document provides a technical audit of current architectural constraints, dataset boundaries, and algorithm limitations across the Linduistics pipeline, database, NLP service, and user interface.

---

## 1. Source Data & Mining Pipeline

### 1.1 Wiktionary / Kaikki Extraction Bias
- **English-Centric Pivot Mining**: In [`pipeline/src/mine_translations.py`](file:///c:/Users/ollem/Git/Github/linduistics/pipeline/src/mine_translations.py), translation pairs and cross-lingual cliques were mined primarily by streaming the English Kaikki dump (`kaikki_en.jsonl`) and reading its translation sections. 
  - *Limitation*: Any word or sense that is not cataloged as an English translation target is omitted from the dataset cliques, even if a direct relationship exists between two non-English languages (e.g. Danish $\leftrightarrow$ Swedish dialectal cognates).
  - *Consequence*: Non-English pairs often have lower coverage than pairs where English is one of the nodes.

### 1.2 Exclusion of Closed-Class & Short Words
- **Length & Character Filtering**: The dataset builder in [`pipeline/src/build_crosslingual_dataset.py`](file:///c:/Users/ollem/Git/Github/linduistics/pipeline/src/build_crosslingual_dataset.py) excludes single-character words, tokens with spaces or hyphens, and certain function words during candidate generation (`if not en_word or " " in en_word or "-" in en_word:`).
  - *Limitation*: Single-letter words (such as English *I*, Swedish/Danish *i*, French *à*, *y*) and common clitics/contractions were systematically dropped or omitted from translation links during ingestion.
  - *Consequence*: Pronouns, basic prepositions, and grammatical articles frequently lack rows in `word_comparisons`, causing them to fall through to `unmatched` source forms in sentence tools.

### 1.3 Offline Dataset Scope
- **Hardcoded Target Languages in Offline Scripts**: Although the database schema and application code are language-agnostic, the offline mining scripts (`build_crosslingual_dataset.py`) were initially executed only on five languages (`en`, `de`, `sv`, `da`, `nb`).
  - *Limitation*: The dataset currently contains pairwise comparisons only for combinations of these five languages. Ingesting Romance (French, Spanish, Italian), Slavic, or other language families requires re-running extraction against additional Kaikki dumps.

### 1.4 Single-Pair Sense Flattening
- **Polysemy Collapsing**: In `word_comparisons`, each directed language pair `(word_a, word_b)` typically contains only one dominant scalar score for `semantic_sim` and `phonetic_sim`.
  - *Limitation*: Although `senses_a` and `senses_b` store JSON arrays of definitions, the primary categorization (`category`) and scalar metrics are pinned to the highest-scoring sense pair. Homographs with different parts of speech (e.g., Swedish *åker* as noun "field" vs. *åker* as finite verb form of *åka*) historically collided if Wiktionary only indexed the noun lemma as a canonical headword.

---

## 2. Database Schema & Coverage Gaps

### 2.1 Table Structure & Volume
- `word_comparisons` ($\approx 2.4\text{M}$ rows): Pairwise comparisons between headword lemmas.
- `word_inflections` ($\approx 5\text{M}$ rows across `sv`, `de`, `en`, `da`, `nb`): Declension and conjugation forms with morphological tags.
- `lemma_synonyms` ($\approx 120\text{k}$ lemmas): Synonyms extracted from sense blocks.
- `cognate_clusters` ($\approx 4\text{k}$ clusters): Groups linked by Proto-Indo-European or Proto-Germanic roots.

### 2.2 Coverage Gaps in `word_comparisons`
- **Missing Function-Word Translations**: Standard subject pronouns (e.g., Swedish *jag* $\leftrightarrow$ German *ich*, Swedish *jag* $\leftrightarrow$ English *I*) are not linked as translation pairs in `word_comparisons` because English Wiktionary translation sections often list objective pronouns (*me*) or omit 1-letter entries.
- **Asymmetric Pair Coverage**: Language pairs with smaller native Wiktionary entries (e.g. Norwegian Bokmål `nb` $\leftrightarrow$ German `de`) have significantly fewer paired entries than English $\leftrightarrow$ German or Swedish $\leftrightarrow$ English.
- **Null POS Fields**: Older scraped entries in `word_comparisons` have empty or null `pos_a` / `pos_b` columns, forcing queries to fall back to unconstrained POS matching when filtering.

---

## 3. NLP Service & Syntactic Parsing

### 3.1 Model Footprint & Parsing Quality
- **Small spaCy Pipeline Dependency**: The NLP service loads `*_core_news_sm` / `*_core_web_sm` models into memory.
  - *Limitation*: Small statistical/CNN pipelines ($\approx 12\text{--}15\text{ MB}$) have lower parsing and POS-tagging accuracy than transformer models (`_trf`) or large models (`_lg`).
  - *Consequence*: Complex sentence structures (e.g., nested relative clauses, topicalization, poetic inversions) can produce incorrect dependency heads or mistagged parts of speech.

### 3.2 Dynamic Fallback for Non-Installed Languages
- **Fallback to Blank Pipelines**: For languages without a downloaded spaCy model in `pipeline/.venv`, the service initializes `spacy.blank(lang)` with a simple rule-based sentencizer.
  - *Limitation*: Blank models perform white-space and punctuation tokenization only. They cannot produce part-of-speech tags, dependency trees (`ROOT`, `nsubj`, `obj`), or morphological feature dictionaries (`Mood`, `Tense`, `Case`, `Number`). In this mode, homograph disambiguation and slot-matching cannot function.

### 3.3 Homograph Resolution Boundaries
- **Lemmatization Reliability**: spaCy's lemmatizer resolves surface tokens based on statistical context. If a sentence is too short or lacks sufficient syntactic cues (e.g., single isolated words or telegraphic input), spaCy may select the wrong lemma (e.g. treating *fara* as noun "danger" rather than verb "to travel").

---

## 4. Inflection & Re-Inflection Engine

### 4.1 Heuristic Tag Matching
- **Kaikki Tag Incompatibilities**: Kaikki dumps use free-form English descriptive tags (`["present", "indicative", "active"]`, `["indefinite", "nominative", "singular"]`), whereas spaCy outputs Universal Dependencies morphological feature maps (`{"Mood": "Ind", "Tense": "Pres", "VerbForm": "Fin", "Voice": "Act"}`).
  - *Limitation*: Mapping between Universal Dependencies features and Kaikki tag arrays is handled by a static translation dictionary (`MORPH_TO_TAGS` in [`pipeline/src/nlp_service.py`](file:///c:/Users/ollem/Git/Github/linduistics/pipeline/src/nlp_service.py)). Unmapped or language-specific features (e.g. specific subjunctive moods, evidentials, dual numbers) are ignored during tag scoring.

### 4.2 Incomplete Declension Tables
- **Wiktionary Form Omissions**: `word_inflections` only contains inflected forms that were explicitly generated in Wiktionary declension tables.
  - *Limitation*: Rare, irregular, or suppletive forms (e.g. archaic plural verb forms, irregular adjective comparisons) are often absent or listed with a placeholder (`-`).
  - *Consequence*: If no inflected form matches the desired grammatical slot with positive score, the system falls back to the canonical lemma.

---

## 5. Universal Rewriter & Alternative Ranking

### 5.1 Synset Granularity
- **Unverified Synonym Substitutability**: Synonyms in `lemma_synonyms` are extracted from Wiktionary definition lines without sense-selection verification.
  - *Limitation*: Words that are synonymous in one domain (e.g. *fara* and *glida* in the sense of smooth movement) may be inappropriate or stylistic mismatches in a vehicular context (*glida bil* vs. *åka bil*). The system ranks by cognate universality across target languages, not by collocations or contextual semantic plausibility.

### 5.2 Proto-Root Clustered Expansion
- **Root-Level vs. Lemma-Level Semantics**: When querying `cognate_clusters` for alternative words, members share a verified historical Proto-Germanic/Indo-European root.
  - *Limitation*: Etymological cognates often have shifted meanings over thousands of years (e.g. *far* meaning "father" vs. *fara* meaning "to travel"). If a candidate is pulled from a cognate cluster without strict POS and semantic filtering, it can recommend words that share an ancestral root but have divergent modern semantics.

---

## 6. Approximate Translation (Lexical Calquing)

### 6.1 Calquing vs. Neural Machine Translation
- **Word-for-Word Substitution**: The `/translate-approximate` tool is a **lexical cognate calque**, not a machine translation engine.
  - *Limitation*: It replaces source tokens with the highest-ranking cognate/translation in the target language while attempting to match POS and morphological slot.
  - *Consequence*: It preserves the exact word order and syntax of the source sentence. It does **not** handle:
    - **Constituent Reordering**: Verb-second (V2) inversions, SOV subordinate clause structures, or postpositive adjective placements in target languages.
    - **Articles and Definiteness**: Languages with enclitic/suffixal definite articles (e.g. Swedish *staden*) mapped to languages with free definite articles (e.g. German *die Stadt*, English *the city*) produce uninflected nouns (*Stadt*, *city*) without inserting the required leading article.
    - **Particle Verbs & Idioms**: Phrasal verbs (e.g. Swedish *tycka om* $\to$ English *like*, German *aufhören* $\to$ English *stop*) are translated token-by-token rather than as unified multi-word expressions.

### 6.2 Target Language Slot Mismatch
- **Cross-Lingual Morphological Asymmetry**: When inflecting the target language word to match the source slot:
  - *Limitation*: Grammatical categories are not isomorphic across languages (e.g. Swedish nouns inflect for definiteness (*bil* vs *bilen*), whereas English nouns do not (*car* vs *\*caren*); German verbs inflect for person and number (*ich fahre*, *du fährst*), whereas Swedish verbs do not (*jag åker*, *du åker*)).
  - *Consequence*: The re-inflection engine can only map tags that exist in the target language's inflection table. If person/number is not marked in the source sentence (as in Scandinavian present verbs), the target German verb will default to an infinitive or base present form unless person agreement is inferred from the subject dependency node.

---

## 7. Cross-Lingual Universality Metric

### 7.1 Metric Formulation
$$\text{Coverage}(tok) = \frac{\sum_{t \in \text{Targets}} \text{Score}(t)}{|\text{Targets}|} \times 100$$
where:
- $\text{Score}(t) = 1.0 \times \text{sim}_{\text{phon}}$ for `true_cognate`
- $\text{Score}(t) = 0.6 \times \text{sim}_{\text{phon}}$ for `partial_cognate`
- $\text{Score}(t) = 0.0$ for `translation_pair`, `false_friend`, `other`, or missing tokens

### 7.2 Metric Limitations
- **Exclusion of Function Words from Recognition**: Because `translation_pair` yields $0.0$, sentences containing non-cognate function words will register low universality scores even if the vocabulary is widely understood.
- **Equal Weighting of Target Languages**: Each target language in `target_langs` contributes equally to the divisor, regardless of language family distance or speaker population. Comparing Swedish against Danish, Norwegian, German, and English treats a missing English cognate with the same mathematical penalty as a missing Scandinavian cognate.

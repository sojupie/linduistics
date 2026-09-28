# Linduistics: Comparative Linguistics Game Modes Specification

This document details the game design architecture, pedagogical goals, scoring mechanics, and database query bindings for current and future linguistics game modes in Linduistics.

---

## 1. Game Mode Portfolio Overview

| Game Mode | Core Mechanic | Target Linguistic Competence | Primary Database Source | Difficulty Profile |
| :--- | :--- | :--- | :--- | :--- |
| **1. Definition Decryption** *(Active)* | 4-choice definition identification featuring the deceptive source meaning as an active cognitive trap. | Semantic disambiguation & resisting false transfer. | `word_comparisons` (`category = 'false_friend'`) | Introductory to Intermediate |
| **2. The Minefield** *(Planned)* | Identify whether a misleading pair has a shared origin or distinct recorded roots. | Etymological relation, separate from meaning overlap. | `word_comparisons` (`category = 'false_friend'`, `etymological_relation`) | Fast-Paced / Arcade |
| **3. Semantic Drift Detective** *(Planned)* | Trace how a shared Proto-Germanic root specialized into divergent modern senses. | Etymological comprehension & semantic shift mechanics. | `word_comparisons` (`partial_cognate`) + `cognate_clusters` | Advanced / Analytical |
| **4. The Absurd Cloze** *(Planned)* | Fill-in-the-blank contextual sentence where choosing the false friend results in a humorous mistranslation. | In-context reading comprehension and register verification. | `word_comparisons` + `word_inflections` + spaCy slot validation | Practical / Applied |

---

## 2. Mode 1: Definition Decryption (Current Production Mode)

### 2.1 Concept & Pedagogical Goal
Language learners confronting deceptive lookalikes (e.g. English *glut* vs Danish *glut*, or English *gift* vs German *Gift*) instinctively map the familiar meaning from their native/source tongue onto the foreign word. This mode trains lexical resistance by deliberately placing the source meaning into the option set as a **Cognitive Trap**.

### 2.2 Option Assembly Algorithm
For a given false friend pair $(A, B)$ where $A \in \text{Lang}_A$ and $B \in \text{Lang}_B$:
1. **Target Reality (1 slot)**: The actual definition of the target headword (`def_b`).
2. **Cognitive Trap (1 slot)**: The misleading definition of the source headword (`def_a`).
3. **Plausible Distractors (2 slots)**: Retrieved from a pre-fetched pool of distinct, substantive definitions in $\text{Lang}_B$ (`length(def_b) > 5`).
4. **Randomized Presentation**: All 4 options are shuffled using Fisher-Yates.

### 2.3 Gameplay & Feedback Loop
- **Hotkeys**: Keys `[1]`, `[2]`, `[3]`, `[4]` map to options for keyboard play. `[Enter]` or `[Space]` advances to the next question.
- **Answer Classification**:
  - *Correct Selection*: Confirms the real target meaning (`[Target Reality ✓]`), increments score, increases streak.
  - *Trap Selection*: Highlights the cognitive failure mode (`[Cognitive Trap ⚠️: This is what it means in {LangA}, not {LangB}!]`), resets streak, increments trap counter.
  - *Random Distractor*: Highlights the error and reveals both the real answer and the avoided trap.
- **The Etymological Autopsy**:
  - Unfolds below the answered question.
  - Displays the lineage for both words (`etym_text_a` and `etym_text_b`).
  - Explains the divergence archetype:
    - `false_cognate`: Similar-looking words with distinct recorded roots.
    - `cognate`: Historically related words whose modern meanings have diverged enough to mislead.
    - `unknown`: Similar-looking words whose historical relationship remains unverified in the available records.

### 2.4 Viewing Modes (Preventing English Triangulation)
When playing between two non-English languages (e.g. Danish $\leftrightarrow$ German), displaying English definitions upfront allows players to eliminate the trap purely by pattern-matching English strings. The quiz supports three viewing modes to preserve immersion and puzzle integrity:
1. **Blind Deck (Default / Recommended)**: Both source and target headwords (with POS and IPA) are displayed side-by-side, but the source definition is masked with a click-to-reveal hint (`[Definition masked · click to reveal hint]` or hotkey `[H]`). Forces the player to rely on their own knowledge of the source language rather than triangulating via English.
2. **Target Only (Pure Challenge)**: Collapses the source counterpart entirely during the question phase. The player must deduce the target word's definition strictly from target language knowledge. The counterpart, cognitive trap disclosure, and etymology reveal upon submitting an answer.
3. **Assisted (Study Mode)**: Displays both words and the source definition openly upfront for introductory study.

---

## 3. Mode 2: The Minefield (Shared Root or False Cognate?)

### 3.1 Concept & Mechanics
A rapid-fire, streak-oriented game testing whether false-friend pairs share a recorded origin. False friends can be cognates, so the game does not treat those labels as opposites.
- The player is presented with a word pair side-by-side:
  - Example 1: English *finger* $\leftrightarrow$ German *Finger*
  - Example 2: English *mist* $\leftrightarrow$ German *Mist* (German: "manure / dung")
- **Player Actions**: Two primary buttons:
  - `[Z] Cognate false friend` (Shared recorded root, divergent meanings)
  - `[X] False cognate` (Similar forms with distinct recorded roots)
- **Scoring**:
  - Timed round: 60 seconds or 20 items.
  - Multiplier increases with consecutive correct classifications.
  - Immediate audio/visual cue with semantic similarity gauge reveal ($> 0.85$ for cognates, $< 0.30$ for false friends).

### 3.2 Database Sourcing
```sql
(
    SELECT id, lang_a, word_a, lang_b, word_b, 'cognate' AS ground_truth
    FROM word_comparisons
    WHERE lang_a = $1 AND lang_b = $2 AND category = 'true_cognate'
    ORDER BY random() LIMIT 10
)
UNION ALL
(
    SELECT id, lang_a, word_a, lang_b, word_b, 'false_friend' AS ground_truth
    FROM word_comparisons
    WHERE lang_a = $1 AND lang_b = $2 AND category = 'false_friend'
    ORDER BY random() LIMIT 10
)
ORDER BY random();
```

---

## 4. Mode 3: Semantic Drift Detective

### 4.1 Concept & Mechanics
Focuses on partial cognates—words that descend from the exact same Proto-Germanic root, but underwent historical specialization.
- **Example**:
  - Proto-Germanic `*sterbaną` ("to become stiff, die")
  - German *sterben*: Maintained broad meaning ("to die of any cause").
  - English *starve*: Narrowed historically to specialized meaning ("to die specifically of hunger").
- **Gameplay**:
  - The player is shown the Proto-Germanic or Proto-Indo-European root reconstructed from `cognate_clusters`.
  - Player must deduce which of the modern Germanic descendants narrowed, which generalized, and which preserved archaic senses.
  - Matching game linking etymological root cards to modern branch definitions.

---

## 5. Mode 4: The Absurd Cloze (Contextual Mistranslation)

### 5.1 Concept & Mechanics
Demonstrates the real-world hazard of false friends in written prose.
- A synthetic or authentic sentence in $\text{Lang}_B$ has a missing slot:
  - Danish: *"Servitricen bragte os en regning med en uventet ______."*
- Options:
  1. *drikkepenge* (tip / gratuity) — Correct target term.
  2. *gift* (poison in Danish; trap for English speaker thinking of "gift / present").
  3. *hilsen* (greeting).
  4. *rabat* (discount).
- If the player selects the false friend (*gift*), the UI displays the literal mistranslated sentence in English:
  - *"The waitress brought us a bill with an unexpected poison."*
- Reinforces retention through narrative absurdity.

---

## 6. Implementation Milestones

- [x] **Phase 1**: Definition Decryption backend bug fix (subquery distractor pool) & UI overhaul with cognitive trap tagging and Etymological Autopsy.
- [ ] **Phase 2**: The Minefield binary classification lightning mode with timer and streak multipliers.
- [ ] **Phase 3**: Semantic Drift Detective integration using `cognate_clusters` root etymologies.
- [ ] **Phase 4**: In-context sentence cloze engine utilizing the spaCy inflection pipeline.

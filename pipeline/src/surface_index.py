"""Surface Candidate Indexer for Germanic Lexicon Engine.

Builds an in-memory inverted n-gram index over target headwords and IPAs
to retrieve surface candidate pairs (Cognates & False Friends) in O(N log M)
without evaluating full N x M combinations.
"""

from collections import defaultdict
from typing import Dict, Iterable, List, Optional, Set

from ipa_normalizer import normalize_ipa, phonetic_similarity
from linguistic_metrics import orthographic_similarity


def extract_ngrams(text: str, n: int = 2) -> Set[str]:
    """Extracts character n-grams from text."""
    if not text:
        return set()
    cleaned = text.strip().lower()
    if len(cleaned) < n:
        return {cleaned}
    return {cleaned[i : i + n] for i in range(len(cleaned) - n + 1)}


class SurfaceIndex:
    """Inverted index over orthographic and phonetic representations."""

    def __init__(self, target_entries: Iterable[dict]):
        self.entries: Dict[str, dict] = {}
        self.orth_index: Dict[str, Set[str]] = defaultdict(set)
        self.phon_index: Dict[str, Set[str]] = defaultdict(set)
        self.prefix_index: Dict[str, Set[str]] = defaultdict(set)

        self._build_index(target_entries)

    def _build_index(self, target_entries: Iterable[dict]) -> None:
        for item in target_entries:
            word = item.get("word", "").strip().lower()
            if not word:
                continue

            ipa = normalize_ipa(item.get("ipa", ""))
            self.entries[word] = {
                "word": word,
                "ipa": ipa,
                "pos": item.get("pos", ""),
                "glosses": item.get("glosses", []),
                "raw": item,
            }

            # Orthographic 2-grams
            for gram in extract_ngrams(word, n=2):
                self.orth_index[gram].add(word)

            # Prefix indexing (first 2 chars)
            if len(word) >= 2:
                self.prefix_index[word[:2]].add(word)
            else:
                self.prefix_index[word].add(word)

            # Phonetic 2-grams
            if ipa:
                for gram in extract_ngrams(ipa, n=2):
                    self.phon_index[gram].add(word)

    def find_candidates(
        self,
        word: str,
        ipa: Optional[str] = None,
        min_orth: float = 0.50,
        min_phon: float = 0.50,
    ) -> List[dict]:
        """Retrieves candidates from the target lexicon that exceed surface thresholds."""
        norm_word = word.strip().lower()
        if not norm_word:
            return []

        norm_ipa = normalize_ipa(ipa) if ipa else ""

        # Gather candidate pool via inverted indexes
        potential_words: Set[str] = set()

        # Gather via orthographic n-grams and prefixes
        word_grams = extract_ngrams(norm_word, n=2)
        for gram in word_grams:
            potential_words.update(self.orth_index.get(gram, ()))

        if len(norm_word) >= 2:
            potential_words.update(self.prefix_index.get(norm_word[:2], ()))
        else:
            potential_words.update(self.prefix_index.get(norm_word, ()))

        # Gather via phonetic n-grams
        if norm_ipa:
            ipa_grams = extract_ngrams(norm_ipa, n=2)
            for gram in ipa_grams:
                potential_words.update(self.phon_index.get(gram, ()))

        # Exact distance scoring on pruned candidates
        matches: List[dict] = []
        for cand_word in potential_words:
            cand_entry = self.entries[cand_word]
            cand_ipa = cand_entry["ipa"]

            s_orth = orthographic_similarity(norm_word, cand_word)
            s_phon = (
                phonetic_similarity(norm_ipa, cand_ipa)
                if (norm_ipa and cand_ipa)
                else 0.0
            )

            if s_orth >= min_orth or s_phon >= min_phon:
                matches.append(
                    {
                        "word": cand_word,
                        "ipa": cand_ipa,
                        "pos": cand_entry["pos"],
                        "glosses": cand_entry["glosses"],
                        "orthographic_sim": s_orth,
                        "phonetic_sim": s_phon,
                    }
                )

        # Sort descending by best surface similarity
        matches.sort(
            key=lambda x: max(x["orthographic_sim"], x["phonetic_sim"]),
            reverse=True,
        )
        return matches

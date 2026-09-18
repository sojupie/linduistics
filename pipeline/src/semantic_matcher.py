"""Semantic Vector Matcher and Cross-Sense Scorer.

Computes dense vector representations of definition glosses, retrieves
cross-lingual semantic candidates via vector similarity, and extracts
argmax sense pairs for attribution.
"""

from typing import Any, Dict, Iterable, List, Optional, Tuple
import numpy as np


class SemanticMatcher:
    """Encodes glosses and finds high-affinity semantic translation candidates."""

    def __init__(
        self,
        model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        model: Optional[Any] = None,
    ):
        self.model_name = model_name
        self._model = model
        self._cache: Dict[str, np.ndarray] = {}
        self.target_words: List[str] = []
        self.target_metadata: Dict[str, dict] = {}
        self.target_gloss_vectors: Optional[np.ndarray] = None
        self.gloss_to_word_idx: List[int] = []
        self.gloss_texts: List[str] = []

    def _get_model(self) -> Any:
        if self._model is None:
            import torch
            from sentence_transformers import SentenceTransformer

            device = "cuda" if torch.cuda.is_available() else "cpu"
            self._model = SentenceTransformer(self.model_name, device=device)
        return self._model

    def preencode_glosses(self, texts: Iterable[str], batch_size: int = 256) -> None:
        """Pre-encodes an iterable of unique glosses in large batches into memory cache."""
        missing = [
            t.strip() for t in texts if t and t.strip() and t.strip() not in self._cache
        ]
        unique_missing = list(dict.fromkeys(missing))
        if not unique_missing:
            return

        model = self._get_model()
        vecs = model.encode(
            unique_missing,
            batch_size=batch_size,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        for text, vec in zip(unique_missing, vecs):
            self._cache[text] = np.asarray(vec, dtype=np.float32)

    def encode(self, texts: List[str]) -> np.ndarray:
        """Encodes texts into normalized dense vectors using cache when available."""
        if not texts:
            return np.empty((0, 0), dtype=np.float32)

        cleaned = [t.strip() for t in texts]
        uncached = [t for t in cleaned if t and t not in self._cache]
        if uncached:
            self.preencode_glosses(uncached)

        result = [self._cache[t] for t in cleaned if t in self._cache]
        if not result:
            return np.empty((0, 0), dtype=np.float32)
        return np.array(result, dtype=np.float32)

    def compute_sense_similarity(
        self, glosses_a: List[str], glosses_b: List[str]
    ) -> Tuple[float, str, str]:
        """Calculates max cosine similarity across sense pairs with argmax attribution.

        Returns:
            (max_similarity, best_gloss_a, best_gloss_b)
        """
        valid_a = [g.strip() for g in glosses_a if g and g.strip()]
        valid_b = [g.strip() for g in glosses_b if g and g.strip()]

        if not valid_a or not valid_b:
            return 0.0, "", ""

        vecs_a = self.encode(valid_a)
        vecs_b = self.encode(valid_b)

        # Dot product of normalized vectors = cosine similarity
        sim_matrix = np.dot(vecs_a, vecs_b.T)

        best_flat_idx = int(np.argmax(sim_matrix))
        best_i, best_j = np.unravel_index(best_flat_idx, sim_matrix.shape)
        max_sim = float(sim_matrix[best_i, best_j])

        return (
            float(max(0.0, min(1.0, max_sim))),
            valid_a[best_i],
            valid_b[best_j],
        )

    def index_target_lexicon(self, target_entries: Iterable[dict]) -> None:
        """Pre-encodes all target lemma glosses for high-speed candidate retrieval."""
        self.target_words = []
        self.target_metadata = {}
        all_glosses: List[str] = []
        self.gloss_to_word_idx = []
        self.gloss_texts = []

        for idx, item in enumerate(target_entries):
            word = item.get("word", "").strip().lower()
            if not word:
                continue

            self.target_words.append(word)
            self.target_metadata[word] = {
                "word": word,
                "ipa": item.get("ipa", ""),
                "pos": item.get("pos", ""),
                "glosses": item.get("glosses", []),
            }

            glosses = [g.strip() for g in item.get("glosses", []) if g and g.strip()]
            if not glosses:
                # If no explicit glosses, use headword as fallback
                glosses = [word]

            for g in glosses:
                all_glosses.append(g)
                self.gloss_to_word_idx.append(len(self.target_words) - 1)
                self.gloss_texts.append(g)

        if all_glosses:
            self.target_gloss_vectors = self.encode(all_glosses)
        else:
            self.target_gloss_vectors = np.empty((0, 0), dtype=np.float32)

    def find_candidates(
        self,
        source_glosses: List[str],
        min_sem: float = 0.50,
        top_k: int = 15,
    ) -> List[dict]:
        """Finds top semantic candidate target words matching any source gloss."""
        valid_source = [g.strip() for g in source_glosses if g and g.strip()]
        if (
            not valid_source
            or self.target_gloss_vectors is None
            or len(self.target_gloss_vectors) == 0
        ):
            return []

        source_vecs = self.encode(valid_source)
        # Dot product matrix: shape (|source_glosses|, |target_glosses|)
        sim_matrix = np.dot(source_vecs, self.target_gloss_vectors.T)

        # Track best score and sense pair per target word
        best_per_word: Dict[int, Tuple[float, int, int]] = {}

        for src_idx in range(sim_matrix.shape[0]):
            for tgt_gloss_idx in range(sim_matrix.shape[1]):
                score = float(sim_matrix[src_idx, tgt_gloss_idx])
                word_idx = self.gloss_to_word_idx[tgt_gloss_idx]
                if word_idx not in best_per_word or score > best_per_word[word_idx][0]:
                    best_per_word[word_idx] = (score, src_idx, tgt_gloss_idx)

        candidates: List[dict] = []
        for word_idx, (score, src_idx, tgt_gloss_idx) in best_per_word.items():
            if score >= min_sem:
                word = self.target_words[word_idx]
                meta = self.target_metadata[word]
                candidates.append(
                    {
                        "word": word,
                        "semantic_sim": float(max(0.0, min(1.0, score))),
                        "best_def_a": valid_source[src_idx],
                        "best_def_b": self.gloss_texts[tgt_gloss_idx],
                        "ipa": meta["ipa"],
                        "pos": meta["pos"],
                        "glosses": meta["glosses"],
                    }
                )

        candidates.sort(key=lambda x: x["semantic_sim"], reverse=True)
        return candidates[:top_k]

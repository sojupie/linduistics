"""Dual-Channel Scoring and Classification Engine.

Combines Channel A (surface inverted index) and Channel B (semantic vector retrieval)
to evaluate cross-lingual headwords, assign continuous metrics and quadrant categories,
and export symmetrical Parquet comparison records.
"""

import argparse
import os
from typing import Dict, List, Optional
import pyarrow as pa
import pyarrow.parquet as pq
from tqdm import tqdm

from classifier import classify_pair
from ipa_normalizer import phonetic_similarity
from linguistic_metrics import orthographic_similarity
from semantic_matcher import SemanticMatcher
from surface_index import SurfaceIndex


def load_lemmas(parquet_path: str, limit: Optional[int] = None) -> List[dict]:
    """Loads lemma records from a Parquet file."""
    table = pq.read_table(parquet_path)
    if limit and limit < table.num_rows:
        table = table.slice(0, limit)

    pydict = table.to_pydict()
    entries = []
    num_rows = len(pydict["word"])
    for i in range(num_rows):
        entries.append(
            {
                "word": pydict["word"][i],
                "pos": pydict["pos"][i],
                "ipa": pydict["ipa"][i],
                "glosses": pydict["glosses"][i],
                "lang": pydict["lang"][i],
            }
        )
    return entries


def score_lexicons(
    source_lemmas: List[dict],
    target_lemmas: List[dict],
    matcher: Optional[SemanticMatcher] = None,
    min_orth: float = 0.50,
    min_phon: float = 0.50,
    min_sem: float = 0.50,
    top_k_sem: int = 15,
) -> List[dict]:
    """Runs dual-channel retrieval, computes continuous scores, and classifies pairs."""
    if matcher is None:
        matcher = SemanticMatcher()

    print("Building Channel A (Surface Inverted Index)...")
    surface_index = SurfaceIndex(target_lemmas)

    print("Building Channel B (Semantic Gloss Embedding Index)...")
    matcher.index_target_lexicon(target_lemmas)

    print("Pre-encoding source lemma glosses in batch...")
    all_source_glosses = [
        g for src in source_lemmas for g in src.get("glosses", []) if g
    ]
    matcher.preencode_glosses(all_source_glosses, batch_size=256)

    target_by_word: Dict[str, dict] = {item["word"]: item for item in target_lemmas}
    evaluated_pairs: List[dict] = []
    seen_pairs = set()

    print(
        f"Evaluating {len(source_lemmas)} source lemmas against target lexicon..."
    )
    for src in tqdm(source_lemmas, desc="Scoring pairs"):
        word_a = src["word"]
        ipa_a = src["ipa"]
        glosses_a = src["glosses"]
        pos_a = src["pos"]
        lang_a = src["lang"]

        # 1. Channel A: Surface Candidates
        surface_matches = surface_index.find_candidates(
            word=word_a, ipa=ipa_a, min_orth=min_orth, min_phon=min_phon
        )
        surface_dict = {m["word"]: m for m in surface_matches}

        # 2. Channel B: Semantic Candidates
        semantic_matches = matcher.find_candidates(
            source_glosses=glosses_a, min_sem=min_sem, top_k=top_k_sem
        )
        semantic_dict = {m["word"]: m for m in semantic_matches}

        # 3. Candidate Fusion
        candidate_words = set(surface_dict.keys()) | set(semantic_dict.keys())

        for word_b in candidate_words:
            pair_key = (word_a, word_b)
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)

            tgt = target_by_word[word_b]
            ipa_b = tgt["ipa"]
            glosses_b = tgt["glosses"]
            pos_b = tgt["pos"]
            lang_b = tgt["lang"]

            # Compute or retrieve surface scores
            if word_b in surface_dict:
                s_orth = surface_dict[word_b]["orthographic_sim"]
                s_phon = surface_dict[word_b]["phonetic_sim"]
            else:
                s_orth = orthographic_similarity(word_a, word_b)
                s_phon = (
                    phonetic_similarity(ipa_a, ipa_b)
                    if (ipa_a and ipa_b)
                    else 0.0
                )

            # Compute or retrieve semantic scores and best glosses
            if word_b in semantic_dict:
                s_sem = semantic_dict[word_b]["semantic_sim"]
                def_a = semantic_dict[word_b]["best_def_a"]
                def_b = semantic_dict[word_b]["best_def_b"]
            else:
                s_sem, def_a, def_b = matcher.compute_sense_similarity(
                    glosses_a, glosses_b
                )

            # Fallback if no matching gloss found
            if not def_a and glosses_a:
                def_a = glosses_a[0]
            if not def_b and glosses_b:
                def_b = glosses_b[0]

            pair_max_len = max(len(word_a), len(word_b))
            category = classify_pair(
                s_orth=s_orth,
                s_phon=s_phon,
                s_sem=s_sem,
                max_len=pair_max_len,
                word_a=word_a,
                word_b=word_b,
            )

            # Base pair
            pair_record = {
                "lang_a": lang_a,
                "word_a": word_a,
                "ipa_a": ipa_a,
                "def_a": def_a,
                "pos_a": pos_a,
                "lang_b": lang_b,
                "word_b": word_b,
                "ipa_b": ipa_b,
                "def_b": def_b,
                "pos_b": pos_b,
                "orthographic_sim": float(s_orth),
                "phonetic_sim": float(s_phon),
                "semantic_sim": float(s_sem),
                "category": category,
            }
            evaluated_pairs.append(pair_record)

            # Symmetrical inverse pair
            inverse_record = {
                "lang_a": lang_b,
                "word_a": word_b,
                "ipa_a": ipa_b,
                "def_a": def_b,
                "pos_a": pos_b,
                "lang_b": lang_a,
                "word_b": word_a,
                "ipa_b": ipa_a,
                "def_b": def_a,
                "pos_b": pos_a,
                "orthographic_sim": float(s_orth),
                "phonetic_sim": float(s_phon),
                "semantic_sim": float(s_sem),
                "category": category,
            }
            evaluated_pairs.append(inverse_record)

    return evaluated_pairs


def export_comparisons_to_parquet(
    pairs: List[dict], output_path: str
) -> None:
    """Serializes evaluated comparison pairs to Parquet."""
    schema = pa.schema(
        [
            ("lang_a", pa.string()),
            ("word_a", pa.string()),
            ("ipa_a", pa.string()),
            ("def_a", pa.string()),
            ("pos_a", pa.string()),
            ("lang_b", pa.string()),
            ("word_b", pa.string()),
            ("ipa_b", pa.string()),
            ("def_b", pa.string()),
            ("pos_b", pa.string()),
            ("orthographic_sim", pa.float32()),
            ("phonetic_sim", pa.float32()),
            ("semantic_sim", pa.float32()),
            ("category", pa.string()),
        ]
    )

    arrays = [
        pa.array([p["lang_a"] for p in pairs], type=pa.string()),
        pa.array([p["word_a"] for p in pairs], type=pa.string()),
        pa.array([p["ipa_a"] for p in pairs], type=pa.string()),
        pa.array([p["def_a"] for p in pairs], type=pa.string()),
        pa.array([p["pos_a"] for p in pairs], type=pa.string()),
        pa.array([p["lang_b"] for p in pairs], type=pa.string()),
        pa.array([p["word_b"] for p in pairs], type=pa.string()),
        pa.array([p["ipa_b"] for p in pairs], type=pa.string()),
        pa.array([p["def_b"] for p in pairs], type=pa.string()),
        pa.array([p["pos_b"] for p in pairs], type=pa.string()),
        pa.array([p["orthographic_sim"] for p in pairs], type=pa.float32()),
        pa.array([p["phonetic_sim"] for p in pairs], type=pa.float32()),
        pa.array([p["semantic_sim"] for p in pairs], type=pa.float32()),
        pa.array([p["category"] for p in pairs], type=pa.string()),
    ]

    table = pa.Table.from_arrays(arrays, schema=schema)
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    pq.write_table(table, output_path, compression="zstd")
    print(f"Exported {len(pairs)} symmetrical pairs to {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Score lexical pairs between two Germanic lemma Parquet files"
    )
    parser.add_argument(
        "--source", "-s", required=True, help="Path to source lemmas Parquet"
    )
    parser.add_argument(
        "--target", "-t", required=True, help="Path to target lemmas Parquet"
    )
    parser.add_argument(
        "--output", "-o", required=True, help="Path to output comparisons Parquet"
    )
    parser.add_argument(
        "--limit-source",
        type=int,
        default=None,
        help="Max source lemmas to evaluate",
    )
    parser.add_argument(
        "--limit-target",
        type=int,
        default=None,
        help="Max target lemmas to index",
    )
    parser.add_argument(
        "--min-orth",
        type=float,
        default=0.50,
        help="Min orthographic threshold for Channel A",
    )
    parser.add_argument(
        "--min-phon",
        type=float,
        default=0.50,
        help="Min phonetic threshold for Channel A",
    )
    parser.add_argument(
        "--min-sem",
        type=float,
        default=0.50,
        help="Min semantic threshold for Channel B",
    )
    parser.add_argument(
        "--top-k-sem",
        type=int,
        default=15,
        help="Top semantic candidates to retrieve per lemma",
    )
    args = parser.parse_args()

    print(f"Loading source lemmas from {args.source}...")
    source_lemmas = load_lemmas(args.source, limit=args.limit_source)
    print(f"Loading target lemmas from {args.target}...")
    target_lemmas = load_lemmas(args.target, limit=args.limit_target)

    pairs = score_lexicons(
        source_lemmas=source_lemmas,
        target_lemmas=target_lemmas,
        min_orth=args.min_orth,
        min_phon=args.min_phon,
        min_sem=args.min_sem,
        top_k_sem=args.top_k_sem,
    )

    export_comparisons_to_parquet(pairs, args.output)


if __name__ == "__main__":
    main()

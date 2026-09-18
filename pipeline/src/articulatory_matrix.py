"""Articulatory Phonetic Feature Matrix and Metric Closure.

Maps Germanic IPA phonemes to continuous articulatory feature coordinates
and precomputes a dense, cache-aligned distance matrix with Floyd-Warshall
metric closure satisfying the symmetric triangle inequality.
"""

from typing import Dict, Tuple
import numpy as np

# ---------------------------------------------------------------------------
# Feature Space Dimensions & Weights
# ---------------------------------------------------------------------------
# Consonants:
#   manner: 0=plosive, 1=affricate, 2=fricative, 3=nasal, 4=liquid, 5=glide
#   place:  0=bilabial, 1=labiodental, 2=dental, 3=alveolar, 4=postalveolar,
#           5=retroflex, 6=palatal, 7=velar, 8=uvular, 9=glottal
#   voice:  0=voiceless, 1=voiced
#
# Vowels:
#   height: 0=close, 1=near-close, 2=close-mid, 3=mid, 4=open-mid, 5=near-open, 6=open
#   back:   0=front, 1=central, 2=back
#   round:  0=unrounded, 1=rounded
# ---------------------------------------------------------------------------

W_MANNER = 0.40
W_PLACE = 0.40
W_VOICE = 0.20

W_HEIGHT = 0.45
W_BACK = 0.40
W_ROUND = 0.15

# Consonant feature tuples: (manner, place, voice)
# manner normalized / 5.0, place normalized / 9.0, voice in {0, 1}
CONSONANT_FEATURES: Dict[str, Tuple[float, float, float]] = {
    # Plosives
    "p": (0.0, 0.0, 0.0),       # bilabial voiceless
    "b": (0.0, 0.0, 1.0),       # bilabial voiced
    "t": (0.0, 3.0 / 9.0, 0.0), # alveolar voiceless
    "d": (0.0, 3.0 / 9.0, 1.0), # alveolar voiced
    "ʈ": (0.0, 5.0 / 9.0, 0.0), # retroflex voiceless
    "ɖ": (0.0, 5.0 / 9.0, 1.0), # retroflex voiced
    "k": (0.0, 7.0 / 9.0, 0.0), # velar voiceless
    "ɡ": (0.0, 7.0 / 9.0, 1.0), # velar voiced
    "g": (0.0, 7.0 / 9.0, 1.0), # ascii g canonicalized to ɡ
    "q": (0.0, 8.0 / 9.0, 0.0), # uvular voiceless
    "ʔ": (0.0, 9.0 / 9.0, 0.0), # glottal stop

    # Affricates (atomic)
    "č": (1.0 / 5.0, 4.0 / 9.0, 0.0), # postalveolar voiceless affricate (tʃ)
    "ǧ": (1.0 / 5.0, 4.0 / 9.0, 1.0), # postalveolar voiced affricate (dʒ)
    "c": (1.0 / 5.0, 3.0 / 9.0, 0.0), # alveolar voiceless affricate (ts)
    "ż": (1.0 / 5.0, 3.0 / 9.0, 1.0), # alveolar voiced affricate (dz)

    # Fricatives
    "f": (2.0 / 5.0, 1.0 / 9.0, 0.0), # labiodental voiceless
    "v": (2.0 / 5.0, 1.0 / 9.0, 1.0), # labiodental voiced
    "θ": (2.0 / 5.0, 2.0 / 9.0, 0.0), # dental voiceless
    "ð": (2.0 / 5.0, 2.0 / 9.0, 1.0), # dental voiced
    "s": (2.0 / 5.0, 3.0 / 9.0, 0.0), # alveolar voiceless
    "z": (2.0 / 5.0, 3.0 / 9.0, 1.0), # alveolar voiced
    "ʃ": (2.0 / 5.0, 4.0 / 9.0, 0.0), # postalveolar voiceless
    "ʒ": (2.0 / 5.0, 4.0 / 9.0, 1.0), # postalveolar voiced
    "ʂ": (2.0 / 5.0, 5.0 / 9.0, 0.0), # retroflex voiceless
    "ʐ": (2.0 / 5.0, 5.0 / 9.0, 1.0), # retroflex voiced
    "ç": (2.0 / 5.0, 6.0 / 9.0, 0.0), # palatal voiceless
    "ʝ": (2.0 / 5.0, 6.0 / 9.0, 1.0), # palatal voiced
    "x": (2.0 / 5.0, 7.0 / 9.0, 0.0), # velar voiceless
    "ɣ": (2.0 / 5.0, 7.0 / 9.0, 1.0), # velar voiced
    "χ": (2.0 / 5.0, 8.0 / 9.0, 0.0), # uvular voiceless
    "ʁ": (2.0 / 5.0, 8.0 / 9.0, 1.0), # uvular voiced
    "h": (2.0 / 5.0, 9.0 / 9.0, 0.0), # glottal voiceless
    "ɦ": (2.0 / 5.0, 9.0 / 9.0, 1.0), # glottal voiced
    "ɧ": (2.0 / 5.0, 5.5 / 9.0, 0.0), # Swedish sj-sound
    "ɕ": (2.0 / 5.0, 4.5 / 9.0, 0.0), # Swedish/Norwegian tj-sound

    # Nasals
    "m": (3.0 / 5.0, 0.0, 1.0),       # bilabial voiced
    "ɱ": (3.0 / 5.0, 1.0 / 9.0, 1.0), # labiodental voiced
    "n": (3.0 / 5.0, 3.0 / 9.0, 1.0), # alveolar voiced
    "ɳ": (3.0 / 5.0, 5.0 / 9.0, 1.0), # retroflex voiced
    "ɲ": (3.0 / 5.0, 6.0 / 9.0, 1.0), # palatal voiced
    "ŋ": (3.0 / 5.0, 7.0 / 9.0, 1.0), # velar voiced

    # Liquids (Lateral & Rhotic)
    "l": (4.0 / 5.0, 3.0 / 9.0, 1.0), # alveolar lateral
    "ɭ": (4.0 / 5.0, 5.0 / 9.0, 1.0), # retroflex lateral
    "ɫ": (4.0 / 5.0, 5.0 / 9.0, 1.0), # velarized alveolar lateral
    "r": (4.0 / 5.0, 3.0 / 9.0, 1.0), # alveolar trill
    "ɾ": (4.0 / 5.0, 3.0 / 9.0, 1.0), # alveolar tap
    "ɹ": (4.0 / 5.0, 3.5 / 9.0, 1.0), # alveolar approximant
    "ʀ": (4.0 / 5.0, 8.0 / 9.0, 1.0), # uvular trill

    # Glides
    "j": (1.0, 6.0 / 9.0, 1.0),       # palatal approximant
    "w": (1.0, 0.0, 1.0),             # labiovelar approximant
    "ʍ": (1.0, 0.0, 0.0),             # voiceless labiovelar
    "ʋ": (1.0, 1.0 / 9.0, 1.0),       # labiodental approximant
}

# Vowel feature tuples: (height, backness, roundness)
# height normalized / 6.0, backness normalized / 2.0, roundness in {0, 1}
VOWEL_FEATURES: Dict[str, Tuple[float, float, float]] = {
    # Close
    "i": (0.0, 0.0, 0.0),             # close front unrounded
    "y": (0.0, 0.0, 1.0),             # close front rounded
    "ɨ": (0.0, 0.5, 0.0),             # close central unrounded
    "ʉ": (0.0, 0.5, 1.0),             # close central rounded
    "ɯ": (0.0, 1.0, 0.0),             # close back unrounded
    "u": (0.0, 1.0, 1.0),             # close back rounded

    # Near-close
    "ɪ": (1.0 / 6.0, 0.25, 0.0),      # near-close near-front unrounded
    "ʏ": (1.0 / 6.0, 0.25, 1.0),      # near-close near-front rounded
    "ʊ": (1.0 / 6.0, 0.75, 1.0),      # near-close near-back rounded

    # Close-mid
    "e": (2.0 / 6.0, 0.0, 0.0),       # close-mid front unrounded
    "ø": (2.0 / 6.0, 0.0, 1.0),       # close-mid front rounded
    "ɘ": (2.0 / 6.0, 0.5, 0.0),       # close-mid central unrounded
    "ɵ": (2.0 / 6.0, 0.5, 1.0),       # close-mid central rounded
    "o": (2.0 / 6.0, 1.0, 1.0),       # close-mid back rounded

    # Mid
    "ə": (3.0 / 6.0, 0.5, 0.0),       # schwa

    # Open-mid
    "ɛ": (4.0 / 6.0, 0.0, 0.0),       # open-mid front unrounded
    "œ": (4.0 / 6.0, 0.0, 1.0),       # open-mid front rounded
    "ɜ": (4.0 / 6.0, 0.5, 0.0),       # open-mid central unrounded
    "ɝ": (4.0 / 6.0, 0.5, 0.0),       # rhotic open-mid central
    "ɚ": (3.0 / 6.0, 0.5, 0.0),       # rhotic schwa
    "ʌ": (4.0 / 6.0, 1.0, 0.0),       # open-mid back unrounded
    "ɔ": (4.0 / 6.0, 1.0, 1.0),       # open-mid back rounded

    # Near-open
    "æ": (5.0 / 6.0, 0.0, 0.0),       # near-open front unrounded
    "ɐ": (5.0 / 6.0, 0.5, 0.0),       # near-open central unrounded

    # Open
    "a": (1.0, 0.0, 0.0),             # open front unrounded
    "ɶ": (1.0, 0.0, 1.0),             # open front rounded
    "ɑ": (1.0, 1.0, 0.0),             # open back unrounded
    "ɒ": (1.0, 1.0, 1.0),             # open back rounded
}

# Alias / variant mappings before ID encoding
IPA_ALIASES: Dict[str, str] = {
    "g": "ɡ",
    "ˀ": "ʔ",
}


def _build_phone_registry() -> Tuple[Dict[str, int], int]:
    """Constructs the canonical dense phone registry and OOV index."""
    all_phones = list(CONSONANT_FEATURES.keys()) + list(VOWEL_FEATURES.keys())
    # Deduplicate while preserving deterministic order
    seen = set()
    registry = {}
    idx = 0
    for p in all_phones:
        canonical = IPA_ALIASES.get(p, p)
        if canonical not in seen:
            seen.add(canonical)
            registry[canonical] = idx
            idx += 1

    oov_id = idx
    return registry, oov_id


CHAR_TO_ID, OOV_ID = _build_phone_registry()
NUM_PHONES = OOV_ID + 1  # includes OOV slot


def compute_base_distance(p1: str, p2: str) -> float:
    """Computes continuous articulatory distance between two canonical phones."""
    if p1 == p2:
        return 0.0

    p1_is_c = p1 in CONSONANT_FEATURES
    p2_is_c = p2 in CONSONANT_FEATURES
    p1_is_v = p1 in VOWEL_FEATURES
    p2_is_v = p2 in VOWEL_FEATURES

    # Consonant <-> Consonant
    if p1_is_c and p2_is_c:
        m1, pl1, v1 = CONSONANT_FEATURES[p1]
        m2, pl2, v2 = CONSONANT_FEATURES[p2]
        d = W_MANNER * abs(m1 - m2) + W_PLACE * abs(pl1 - pl2) + W_VOICE * abs(v1 - v2)
        return float(min(1.0, d))

    # Vowel <-> Vowel
    if p1_is_v and p2_is_v:
        h1, b1, r1 = VOWEL_FEATURES[p1]
        h2, b2, r2 = VOWEL_FEATURES[p2]
        d = W_HEIGHT * abs(h1 - h2) + W_BACK * abs(b1 - b2) + W_ROUND * abs(r1 - r2)
        return float(min(1.0, d))

    # Cross-Class Bridges (Glides <-> Vowels and Vocalized Rhotics)
    bridges = {
        ("j", "i"): 0.15,
        ("j", "y"): 0.20,
        ("j", "e"): 0.25,
        ("w", "u"): 0.15,
        ("w", "o"): 0.25,
        ("w", "ʊ"): 0.20,
        ("ʋ", "u"): 0.30,
        ("ɫ", "w"): 0.25,
        ("ɫ", "u"): 0.30,
        # German/Danish rhotic vocalization to central vowels
        ("ʁ", "ɐ"): 0.25,
        ("ʁ", "ɚ"): 0.25,
        ("ʁ", "ə"): 0.30,
        ("r", "ɐ"): 0.25,
        ("r", "ɚ"): 0.25,
        ("r", "ə"): 0.30,
        ("ɹ", "ɚ"): 0.20,
        ("ɹ", "ɝ"): 0.20,
    }
    pair = (p1, p2)
    rev_pair = (p2, p1)
    if pair in bridges:
        return bridges[pair]
    if rev_pair in bridges:
        return bridges[rev_pair]

    # Default cross-class penalty
    return 1.00


def build_articulatory_distance_matrix() -> np.ndarray:
    """Builds a symmetric (NUM_PHONES x NUM_PHONES) float32 matrix

    with Floyd-Warshall metric closure guaranteeing the triangle inequality.
    """
    matrix = np.full((NUM_PHONES, NUM_PHONES), 1.0, dtype=np.float32)

    # Invert registry to map id -> char
    id_to_char = {v: k for k, v in CHAR_TO_ID.items()}

    # Populate base distances
    for i in range(OOV_ID):
        char_i = id_to_char[i]
        matrix[i, i] = 0.0
        for j in range(i + 1, OOV_ID):
            char_j = id_to_char[j]
            d = compute_base_distance(char_i, char_j)
            matrix[i, j] = d
            matrix[j, i] = d

    # OOV slot: distance 0.0 to self, 0.90 to known phones
    matrix[OOV_ID, OOV_ID] = 0.0
    for i in range(OOV_ID):
        matrix[i, OOV_ID] = 0.90
        matrix[OOV_ID, i] = 0.90

    # Floyd-Warshall Metric Closure:
    # M[i, j] = min(M[i, j], M[i, k] + M[k, j]) for all k
    # Guarantees triangle inequality M[i, k] <= M[i, j] + M[j, k] across all triples.
    for k in range(NUM_PHONES):
        matrix = np.minimum(matrix, matrix[:, [k]] + matrix[[k], :])

    return matrix


# Module-level singleton distance table fitting in L1 cache
ARTICULATORY_MATRIX: np.ndarray = build_articulatory_distance_matrix()

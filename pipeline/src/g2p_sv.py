"""Rule-based Swedish Grapheme-to-Phoneme (G2P) converter.

Provides fallback phonetic transcriptions for Swedish lemmas when Wiktionary
omits explicit IPA data, covering palatalization, retroflexion, and digraphs.
"""

import re

_FRONT_VOWELS = "eiyäö"
_VOWEL_SET = set("aouåeiyäö")

# Digraphs and trigraphs mapped regardless of context
_FIXED_CLUSTERS = [
    ("stj", "ɧ"),
    ("skj", "ɧ"),
    ("sch", "ɧ"),
    ("sh", "ɧ"),
    ("sj", "ɧ"),
    ("tj", "ɕ"),
    ("kj", "ɕ"),
    ("dj", "j"),
    ("gj", "j"),
    ("hj", "j"),
    ("lj", "j"),
    ("ck", "k"),
    ("ng", "ŋ"),
    ("qu", "kv"),
    ("ph", "f"),
    ("th", "t"),
]

# Retroflex assimilations (r + coronal)
_RETROFLEX_CLUSTERS = [
    ("rd", "ɖ"),
    ("rt", "ʈ"),
    ("rn", "ɳ"),
    ("rs", "ʂ"),
    ("rl", "ɭ"),
]


def swedish_to_ipa(word: str) -> str:
    """Converts a Swedish orthographic headword to an approximate IPA string."""
    if not word or not isinstance(word, str):
        return ""

    text = word.strip().lower()

    # Step 1: Initial palatalization before front vowels
    if text.startswith("sk") and len(text) > 2 and text[2] in _FRONT_VOWELS:
        text = "ɧ" + text[2:]
    elif text.startswith("k") and len(text) > 1 and text[1] in _FRONT_VOWELS:
        text = "ɕ" + text[1:]
    elif text.startswith("g") and len(text) > 1 and text[1] in _FRONT_VOWELS:
        text = "j" + text[1:]

    # Step 2: Fixed clusters
    for cluster, phoneme in _FIXED_CLUSTERS:
        text = text.replace(cluster, phoneme)

    # Step 3: Retroflex clusters
    for cluster, phoneme in _RETROFLEX_CLUSTERS:
        text = text.replace(cluster, phoneme)

    # Step 4: Medial / final gn -> ŋn
    text = re.sub(r"([aouåeiyäö])gn", r"\1ŋn", text)

    # Step 5: Character-by-character phonetic mapping
    out = []
    i = 0
    while i < len(text):
        char = text[i]

        if char in "ɧɕɖʈɳʂɭŋ":
            out.append(char)
        elif char == "c":
            if i + 1 < len(text) and text[i + 1] in _FRONT_VOWELS:
                out.append("s")
            else:
                out.append("k")
        elif char == "x":
            out.append("ks")
        elif char == "z":
            out.append("s")
        elif char == "w":
            out.append("v")
        elif char == "q":
            out.append("k")
        elif char == "g":
            out.append("ɡ")
        elif char == "å":
            out.append("o")
        elif char == "ä":
            out.append("ɛ")
        elif char == "ö":
            out.append("ø")
        elif char == "u":
            out.append("ʉ")
        elif char == "o":
            out.append("u")
        elif char == "a":
            out.append("ɑ")
        else:
            out.append(char)
        i += 1

    return "".join(out)

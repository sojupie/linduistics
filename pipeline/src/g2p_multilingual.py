"""Multilingual Grapheme-to-Phoneme (G2P) Engine for Germanic Lexicon.

Provides deterministic, rule-based and corpus-backed phonetic transcriptions
for headword lemmas across English, Swedish, Norwegian Bokmål, Danish, and German
when explicit IPA transcriptions are omitted from Wiktextract.
"""

import re
from typing import Dict, Optional
from ipa_normalizer import normalize_ipa
from g2p_sv import swedish_to_ipa

# ---------------------------------------------------------------------------
# English G2P (g2p-en with ARPAbet to IPA mapping)
# ---------------------------------------------------------------------------

_ARPABET_TO_IPA = {
    "AA": "ɑ", "AA0": "ɑ", "AA1": "ɑ", "AA2": "ɑ",
    "AE": "æ", "AE0": "æ", "AE1": "æ", "AE2": "æ",
    "AH": "ʌ", "AH0": "ə", "AH1": "ʌ", "AH2": "ʌ",
    "AO": "ɔ", "AO0": "ɔ", "AO1": "ɔ", "AO2": "ɔ",
    "AW": "aʊ", "AW0": "aʊ", "AW1": "aʊ", "AW2": "aʊ",
    "AY": "aɪ", "AY0": "aɪ", "AY1": "aɪ", "AY2": "aɪ",
    "B": "b", "CH": "tʃ", "D": "d", "DH": "ð",
    "EH": "ɛ", "EH0": "ɛ", "EH1": "ɛ", "EH2": "ɛ",
    "ER": "ɚ", "ER0": "ɚ", "ER1": "ɝ", "ER2": "ɝ",
    "EY": "eɪ", "EY0": "eɪ", "EY1": "eɪ", "EY2": "eɪ",
    "F": "f", "G": "ɡ", "HH": "h",
    "IH": "ɪ", "IH0": "ɪ", "IH1": "ɪ", "IH2": "ɪ",
    "IY": "i", "IY0": "i", "IY1": "i", "IY2": "i",
    "JH": "dʒ", "K": "k", "L": "l", "M": "m", "N": "n",
    "NG": "ŋ", "OW": "oʊ", "OW0": "oʊ", "OW1": "oʊ", "OW2": "oʊ",
    "OY": "ɔɪ", "OY0": "ɔɪ", "OY1": "ɔɪ", "OY2": "ɔɪ",
    "P": "p", "R": "ɹ", "S": "s", "SH": "ʃ", "T": "t", "TH": "θ",
    "UH": "ʊ", "UH0": "ʊ", "UH1": "ʊ", "UH2": "ʊ",
    "UW": "u", "UW0": "u", "UW1": "u", "UW2": "u",
    "V": "v", "W": "w", "Y": "j", "Z": "z", "ZH": "ʒ",
}

_G2P_EN_ENGINE = None


def _get_en_g2p():
    global _G2P_EN_ENGINE
    if _G2P_EN_ENGINE is None:
        try:
            import g2p_en
            _G2P_EN_ENGINE = g2p_en.G2p()
        except Exception:
            _G2P_EN_ENGINE = False
    return _G2P_EN_ENGINE


_EN_RULE_CLUSTERS = [
    ("ch", "tʃ"),
    ("sh", "ʃ"),
    ("th", "θ"),
    ("ph", "f"),
    ("wh", "w"),
    ("ng", "ŋ"),
    ("qu", "kw"),
    ("ck", "k"),
    ("ee", "i"),
    ("oo", "u"),
    ("ea", "i"),
    ("ai", "eɪ"),
    ("ay", "eɪ"),
    ("oi", "ɔɪ"),
    ("oy", "ɔɪ"),
    ("ou", "aʊ"),
    ("ow", "aʊ"),
]


def _english_rule_fallback(word: str) -> str:
    """Fast rule-based approximation for OOV English words."""
    text = word.lower().strip()
    for cluster, ph in _EN_RULE_CLUSTERS:
        text = text.replace(cluster, ph)
    return text


def english_to_ipa(word: str) -> str:
    """Converts English orthography to IPA using fast O(1) CMU lookup with rule fallback."""
    if not word or not isinstance(word, str):
        return ""
    w_lower = word.strip().lower()
    g2p = _get_en_g2p()
    if g2p and hasattr(g2p, "cmu"):
        cmu_entry = g2p.cmu.get(w_lower)
        if cmu_entry:
            phonemes = cmu_entry[0] if isinstance(cmu_entry[0], list) else cmu_entry
            ipa_parts = [_ARPABET_TO_IPA.get(p.strip(), "") for p in phonemes if p.strip()]
            return "".join(ipa_parts)
    return _english_rule_fallback(w_lower)


# ---------------------------------------------------------------------------
# Norwegian Bokmål G2P
# ---------------------------------------------------------------------------

_NB_FRONT_VOWELS = "eiyæø"

_NB_FIXED_CLUSTERS = [
    ("skj", "ʃ"),
    ("sj", "ʃ"),
    ("sch", "ʃ"),
    ("sh", "ʃ"),
    ("kj", "ç"),
    ("tj", "ç"),
    ("gj", "j"),
    ("hj", "j"),
    ("lj", "j"),
    ("dj", "j"),
    ("ng", "ŋ"),
    ("qu", "kv"),
    ("ph", "f"),
    ("th", "t"),
]

_NB_RETROFLEX_CLUSTERS = [
    ("rd", "ɖ"),
    ("rt", "ʈ"),
    ("rn", "ɳ"),
    ("rs", "ʂ"),
    ("rl", "ɭ"),
]


def norwegian_to_ipa(word: str) -> str:
    """Converts a Norwegian Bokmål headword to an approximate IPA string."""
    if not word or not isinstance(word, str):
        return ""

    text = word.strip().lower()

    # Step 1: Initial palatalization before front vowels
    if text.startswith("sk") and len(text) > 2 and text[2] in _NB_FRONT_VOWELS:
        text = "ʃ" + text[2:]
    elif text.startswith("k") and len(text) > 1 and text[1] in _NB_FRONT_VOWELS:
        text = "ç" + text[1:]
    elif text.startswith("g") and len(text) > 1 and text[1] in _NB_FRONT_VOWELS:
        text = "j" + text[1:]

    # Step 2: Fixed clusters
    for cluster, phoneme in _NB_FIXED_CLUSTERS:
        text = text.replace(cluster, phoneme)

    # Step 3: Retroflex assimilations
    for cluster, phoneme in _NB_RETROFLEX_CLUSTERS:
        text = text.replace(cluster, phoneme)

    # Step 4: Medial / final gn -> ŋn
    text = re.sub(r"([aouåeiyæø])gn", r"\1ŋn", text)

    # Step 5: Character-by-character mapping
    out = []
    i = 0
    while i < len(text):
        char = text[i]
        if char in "ʃçɖʈɳʂɭŋ":
            out.append(char)
        elif char == "c":
            if i + 1 < len(text) and text[i + 1] in _NB_FRONT_VOWELS:
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
        elif char == "æ":
            out.append("æ")
        elif char == "ø":
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


# ---------------------------------------------------------------------------
# Danish G2P
# ---------------------------------------------------------------------------

_DA_FRONT_VOWELS = "eiyæø"
_DA_VOWELS = "aouåæøeiy"

_DA_FIXED_CLUSTERS = [
    ("sch", "ɕ"),
    ("sj", "ɕ"),
    ("sh", "ɕ"),
    ("tj", "tɕ"),
    ("kj", "kç"),
    ("dj", "j"),
    ("gj", "j"),
    ("hj", "j"),
    ("lj", "j"),
    ("ng", "ŋ"),
    ("qu", "kv"),
    ("ph", "f"),
    ("th", "t"),
]


def danish_to_ipa(word: str) -> str:
    """Converts a Danish headword to an approximate IPA string."""
    if not word or not isinstance(word, str):
        return ""

    text = word.strip().lower()

    # Step 1: Archaic aa -> å
    text = text.replace("aa", "å")

    # Step 2: Fixed clusters
    for cluster, phoneme in _DA_FIXED_CLUSTERS:
        text = text.replace(cluster, phoneme)

    # Step 3: Soft d (blødt d -> ð) in coda or intervocalic positions
    # e.g., 'mad' -> 'mað', 'bade' -> 'baðe'
    text = re.sub(r"(?<=[aouåæøeiy])d(?=[aouåæøeiy]|$)", "ð", text)

    # Step 4: Post-vocalic g softening
    # after front vowels -> j, after back vowels -> w or silent
    text = re.sub(r"(?<=[eiyæø])g(?=[aouåæøeiy]|$)", "j", text)
    text = re.sub(r"(?<=[aouå])g(?=[aouåæøeiy]|$)", "w", text)

    # Step 5: Character-by-character mapping
    out = []
    i = 0
    while i < len(text):
        char = text[i]
        if char in "ɕðŋw":
            out.append(char)
        elif char == "c":
            if i + 1 < len(text) and text[i + 1] in _DA_FRONT_VOWELS:
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
            out.append("ɔ")
        elif char == "æ":
            out.append("ɛ")
        elif char == "ø":
            out.append("œ")
        elif char == "u":
            out.append("u")
        elif char == "o":
            out.append("o")
        elif char == "a":
            out.append("æ")
        else:
            out.append(char)
        i += 1

    return "".join(out)


# ---------------------------------------------------------------------------
# German G2P
# ---------------------------------------------------------------------------

_DE_FRONT_VOWELS = "eiäöü"
_DE_BACK_VOWELS = "aou"


def german_to_ipa(word: str) -> str:
    """Converts a German headword to an approximate IPA string."""
    if not word or not isinstance(word, str):
        return ""

    text = word.strip().lower()

    # Step 1: Fixed digraphs and trigraphs
    text = text.replace("sch", "ʃ")
    text = text.replace("tsch", "tʃ")

    # Initial sp / st -> ʃp / ʃt
    if text.startswith("sp"):
        text = "ʃp" + text[2:]
    elif text.startswith("st"):
        text = "ʃt" + text[2:]

    # Diphthongs
    text = text.replace("ei", "aɪ")
    text = text.replace("ai", "aɪ")
    text = text.replace("ey", "aɪ")
    text = text.replace("ay", "aɪ")
    text = text.replace("eu", "ɔʏ")
    text = text.replace("äu", "ɔʏ")
    text = text.replace("au", "aʊ")
    text = text.replace("ie", "iː")

    # Ich-Laut (ç) vs Ach-Laut (x)
    # ch after front vowels -> ç, after back vowels -> x
    text = re.sub(r"(?<=[eiäöü|aɪ|ɔʏ])ch", "ç", text)
    text = re.sub(r"(?<=[aou|aʊ])ch", "x", text)
    text = text.replace("ch", "ç")  # default initial/other to ç

    # Affricates and consonants
    text = text.replace("tz", "c")
    text = text.replace("z", "c")
    text = text.replace("qu", "kv")
    text = text.replace("ph", "f")
    text = text.replace("th", "t")
    text = text.replace("ng", "ŋ")
    text = text.replace("ß", "s")
    # Mark voiceless ss so it's not voiced before a vowel
    text = text.replace("ss", "S")

    # Final devoicing (Auslautverhärtung)
    if text.endswith("b"):
        text = text[:-1] + "p"
    elif text.endswith("d"):
        text = text[:-1] + "t"
    elif text.endswith("g"):
        text = text[:-1] + "k"

    # Character-by-character mapping
    out = []
    i = 0
    while i < len(text):
        char = text[i]
        if char in "ʃçxŋc":
            out.append(char)
        elif char == "S":
            out.append("s")
        elif char == "v":
            out.append("f")
        elif char == "w":
            out.append("v")
        elif char == "s":
            # initial or intervocalic single s before vowel is voiced [z]
            if i + 1 < len(text) and text[i + 1] in "aeiouäöü":
                out.append("z")
            else:
                out.append("s")
        elif char == "j":
            out.append("j")
        elif char == "c":
            if i + 1 < len(text) and text[i + 1] in _DE_FRONT_VOWELS:
                out.append("ts")
            else:
                out.append("k")
        elif char == "ä":
            out.append("ɛ")
        elif char == "ö":
            out.append("ø")
        elif char == "ü":
            out.append("y")
        else:
            out.append(char)
        i += 1

    return "".join(out)


# ---------------------------------------------------------------------------
# Master Dispatcher
# ---------------------------------------------------------------------------

def g2p_fallback(word: str, lang: str) -> str:
    """Dispatches to the appropriate G2P converter for the given language code.

    Supported languages: sv (Swedish), nb/no (Norwegian), da (Danish),
    de (German), en (English).
    Returns normalized IPA string.
    """
    if not word or not isinstance(word, str):
        return ""

    lang = lang.lower().strip()
    raw_ipa = ""

    if lang == "sv":
        raw_ipa = swedish_to_ipa(word)
    elif lang in ("nb", "no"):
        raw_ipa = norwegian_to_ipa(word)
    elif lang == "da":
        raw_ipa = danish_to_ipa(word)
    elif lang == "de":
        raw_ipa = german_to_ipa(word)
    elif lang == "en":
        raw_ipa = english_to_ipa(word)

    return normalize_ipa(raw_ipa)

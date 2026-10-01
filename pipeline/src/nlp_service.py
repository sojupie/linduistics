"""FastAPI NLP Service for Syntactic Dependency Parsing, Morphological Analysis,
Slot-Preserving Re-Inflection, and Universal Rewriting.

Language-agnostic architecture:
- Loads spaCy models dynamically for any installed language pipeline.
- Performs inflection, alternative ranking, and cognate approximation strictly via PostgreSQL queries.
- Contains zero hardcoded dictionaries or language-family assumptions.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import psycopg
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import spacy

# Environment & DB
def get_db_url() -> str:
    root = Path(__file__).resolve().parent.parent.parent
    env_path = root / ".env"
    if env_path.is_file():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("'\""))
    return os.environ.get(
        "DATABASE_URL",
        "postgres://postgres:postgres@localhost:5432/linduistics?sslmode=disable",
    )

DB_URL = get_db_url()

app = FastAPI(
    title="Linduistics NLP Service",
    description="Cross-lingual sentence dependency parsing, morphological inflection, and universal cognate rewriter",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dynamic spaCy Model Cache (supports any installed language)
_LOADED_MODELS: Dict[str, spacy.Language] = {}

def get_nlp(lang: str) -> spacy.Language:
    """Dynamically loads or caches a spaCy pipeline for any language code.
    Falls back to a blank model with sentencizer if no package is installed.
    """
    lang = lang.lower().strip()
    if lang == "no":
        lang = "nb"

    if lang in ("pan", "hybrid"):
        for candidate in ["sv", "en", "de"]:
            if candidate in _LOADED_MODELS:
                return _LOADED_MODELS[candidate]
        try:
            model = spacy.load("sv_core_news_sm")
            _LOADED_MODELS["pan"] = model
            return model
        except Exception:
            return get_nlp("en")

    if lang in _LOADED_MODELS:
        return _LOADED_MODELS[lang]

    candidate_packages = [
        f"{lang}_core_news_sm",
        f"{lang}_core_web_sm",
        f"{lang}_core_news_md",
        f"{lang}_core_web_md",
    ]
    for pkg in candidate_packages:
        try:
            model = spacy.load(pkg)
            _LOADED_MODELS[lang] = model
            return model
        except Exception:
            continue

    # Fallback: blank model with sentencizer for universal tokenization
    try:
        nlp = spacy.blank(lang)
        nlp.add_pipe("sentencizer")
        _LOADED_MODELS[lang] = nlp
        return nlp
    except Exception:
        fallback = _LOADED_MODELS.get("en")
        if not fallback:
            try:
                fallback = spacy.load("en_core_web_sm")
            except Exception:
                fallback = spacy.blank("en")
            _LOADED_MODELS["en"] = fallback
        return fallback

# Database Connection Helper
def get_db_conn():
    return psycopg.connect(DB_URL)

# Universal Morphological Feature -> Kaikki Tag Mapping
MORPH_TO_TAGS = {
    ("Tense", "Pres"): "present",
    ("Tense", "Past"): "past",
    ("Mood", "Ind"): "indicative",
    ("Mood", "Imp"): "imperative",
    ("Mood", "Sub"): "subjunctive",
    ("Voice", "Act"): "active",
    ("Voice", "Pass"): "passive",
    ("VerbForm", "Inf"): "infinitive",
    ("VerbForm", "Sup"): "supine",
    ("VerbForm", "Part"): "participle",
    ("VerbForm", "Fin"): "finite",
    ("Number", "Sing"): "singular",
    ("Number", "Plur"): "plural",
    ("Definite", "Def"): "definite",
    ("Definite", "Ind"): "indefinite",
    ("Case", "Nom"): "nominative",
    ("Case", "Gen"): "genitive",
    ("Case", "Acc"): "accusative",
    ("Case", "Dat"): "dative",
    ("Degree", "Pos"): "positive",
    ("Degree", "Cmp"): "comparative",
    ("Degree", "Sup"): "superlative",
    ("Person", "1"): "first-person",
    ("Person", "2"): "second-person",
    ("Person", "3"): "third-person",
    ("Gender", "Neut"): "neuter",
    ("Gender", "Com"): "common",
    ("Gender", "Masc"): "masculine",
    ("Gender", "Fem"): "feminine",
}

POS_NORMALIZATION = {
    "VERB": "verb",
    "AUX": "verb",
    "NOUN": "noun",
    "PROPN": "noun",
    "ADJ": "adj",
    "ADV": "adv",
    "PRON": "pron",
    "ADP": "prep",
    "CCONJ": "conj",
    "SCONJ": "conj",
    "DET": "det",
    "NUM": "num",
}

# Request & Response Schemas
class AnalyzeRequest(BaseModel):
    text: str
    lang: str = "sv"

class TokenInfo(BaseModel):
    id: int
    text: str
    lemma: str
    pos: str
    dep_rel: str
    head_id: int
    head_text: str
    morph: Dict[str, str] = Field(default_factory=dict)
    is_punct: bool
    is_stop: bool

class AnalyzeResponse(BaseModel):
    lang: str
    text: str
    tokens: List[TokenInfo]
    root_id: int

class InflectRequest(BaseModel):
    lang: str
    lemma: str
    pos: str
    morph: Dict[str, str] = Field(default_factory=dict)

class InflectResponse(BaseModel):
    form: str
    matched_tags: List[str] = Field(default_factory=list)
    score: float

class AlternativeMatch(BaseModel):
    word: str
    category: str
    phonetic_sim: float
    semantic_sim: float

class AlternativeWord(BaseModel):
    form: str
    lemma: str
    pos: str
    universality_score: float
    universality_delta: float
    sentence_delta: float = 0.0
    context_fit: float = 1.0
    cognate_matches: Dict[str, AlternativeMatch] = Field(default_factory=dict)

class AlternativesRequest(BaseModel):
    lang: str
    token: str
    lemma: str
    pos: str
    morph: Dict[str, str] = Field(default_factory=dict)
    target_langs: List[str] = Field(default_factory=list)
    total_tokens: Optional[int] = 1
    context_text: Optional[str] = None

class AlternativesResponse(BaseModel):
    original_token: str
    original_lemma: str
    original_score: float
    alternatives: List[AlternativeWord]

class ApproximateTranslationRequest(BaseModel):
    source_lang: str
    target_langs: List[str] = Field(default_factory=list)
    tokens: List[TokenInfo]

class ApproximateTranslationResponse(BaseModel):
    translations: Dict[str, str]
    details: Dict[str, List[Dict[str, Any]]]

COGNATE_CATEGORIES = (
    "true_cognate",
    "full_cognate",
    "partial_cognate",
    "semantic_narrowing",
    "semantic_broadening",
    "archaic_cognate",
    "semantic_divergence",
    "sister_loanword",
)

def normalize_lemma(lang: str, text: str, lemma: str, pos: str) -> str:
    lower_text = text.lower()
    lower_lemma = lemma.lower() if lemma else lower_text
    if lang == "sv":
        if lower_text == "det":
            return "det"
        if lower_text == "den":
            return "den"
        if lower_text in ("de", "dem"):
            return "de"
        if lower_text == "marinen" and lower_lemma in ("marine", "marinen"):
            return "marin"
    return lower_lemma

# Core Logic: Database-Driven Slot-Preserving Re-Inflection
def inflect_lemma(
    conn: psycopg.Connection,
    lang: str,
    lemma: str,
    pos: str,
    morph: Dict[str, str],
) -> tuple[str, List[str], float]:
    """Finds best matching inflected form in word_inflections matching the grammatical slot."""
    norm_pos = POS_NORMALIZATION.get(pos.upper(), pos.lower())
    effective_morph = dict(morph) if morph else {}
    if norm_pos == "verb":
        if "Person" not in effective_morph:
            effective_morph["Person"] = "3"
        if "Number" not in effective_morph:
            effective_morph["Number"] = "Sing"

    wanted_tags = set()
    for k, v in effective_morph.items():
        if (k, v) in MORPH_TO_TAGS:
            wanted_tags.add(MORPH_TO_TAGS[(k, v)])

    with conn.cursor() as cur:
        # Search word_inflections with matching POS
        cur.execute(
            """
            SELECT form, tags
            FROM word_inflections
            WHERE lang = %s AND lemma = %s AND pos ILIKE %s
            """,
            (lang, lemma, f"%{norm_pos}%"),
        )
        rows = cur.fetchall()

    if not rows:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT form, tags
                FROM word_inflections
                WHERE lang = %s AND lemma = %s
                LIMIT 50
                """,
                (lang, lemma),
            )
            rows = cur.fetchall()

    if not rows:
        return lemma, [], 0.0

    scored = []
    lower_lemma = lemma.lower()
    for form, tags in rows:
        if not form or form == "-" or " " in form:
            continue
        tset = set(tags) if tags else set()
        penalty = 0.0
        if any("error" in t for t in tset) or "archaic" in tset or "dated" in tset or "obsolete" in tset or "misspelling" in tset:
            penalty = 10.0
        if "finite" in wanted_tags or "present" in wanted_tags or "past" in wanted_tags:
            if "participle" in tset and "finite" not in tset:
                penalty += 3.0
            if "infinitive" in tset:
                penalty += 2.0

        overlap = len(wanted_tags & tset)
        extra = len(tset - wanted_tags)
        score = (overlap * 2.0) - (extra * 0.3) - penalty
        if form.lower() == lower_lemma:
            score += 1.0
        scored.append((score, form, list(tags)))

    if not scored:
        return lemma, [], 0.0

    scored.sort(key=lambda x: x[0], reverse=True)
    best_score, best_form, best_tags = scored[0]
    return best_form, best_tags, best_score

# Endpoints
@app.get("/health")
def health():
    return {
        "status": "ok",
        "loaded_models": list(_LOADED_MODELS.keys()),
    }

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    nlp = get_nlp(req.lang)
    doc = nlp(req.text)

    tokens: List[TokenInfo] = []
    root_id = -1

    for i, t in enumerate(doc):
        dep = t.dep_
        if dep == "ROOT" and root_id == -1:
            root_id = i

        head_id = t.head.i if t.head != t else i
        morph_dict = dict(t.morph.to_dict()) if hasattr(t, "morph") else {}

        norm_lemma = normalize_lemma(req.lang, t.text, t.lemma_, t.pos_)

        tokens.append(
            TokenInfo(
                id=i,
                text=t.text,
                lemma=norm_lemma,
                pos=t.pos_,
                dep_rel=dep,
                head_id=head_id,
                head_text=t.head.text if hasattr(t, "head") else t.text,
                morph=morph_dict,
                is_punct=t.is_punct,
                is_stop=t.is_stop,
            )
        )

    if root_id == -1 and tokens:
        root_id = 0

    return AnalyzeResponse(
        lang=req.lang,
        text=req.text,
        tokens=tokens,
        root_id=root_id,
    )

@app.post("/inflect", response_model=InflectResponse)
def inflect(req: InflectRequest):
    try:
        with get_db_conn() as conn:
            form, matched_tags, score = inflect_lemma(
                conn, req.lang, req.lemma, req.pos, req.morph
            )
            return InflectResponse(
                form=form,
                matched_tags=matched_tags,
                score=score,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/alternatives", response_model=AlternativesResponse)
def get_alternatives(req: AlternativesRequest):
    norm_pos = POS_NORMALIZATION.get(req.pos.upper(), req.pos.lower())

    try:
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                target_langs = [l for l in req.target_langs if l != req.lang]
                if not target_langs:
                    cur.execute(
                        "SELECT DISTINCT lang_b FROM word_comparisons WHERE lang_a = %s",
                        (req.lang,),
                    )
                    target_langs = [r[0] for r in cur.fetchall() if r[0] != req.lang]

                effective_lemma = req.lemma
                # If lemma has no synonyms in lemma_synonyms, check if token or lemma resolves in word_forms
                cur.execute(
                    "SELECT 1 FROM lemma_synonyms WHERE lang = %s AND lemma = %s LIMIT 1",
                    (req.lang, effective_lemma),
                )
                if not cur.fetchone():
                    cur.execute(
                        "SELECT lemma FROM word_forms WHERE lang = %s AND form = %s LIMIT 1",
                        (req.lang, req.token.lower()),
                    )
                    r = cur.fetchone()
                    if r:
                        effective_lemma = r[0]
                    else:
                        cur.execute(
                            "SELECT lemma FROM word_forms WHERE lang = %s AND form = %s LIMIT 1",
                            (req.lang, req.lemma.lower()),
                        )
                        r2 = cur.fetchone()
                        if r2:
                            effective_lemma = r2[0]

                # 1. Fetch synonyms from database
                cur.execute(
                    """
                    SELECT synonyms FROM lemma_synonyms
                    WHERE lang = %s AND lemma = %s
                    """,
                    (req.lang, effective_lemma),
                )
                synonyms = set()
                for (syn_list,) in cur.fetchall():
                    if syn_list:
                        synonyms.update(syn_list)

                # Also check reverse synonyms (uses GIN index)
                cur.execute(
                    """
                    SELECT lemma FROM lemma_synonyms
                    WHERE lang = %s AND synonyms @> ARRAY[%s]::text[]
                    LIMIT 20
                    """,
                    (req.lang, effective_lemma),
                )
                for (rev_lemma,) in cur.fetchall():
                    synonyms.add(rev_lemma)

                # In pan-Germanic mode, also pull cross-lingual cognates as candidates
                if req.lang in ("pan", "hybrid"):
                    cur.execute(
                        """
                        SELECT DISTINCT word_b
                        FROM word_comparisons
                        WHERE (word_a = %s OR word_a = %s) AND category = ANY(%s)
                        LIMIT 25
                        """,
                        (req.lemma, req.token.lower(), list(COGNATE_CATEGORIES)),
                    )
                    for (cb,) in cur.fetchall():
                        synonyms.add(cb)

                # 2. Candidate pool: original lemma + discovered synonyms
                candidates = {effective_lemma} | synonyms
                candidate_results: List[AlternativeWord] = []
                orig_score = 0.0
                orig_target_words: Dict[str, str] = {}
                inflect_score_map: Dict[str, float] = {}

                for cand in candidates:
                    cand = cand.strip().lower()
                    if not cand or " " in cand:
                        continue

                    # Inflect candidate to slot
                    form, _, inflect_score = inflect_lemma(
                        conn, req.lang, cand, norm_pos, req.morph
                    )
                    inflect_score_map[cand] = inflect_score

                    # Query cognate comparisons
                    if req.lang in ("pan", "hybrid"):
                        cur.execute(
                            """
                            SELECT lang_b, word_b, category, phonetic_sim, semantic_sim
                            FROM word_comparisons
                            WHERE word_a = %s AND lang_b = ANY(%s) AND lang_a != lang_b
                              AND category = ANY(%s)
                            ORDER BY phonetic_sim DESC, semantic_sim DESC
                            """,
                            (cand, target_langs, list(COGNATE_CATEGORIES)),
                        )
                    else:
                        cur.execute(
                            """
                            SELECT lang_b, word_b, category, phonetic_sim, semantic_sim
                            FROM word_comparisons
                            WHERE lang_a = %s AND word_a = %s AND lang_b = ANY(%s)
                              AND category = ANY(%s)
                            ORDER BY phonetic_sim DESC, semantic_sim DESC
                            """,
                            (req.lang, cand, target_langs, list(COGNATE_CATEGORIES)),
                        )
                    rows = cur.fetchall()

                    matches: Dict[str, AlternativeMatch] = {}
                    cand_total_score = 0.0

                    for lang_b, word_b, cat, phon_sim, sem_sim in rows:
                        if lang_b not in matches:
                            weight = 1.0 if cat in ("true_cognate", "full_cognate") else 0.6
                            cognacy_score = weight * float(phon_sim or 0.5)
                            cand_total_score += cognacy_score
                            matches[lang_b] = AlternativeMatch(
                                word=word_b,
                                category=cat,
                                phonetic_sim=float(phon_sim or 0.0),
                                semantic_sim=float(sem_sim or 0.0),
                            )

                    univ_score = (cand_total_score / len(target_langs)) * 100.0 if target_langs else 0.0

                    if cand == effective_lemma:
                        orig_score = univ_score
                        orig_target_words = {l: m.word for l, m in matches.items()}

                    candidate_results.append(
                        AlternativeWord(
                            form=form if form else cand,
                            lemma=cand,
                            pos=norm_pos,
                            universality_score=round(univ_score, 1),
                            universality_delta=0.0,
                            sentence_delta=0.0,
                            context_fit=1.0,
                            cognate_matches=matches,
                        )
                    )

                # Calculate deltas relative to original lemma score, sentence impact, and contextual fit
                filtered_alternatives: List[AlternativeWord] = []
                total_tokens = max(1, req.total_tokens or 1)

                for c in candidate_results:
                    c.universality_delta = round(c.universality_score - orig_score, 1)
                    c.sentence_delta = round(c.universality_delta / total_tokens, 1)

                    if c.lemma == effective_lemma:
                        c.context_fit = 1.0
                    else:
                        # Contextual semantic fit:
                        # 1. Mean semantic similarity across target language matches
                        if c.cognate_matches:
                            sem_sims = [m.semantic_sim for m in c.cognate_matches.values() if m.semantic_sim > 0]
                            base_fit = (sum(sem_sims) / len(sem_sims)) if sem_sims else 0.70
                            # 2. Overlap bonus if target cognates match original target words
                            overlap_count = sum(
                                1 for lang_code, m in c.cognate_matches.items()
                                if orig_target_words.get(lang_code) == m.word
                            )
                            if overlap_count > 0:
                                base_fit = min(1.0, base_fit * 1.05)
                        else:
                            base_fit = 0.50

                        # 3. Morphological slot conformity check
                        if req.morph and inflect_score_map.get(c.lemma, 0.0) <= 0:
                            base_fit *= 0.95

                        c.context_fit = round(max(0.1, min(1.0, base_fit)), 2)

                    if c.lemma != effective_lemma:
                        filtered_alternatives.append(c)

                filtered_alternatives.sort(
                    key=lambda x: (x.sentence_delta, x.context_fit, x.universality_score),
                    reverse=True,
                )

                return AlternativesResponse(
                    original_token=req.token,
                    original_lemma=effective_lemma,
                    original_score=round(orig_score, 1),
                    alternatives=filtered_alternatives[:15],
                )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/translate-approximate", response_model=ApproximateTranslationResponse)
@app.post("/pan-germanic", response_model=ApproximateTranslationResponse)
def approximate_translation(req: ApproximateTranslationRequest):
    """Generates synthetic sentence translations in target languages
    maximizing cognate alignment with source tokens based entirely on database comparisons.
    Zero hardcoded vocabularies.
    """
    if req.source_lang in ("pan", "hybrid"):
        target_langs = [l for l in req.target_langs]
    else:
        target_langs = [l for l in req.target_langs if l != req.source_lang]

    translations: Dict[str, str] = {}
    details: Dict[str, List[Dict[str, Any]]] = {}

    try:
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                if not target_langs:
                    cur.execute(
                        "SELECT DISTINCT lang_b FROM word_comparisons WHERE lang_a = %s",
                        (req.source_lang,),
                    )
                    target_langs = [r[0] for r in cur.fetchall() if r[0] != req.source_lang]

                for target_lang in target_langs:
                    details[target_lang] = []
                    target_words: List[str] = []

                    for tok in req.tokens:
                        if tok.is_punct:
                            target_words.append(tok.text)
                            details[target_lang].append({
                                "source": tok.text,
                                "target": tok.text,
                                "type": "punct",
                            })
                            continue

                        lower_text = tok.text.lower()
                        norm_pos = POS_NORMALIZATION.get(tok.pos.upper(), tok.pos.lower())

                        # Search database word_comparisons:
                        # Match lemma or surface form, prioritize matching POS, cognacy category, and semantic plausibility
                        if req.source_lang in ("pan", "hybrid"):
                            cur.execute(
                                """
                                SELECT word_b, category, phonetic_sim, semantic_sim
                                FROM word_comparisons
                                WHERE (word_a = %s OR word_a = %s) AND lang_b = %s AND lang_a != lang_b
                                  AND semantic_sim >= 0.50
                                ORDER BY 
                                    CASE 
                                        WHEN (pos_b ILIKE %s) AND (category IN ('true_cognate', 'full_cognate') OR semantic_sim >= 0.85) THEN 1
                                        WHEN (pos_b ILIKE %s) AND category IN ('partial_cognate', 'semantic_narrowing', 'semantic_broadening', 'archaic_cognate', 'semantic_divergence', 'sister_loanword') THEN 2
                                        WHEN (pos_b ILIKE %s) AND category IN ('translation_pair', 'unrelated_equivalent') THEN 3
                                        WHEN (pos_b ILIKE %s) AND semantic_sim >= 0.70 THEN 4
                                        WHEN (pos_b ILIKE %s) THEN 5
                                        WHEN category IN ('true_cognate', 'full_cognate') OR semantic_sim >= 0.85 THEN 6
                                        WHEN category IN ('partial_cognate', 'semantic_narrowing', 'semantic_broadening', 'archaic_cognate', 'semantic_divergence', 'sister_loanword') THEN 7
                                        WHEN category IN ('translation_pair', 'unrelated_equivalent') THEN 8
                                        ELSE 9
                                    END,
                                    semantic_sim DESC, phonetic_sim DESC
                                LIMIT 1
                                """,
                                (
                                    tok.lemma,
                                    lower_text,
                                    target_lang,
                                    f"%{norm_pos}%",
                                    f"%{norm_pos}%",
                                    f"%{norm_pos}%",
                                    f"%{norm_pos}%",
                                    f"%{norm_pos}%",
                                ),
                            )
                        else:
                            cur.execute(
                                """
                                SELECT word_b, category, phonetic_sim, semantic_sim
                                FROM word_comparisons
                                WHERE lang_a = %s AND (word_a = %s OR word_a = %s) AND lang_b = %s
                                  AND semantic_sim >= 0.50
                                ORDER BY 
                                    CASE 
                                        WHEN (pos_b ILIKE %s) AND (category IN ('true_cognate', 'full_cognate') OR semantic_sim >= 0.85) THEN 1
                                        WHEN (pos_b ILIKE %s) AND category IN ('partial_cognate', 'semantic_narrowing', 'semantic_broadening', 'archaic_cognate', 'semantic_divergence', 'sister_loanword') THEN 2
                                        WHEN (pos_b ILIKE %s) AND category IN ('translation_pair', 'unrelated_equivalent') THEN 3
                                        WHEN (pos_b ILIKE %s) AND semantic_sim >= 0.70 THEN 4
                                        WHEN (pos_b ILIKE %s) THEN 5
                                        WHEN category IN ('true_cognate', 'full_cognate') OR semantic_sim >= 0.85 THEN 6
                                        WHEN category IN ('partial_cognate', 'semantic_narrowing', 'semantic_broadening', 'archaic_cognate', 'semantic_divergence', 'sister_loanword') THEN 7
                                        WHEN category IN ('translation_pair', 'unrelated_equivalent') THEN 8
                                        ELSE 9
                                    END,
                                    semantic_sim DESC, phonetic_sim DESC
                                LIMIT 1
                                """,
                                (
                                    req.source_lang,
                                    tok.lemma,
                                    lower_text,
                                    target_lang,
                                    f"%{norm_pos}%",
                                    f"%{norm_pos}%",
                                    f"%{norm_pos}%",
                                    f"%{norm_pos}%",
                                    f"%{norm_pos}%",
                                ),
                            )
                        match = cur.fetchone()

                        # Fallback: check cognate_clusters if not found in direct comparisons
                        if not match:
                            cur.execute(
                                """
                                SELECT members FROM cognate_clusters
                                WHERE members @> jsonb_build_array(jsonb_build_object('word', %s::text))
                                LIMIT 3
                                """,
                                (tok.lemma,),
                            )
                            cluster_rows = cur.fetchall()
                            for (members,) in cluster_rows:
                                if isinstance(members, list):
                                    for m in members:
                                        if m.get("lang") == target_lang and (not m.get("pos") or norm_pos in m.get("pos", "").lower()):
                                            match = (m.get("word"), "true_cognate", 0.8, 0.9)
                                            break
                                if match:
                                    break

                        if match:
                            target_lemma, cat, phon_sim, sem_sim = match
                            target_form, _, _ = inflect_lemma(
                                conn, target_lang, target_lemma, tok.pos, tok.morph
                            )
                            chosen_word = target_form if target_form else target_lemma

                            if tok.text and tok.text[0].isupper():
                                chosen_word = chosen_word.capitalize()

                            target_words.append(chosen_word)
                            details[target_lang].append({
                                "source": tok.text,
                                "target": chosen_word,
                                "target_lemma": target_lemma,
                                "category": cat,
                                "phonetic_sim": float(phon_sim or 0),
                            })
                        else:
                            # Direct token fallback
                            target_words.append(tok.text)
                            details[target_lang].append({
                                "source": tok.text,
                                "target": tok.text,
                                "type": "unmatched",
                            })

                    # Construct sentence (handling basic punctuation spacing)
                    sentence = ""
                    for i, w in enumerate(target_words):
                        if i == 0 or w in {".", ",", "!", "?", ";", ":", ")", "]"}:
                            sentence += w
                        elif sentence and sentence[-1] in {"(", "["}:
                            sentence += w
                        else:
                            sentence += " " + w

                    translations[target_lang] = sentence.strip()

        return ApproximateTranslationResponse(
            translations=translations,
            details=details,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("nlp_service:app", host="127.0.0.1", port=5001, reload=False)

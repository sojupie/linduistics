"""Build word_inflections and lemma_synonyms tables from Kaikki JSONL and database."""

from __future__ import annotations
import os
import sys
import time
from pathlib import Path
from languages import LANGUAGES
from collections import defaultdict
import orjson
import psycopg

def load_env(env_path: Path) -> None:
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip("'\""))

def main():
    root = Path(__file__).resolve().parent.parent.parent
    load_env(root / ".env")
    db_url = os.environ.get("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/linduistics?sslmode=disable")

    data_dir = root / "pipeline" / "data"

    languages = [lang for lang in ("sv", "de", "en", "da", "nb") if lang in LANGUAGES]

    print("Connecting to database...")
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            # Check existing counts
            cur.execute("SELECT lang, count(*) FROM word_inflections GROUP BY lang")
            existing_inflections = dict(cur.fetchall())
            cur.execute("SELECT lang, count(*) FROM lemma_synonyms GROUP BY lang")
            existing_synonyms = dict(cur.fetchall())

            for lang in languages:
                jsonl_file = data_dir / f"kaikki_{lang}.jsonl"
                if not jsonl_file.is_file():
                    print(f"Skipping {lang}: {jsonl_file} not found")
                    continue

                need_inflections = existing_inflections.get(lang, 0) == 0
                need_synonyms = existing_synonyms.get(lang, 0) == 0

                if not need_inflections and not need_synonyms:
                    print(f"[{lang}] Already populated: {existing_inflections.get(lang, 0)} inflections, {existing_synonyms.get(lang, 0)} synonyms.")
                    continue

                print(f"\nProcessing {lang} from {jsonl_file.name}...")
                start_t = time.time()

                inflections_set = set()
                synonyms_dict = defaultdict(set)

                with open(jsonl_file, "rb") as f:
                    for line in f:
                        try:
                            d = orjson.loads(line)
                        except Exception:
                            continue

                        lemma = d.get("word", "").strip().lower()
                        pos = d.get("pos", "").strip().lower()
                        if not lemma or " " in lemma or not pos:
                            continue

                        if need_inflections:
                            # Add lemma itself as base inflection
                            inflections_set.add((lang, lemma, lemma, pos, ("base",)))

                            # Extract forms
                            for form_entry in d.get("forms", []):
                                form = form_entry.get("form", "").strip().lower()
                                raw_tags = form_entry.get("tags", [])
                                clean_tags = [t.lower() for t in raw_tags if t and t not in ("table-tags", "inflection-template")]
                                if form and " " not in form and clean_tags:
                                    inflections_set.add((lang, lemma, form, pos, tuple(sorted(clean_tags))))

                        if need_synonyms:
                            for sense in d.get("senses", []):
                                for syn in sense.get("synonyms", []):
                                    syn_word = syn.get("word", "").strip().lower()
                                    if syn_word and " " not in syn_word and syn_word != lemma:
                                        synonyms_dict[(lang, lemma, pos)].add(syn_word)

                print(f"[{lang}] Parsed in {time.time() - start_t:.1f}s: {len(inflections_set):,} inflections, {len(synonyms_dict):,} lemmas with synonyms")

                if need_inflections and inflections_set:
                    print(f"[{lang}] Inserting inflections via binary COPY...")
                    with cur.copy("COPY word_inflections (lang, lemma, form, pos, tags) FROM STDIN (FORMAT BINARY)") as copy:
                        for l, lem, frm, p, t in inflections_set:
                            copy.write_row((l, lem, frm, p, list(t)))
                    conn.commit()

                if need_synonyms and synonyms_dict:
                    print(f"[{lang}] Inserting synonyms via binary COPY...")
                    with cur.copy("COPY lemma_synonyms (lang, lemma, pos, synonyms) FROM STDIN (FORMAT BINARY)") as copy:
                        for (l, lem, p), syns in synonyms_dict.items():
                            copy.write_row((l, lem, p, list(syns)))
                    conn.commit()

            print("\nDatabase update completed.")

if __name__ == "__main__":
    main()

import json

import pyarrow as pa
import pyarrow.parquet as pq

from extract_forms import extract_forms


def test_extract_forms_keeps_exact_lemma_identity_and_skips_ambiguous_fallback(tmp_path):
    lemma_path = tmp_path / "lemmas.parquet"
    pq.write_table(pa.table({"word": ["Gift", "gift", "Stone"]}), lemma_path)
    raw_path = tmp_path / "raw.jsonl"
    entries = [
        {"word": "Gift", "forms": [{"form": "Gifts"}]},
        {"word": "gift", "forms": [{"form": "Gifts"}]},
        {"word": "GIFT", "forms": [{"form": "Gifts"}]},
        {"word": "stone", "forms": [{"form": "stones"}]},
        {"word": "Gifts", "senses": [{"form_of": [{"word": "Gift"}]}]},
    ]
    raw_path.write_text("\n".join(json.dumps(entry) for entry in entries), encoding="utf-8")
    output_path = tmp_path / "word_forms.parquet"

    row_count = extract_forms(raw_path, lemma_path, output_path, lang="de")

    forms = {
        (row["form"], row["lemma"])
        for row in pq.read_table(output_path).select(["form", "lemma"]).to_pylist()
    }
    assert row_count == 3
    assert forms == {("gifts", "Gift"), ("gifts", "gift"), ("stones", "Stone")}

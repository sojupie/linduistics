import io
import json

from fetch_wiktionary_revision_snapshot import capture_snapshot


def test_captures_current_revision_metadata_without_replacing_pinned_sources(tmp_path):
    source = tmp_path / "source-pages.csv"
    source.write_text(
        "source_id,title,revision_id\nold-blive,blive,90208102\ncurrent-blive,blive,92495052\nmissing,not-a-word,1\n",
        encoding="utf-8",
    )
    output = tmp_path / "snapshot.csv"

    class Response(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *_):
            self.close()

    def opener(request, timeout):
        assert timeout == 30
        assert request.headers["User-agent"] == "LinduisticsDataPipeline/0.1 (source revision capture)"
        return Response(json.dumps({"query": {"pages": [
            {"pageid": 42, "title": "Blive", "revisions": [{"revid": 92495052, "timestamp": "2026-09-05T18:53:00Z"}]},
            {"title": "not-a-word", "missing": True},
        ]}}).encode())

    manifest = capture_snapshot(source, output, opener=opener)

    import csv

    with output.open(encoding="utf-8", newline="") as snapshot:
        rows = list(csv.DictReader(snapshot))
    assert rows[0]["revision_id"] == "92495052"
    assert rows[0]["revision_timestamp"] == "2026-09-05T18:53:00Z"
    assert rows[0]["revision_url"].endswith("title=Blive&oldid=92495052")
    assert rows[1]["status"] == "missing"
    assert source.read_text(encoding="utf-8").endswith("missing,not-a-word,1\n")
    assert manifest["counts"] == {"requested": 2, "found": 1, "missing": 1}

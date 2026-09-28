"""Capture latest Wiktionary page revisions for an existing source-page list."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from typing import Any, Callable


API_URL = "https://en.wiktionary.org/w/api.php"
USER_AGENT = "LinduisticsDataPipeline/0.1 (source revision capture)"
BATCH_SIZE = 50


def fetch_pages(titles: list[str], opener: Callable[..., Any] = urlopen) -> list[dict[str, Any]]:
    pages: list[dict[str, Any]] = []
    for start in range(0, len(titles), BATCH_SIZE):
        batch = titles[start : start + BATCH_SIZE]
        query = urlencode({
            "action": "query",
            "prop": "revisions",
            "titles": "|".join(batch),
            "rvprop": "ids|timestamp",
            "rvlimit": 1,
            "format": "json",
            "formatversion": 2,
        })
        request = Request(f"{API_URL}?{query}", headers={"User-Agent": USER_AGENT})
        with opener(request, timeout=30) as response:
            payload = json.loads(response.read())
        pages.extend(payload["query"]["pages"])
    return pages


def capture_snapshot(
    source_pages: Path,
    output: Path,
    force: bool = False,
    opener: Callable[..., Any] = urlopen,
) -> dict[str, Any]:
    manifest_path = output.with_suffix(output.suffix + ".manifest.json")
    if not force and (output.exists() or manifest_path.exists()):
        raise FileExistsError(f"Output already exists; choose a new name or pass --force: {output}")

    input_bytes = source_pages.read_bytes()
    with source_pages.open(encoding="utf-8-sig", newline="") as source:
        titles = sorted({row["title"] for row in csv.DictReader(source)}, key=str.casefold)
    by_title = {page["title"].casefold(): page for page in fetch_pages(titles, opener)}

    output.parent.mkdir(parents=True, exist_ok=True)
    temp_output = output.with_suffix(output.suffix + ".tmp")
    retrieved_at = datetime.now(timezone.utc).isoformat()
    columns = ["title", "status", "page_id", "revision_id", "revision_timestamp", "revision_url"]
    present = missing = 0
    try:
        with temp_output.open("w", encoding="utf-8", newline="") as destination:
            writer = csv.DictWriter(destination, fieldnames=columns)
            writer.writeheader()
            for title in titles:
                page = by_title.get(title.casefold())
                if page is None:
                    raise ValueError(f"Wiktionary API omitted requested title: {title}")
                revision = (page.get("revisions") or [None])[0]
                if page.get("missing") or revision is None:
                    writer.writerow({"title": title, "status": "missing"})
                    missing += 1
                    continue
                revision_id = revision["revid"]
                writer.writerow({
                    "title": title,
                    "status": "found",
                    "page_id": page.get("pageid"),
                    "revision_id": revision_id,
                    "revision_timestamp": revision["timestamp"],
                    "revision_url": f"https://en.wiktionary.org/w/index.php?{urlencode({'title': page['title'], 'oldid': revision_id})}",
                })
                present += 1
        temp_output.replace(output)
    except Exception:
        temp_output.unlink(missing_ok=True)
        raise

    output_hash = hashlib.sha256(output.read_bytes()).hexdigest()
    manifest = {
        "schema_version": 1,
        "generated_at": retrieved_at,
        "api": API_URL,
        "source_pages_file": source_pages.name,
        "source_pages_sha256": hashlib.sha256(input_bytes).hexdigest(),
        "output_file": output.name,
        "output_sha256": output_hash,
        "counts": {"requested": len(titles), "found": present, "missing": missing},
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-pages", type=Path, default=root / "datasets/source-evidence/source-pages.csv")
    parser.add_argument("--output", type=Path, required=True, help="New snapshot CSV; the pinned seed is never changed")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    manifest = capture_snapshot(args.source_pages, args.output, args.force)
    print(f"Captured {manifest['counts']['found']} of {manifest['counts']['requested']} Wiktionary pages to {args.output}")
    print(f"Manifest: {args.output.with_suffix(args.output.suffix + '.manifest.json')}")


if __name__ == "__main__":
    main()

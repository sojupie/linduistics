"""Download helper for Kaikki.org Wiktextract dumps.

Supports full downloads or sample slice downloads for local development and testing.
"""

import argparse
import os
import urllib.request
from tqdm import tqdm

KAIKKI_URLS = {
    "sv": "https://kaikki.org/dictionary/Swedish/kaikki.org-dictionary-Swedish.jsonl",
    "en": "https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl",
    "de": "https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl",
    "nl": "https://kaikki.org/dictionary/Dutch/kaikki.org-dictionary-Dutch.jsonl",
    "da": "https://kaikki.org/dictionary/Danish/kaikki.org-dictionary-Danish.jsonl",
    "nb": "https://kaikki.org/dictionary/Norwegian%20Bokm%C3%A5l/kaikki.org-dictionary-NorwegianBokm%C3%A5l.jsonl",
}


def download_sample(lang: str, output_path: str, max_lines: int = 10000) -> None:
    """Streams and writes the first `max_lines` from the remote Kaikki dump."""
    url = KAIKKI_URLS.get(lang)
    if not url:
        raise ValueError(f"Unsupported language code: {lang}. Available: {list(KAIKKI_URLS.keys())}")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    print(f"Downloading sample ({max_lines} lines) for [{lang}] from {url}...")

    req = urllib.request.Request(url, headers={"User-Agent": "Linduistics-ETL/1.0"})
    with urllib.request.urlopen(req) as response, open(output_path, "wb") as out_f:
        lines_written = 0
        with tqdm(total=max_lines, desc=f"Sample {lang}", unit="lines") as pbar:
            for line in response:
                out_f.write(line)
                lines_written += 1
                pbar.update(1)
                if lines_written >= max_lines:
                    break

    print(f"Sample saved to {output_path} ({lines_written} lines).")


def download_full(lang: str, output_path: str) -> None:
    """Downloads the full Kaikki dump with progress reporting."""
    url = KAIKKI_URLS.get(lang)
    if not url:
        raise ValueError(f"Unsupported language code: {lang}. Available: {list(KAIKKI_URLS.keys())}")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    print(f"Downloading full dump for [{lang}] from {url}...")

    req = urllib.request.Request(url, headers={"User-Agent": "Linduistics-ETL/1.0"})
    with urllib.request.urlopen(req) as response, open(output_path, "wb") as out_f:
        total_size = int(response.headers.get("content-length", 0))
        block_size = 1024 * 1024  # 1MB
        with tqdm(total=total_size, unit="B", unit_scale=True, desc=f"Full {lang}") as pbar:
            while True:
                buffer = response.read(block_size)
                if not buffer:
                    break
                out_f.write(buffer)
                pbar.update(len(buffer))

    print(f"Full dump saved to {output_path}.")


def main():
    parser = argparse.ArgumentParser(description="Download Kaikki Wiktextract dumps")
    parser.add_argument("--lang", "-l", required=True, choices=list(KAIKKI_URLS.keys()))
    parser.add_argument("--output", "-o", required=True, help="Path to save output file")
    parser.add_argument("--sample", "-s", type=int, default=None, help="If set, only downloads N lines")
    args = parser.parse_args()

    if args.sample:
        download_sample(args.lang, args.output, max_lines=args.sample)
    else:
        download_full(args.lang, args.output)


if __name__ == "__main__":
    main()

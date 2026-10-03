"""Independent token-frequency coverage; Norwegian 'no' is a diagnostic, not Bokmal gold."""
from collections import Counter
import argparse
import json
from pathlib import Path
import random
import urllib.request

import pyarrow.parquet as pq

from e0 import BASELINE, OUTPUT, ROOT, SEED, digest, normalized, save_json

REVISION = '525f9b560de45753a5ea01069454e72e9aa541c6'
DIRECTORY = ROOT / 'pipeline/data/references/frequencywords-2018'


def main():
    DIRECTORY.mkdir(parents=True, exist_ok=True)
    sources, cases = {}, []
    rng = random.Random(SEED)
    for name in ['README.md'] + [f'content/2018/{lang}/{lang}_50k.txt' for lang in ['da', 'de', 'en', 'sv', 'no']]:
        url = f'https://raw.githubusercontent.com/hermitdave/FrequencyWords/{REVISION}/{name}'
        path = DIRECTORY / name.rsplit('/', 1)[-1]
        if not path.exists():
            with urllib.request.urlopen(url, timeout=60) as response:
                content = response.read()
            with path.open('xb') as stream:
                stream.write(content)
        sources[path.name] = {'url': url, 'sha256': digest(path)}
    for source_lang, lang in [('da', 'da'), ('de', 'de'), ('en', 'en'), ('sv', 'sv'), ('no', 'nb')]:
        entries = []
        for rank, line in enumerate((DIRECTORY / f'{source_lang}_50k.txt').read_text(encoding='utf-8').splitlines(), 1):
            word, count = line.rsplit(' ', 1)
            entries.append({'lang': lang, 'source_lang': source_lang, 'token': word, 'rank': rank, 'count': int(count)})
        for start, stop, size in [(1, 200, 200), (201, 1000, 100), (1001, 5000, 100), (5001, 20000, 100)]:
            population = entries[start - 1:stop]
            for case in rng.sample(population, min(size, len(population))):
                cases.append({**case, 'band': f'{start}-{stop}', 'inclusion_probability': min(size, len(population))/len(population),
                              'reference_role': 'mixed-Norwegian diagnostic' if source_lang == 'no' else 'token coverage'})
    # Freeze selection before inspecting dictionary or generator coverage.
    save_json(OUTPUT / 'e0_frequency_protocol.json', {
        'seed': SEED, 'sources': sources, 'revision': REVISION,
        'license': 'FrequencyWords data CC-BY-SA 4.0; code MIT; OpenSubtitles2018 source',
        'sampling': '200 most frequent tokens, then 100 tokens in each of three rank bands, per source language',
        'limits': 'Subtitle tokens are not lemmas or a general population estimate. no is not an independently verified Bokmal corpus.',
    })
    save_json(OUTPUT / 'e0_frequency_cases.json', cases)
    metrics, results = {}, []
    for lang in ['da', 'de', 'en', 'sv', 'nb']:
        headwords = {normalized(w) for w in pq.read_table(BASELINE / f'lemmas_{lang}.parquet', columns=['word']).column('word').to_pylist()}
        forms = {normalized(w) for w in pq.read_table(BASELINE / f'word_forms_{lang}.parquet', columns=['form']).column('form').to_pylist()}
        counts = Counter()
        for case in cases:
            if case['lang'] != lang:
                continue
            token = normalized(case['token'])
            status = 'headword' if token in headwords else 'recorded_form' if token in forms else 'not_found'
            counts[f"{case['band']}:{status}"] += 1
            results.append({**case, 'dictionary_status': status})
        metrics[lang] = dict(counts)
    save_json(OUTPUT / 'e0_frequency_results.json', results)
    save_json(OUTPUT / 'e0_frequency_metrics.json', metrics)
    print(json.dumps(metrics, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=OUTPUT)
    OUTPUT = parser.parse_args().output
    OUTPUT.mkdir(parents=True, exist_ok=True)
    main()

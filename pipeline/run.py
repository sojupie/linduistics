"""Build, verify, resume, and optionally publish the unchanged five-language dataset."""
import argparse
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'pipeline/src'))

from db.seed_db import load_env_file
from db.publish_dataset import publish
from pipeline.src.dataset_artifact import classify_file, sha256, LOOKUPS
from pipeline.src.languages import LANGUAGES
from pipeline.src.semantic_matcher import DEFAULT_MODEL_NAME, DEFAULT_MODEL_REVISION


def write_json(path, value):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-dir', type=Path, required=True)
    parser.add_argument('--reference', type=Path, default=ROOT / 'pipeline/data/reproduce-five-language-20261002/all_comparisons_v2.parquet')
    parser.add_argument('--input-dir', type=Path, default=ROOT / 'pipeline/data')
    parser.add_argument('--lookups-reference', type=Path, default=ROOT / 'pipeline/data/reproduce-five-language-20261002/lookups')
    parser.add_argument('--publish', action='store_true')
    args = parser.parse_args()
    os.chdir(ROOT)
    load_env_file(ROOT / '.env')
    db_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/linduistics')
    directory, inputs, reference = args.run_dir.resolve(), args.input_dir.resolve(), args.reference.resolve()
    lookup_reference = args.lookups_reference.resolve()
    directory.mkdir(parents=True, exist_ok=True)
    if directory in (inputs, reference.parent, lookup_reference):
        raise ValueError('Use a separate build directory; source/reference files are immutable')
    environment = os.environ.copy()
    environment['PYTHONPATH'] = os.pathsep.join((str(ROOT / 'pipeline/src'), str(ROOT)))
    environment['HF_HUB_OFFLINE'] = '1'
    import torch
    import psycopg
    with psycopg.connect(db_url) as conn:
        postgres = conn.execute('SELECT version()').fetchone()[0]
    sources = sorted((ROOT / 'pipeline/src').glob('*.py')) + sorted((ROOT / 'db').glob('*.py')) + [Path(__file__).resolve()]
    contract = dict(languages=list(LANGUAGES), reference_sha256=sha256(reference),
        lookup_references={table: sha256(lookup_reference / f'{table}.parquet') for table in LOOKUPS},
        source_dumps={lang: sha256(inputs / f'kaikki_{lang}.jsonl') for lang in LANGUAGES},
        code={str(path.relative_to(ROOT)): sha256(path) for path in sources},
        runtime=dict(python=platform.python_version(), platform=platform.platform(), postgres=postgres,
                     packages={d.metadata['Name']: d.version for d in importlib.metadata.distributions()},
                     model=DEFAULT_MODEL_NAME, model_revision=DEFAULT_MODEL_REVISION,
                     device='cuda' if torch.cuda.is_available() else 'cpu'))
    manifest_path = directory / 'manifest.json'
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
        if manifest['contract'] != contract:
            raise ValueError('Inputs, code, reference, or environment changed. Use a new run directory.')
    else:
        manifest = dict(schema_version=1, code_revision=subprocess.check_output(['git','rev-parse','HEAD'], text=True).strip(),
                        contract=contract, stages={})
        write_json(manifest_path, manifest)

    def stage(name, outputs, command=None, action=None):
        existing = manifest['stages'].get(name)
        if existing:
            if not all(path.is_file() and sha256(path) == existing['outputs'][path.name] for path in outputs):
                raise ValueError(f'{name}: completed output changed; use a new run directory')
            print(f'{name}: reused verified output', flush=True)
            return
        print(f'{name}: started', flush=True)
        start = time.monotonic()
        if command:
            with (directory / f'{name}.log').open('w', encoding='utf-8') as log:
                subprocess.run([sys.executable, '-u', *map(str, command)], cwd=ROOT, env=environment,
                               stdout=log, stderr=subprocess.STDOUT, check=True)
        result = action() if action else None
        manifest['stages'][name] = dict(seconds=round(time.monotonic()-start, 2),
            command=list(map(str, command)) if command else None,
            outputs={path.name: sha256(path) for path in outputs}, result=result)
        write_json(manifest_path, manifest)
        print(f'{name}: complete ({manifest["stages"][name]["seconds"]}s)', flush=True)

    for lang in LANGUAGES:
        lemmas = directory / f'lemmas_{lang}.parquet'
        stage(f'parse-{lang}', [lemmas], ['-m','pipeline.src.parser','--input',inputs / f'kaikki_{lang}.jsonl','--output',lemmas,'--lang',lang])
        forms = directory / f'word_forms_{lang}.parquet'
        stage(f'forms-{lang}', [forms], ['-m','pipeline.src.extract_forms','--raw',inputs / f'kaikki_{lang}.jsonl','--lemmas',lemmas,'--output',forms,'--lang',lang])
    comparisons = directory / 'comparisons.parquet'
    stage('comparisons', [comparisons], ['-m','pipeline.src.build_crosslingual_dataset','--lemma-dir',directory,'--output',comparisons,'--english-dump',inputs / 'kaikki_en.jsonl'])
    evidence = directory / 'evidence.jsonl'
    evidence_order = [lang for lang in ('sv','da','nb','de','en') if lang in LANGUAGES]
    stage('evidence', [evidence, evidence.with_suffix('.jsonl.manifest.json')], ['-m','pipeline.src.extract_etymology_records','--input-dir',inputs,'--output',evidence,'--languages',*evidence_order,'--force'])
    matches = directory / 'matches.jsonl'
    stage('matches', [matches, matches.with_suffix('.jsonl.manifest.json')], ['-m','pipeline.src.audit_source_cognate_coverage','--source-records',evidence,'--comparisons',comparisons,'--matches-output',matches,'--force'])
    enriched = directory / 'enriched.parquet'
    stage('enriched', [enriched, enriched.with_suffix('.parquet.manifest.json')], ['-m','pipeline.src.enrich_comparisons_with_source_claims','--comparisons',comparisons,'--source-claim-matches',matches,'--output',enriched,'--force'])
    final = directory / 'final.parquet'
    stage('final', [final], action=lambda: classify_file(enriched, reference, final, db_url))
    import shutil
    def copy_lookup(table, output):
        shutil.copyfile(lookup_reference / f'{table}.parquet', output)
    for table in LOOKUPS:
        output = directory / f'{table}.parquet'
        stage(table, [output], action=lambda table=table, output=output: copy_lookup(table, output))
    result = manifest['stages']['final']['result']
    summary = (f"Verified {result['rows']:,} rows against the reference, in the same order.\n"
               f"Core: {result['is_core_rows']:,}; attached claims: {result['attached_source_claims']:,}.\n"
               + '\n'.join(f'{name}: {count:,}' for name,count in sorted(result['categories'].items())) + '\n')
    (directory / 'report.txt').write_text(summary, encoding='utf-8')
    print(summary, flush=True)
    if args.publish:
        manifest['publication'] = publish(directory, db_url)
        write_json(manifest_path, manifest)
        print('Publication committed. Restart the backend to refresh caches.', flush=True)


if __name__ == '__main__':
    main()

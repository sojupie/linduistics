"""Output-preserving final classification and whole-file equivalence checks."""
from collections import Counter
from itertools import zip_longest
import hashlib
import json
from pathlib import Path

import psycopg
import pyarrow as pa
import pyarrow.parquet as pq

from pipeline.src.sense_aligner import classify_pair_senses
from pipeline.src.languages import LANGUAGES

SCORES = ('orthographic_sim', 'phonetic_sim', 'semantic_sim')
LABELS = ('category', 'etymological_relation', 'is_core')
LOOKUPS = {
    'word_inflections': [('id', pa.int64()), ('lang', pa.string()), ('lemma', pa.string()),
                         ('form', pa.string()), ('pos', pa.string()), ('tags', pa.list_(pa.string()))],
    'lemma_synonyms': [('id', pa.int64()), ('lang', pa.string()), ('lemma', pa.string()),
                       ('pos', pa.string()), ('synonyms', pa.list_(pa.string()))],
    'cognate_clusters': [('id', pa.int64()), ('root', pa.string()), ('proto_language', pa.string()),
                         ('language_count', pa.int64()), ('languages', pa.list_(pa.string())),
                         ('members', pa.string()), ('sample_gloss', pa.string()),
                         ('created_at', pa.timestamp('us', tz='UTC'))],
}


def snapshot_lookups(directory, db_url):
    """Capture unchanged lookup rows, including IDs and array ordering, once for the baseline."""
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    result = {}
    with psycopg.connect(db_url) as conn:
        conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
        for table, fields in LOOKUPS.items():
            output = directory / f'{table}.parquet'
            if output.exists():
                raise FileExistsError(output)
            temporary = output.with_suffix('.parquet.tmp')
            names = [name for name, _ in fields]
            count = 0
            try:
                with conn.cursor(name=f'snapshot_{table}') as cur, pq.ParquetWriter(temporary, pa.schema(fields), compression='zstd') as writer:
                    cur.execute(f'SELECT {",".join(names)} FROM {table} ORDER BY id')
                    while values := cur.fetchmany(8192):
                        records = [dict(zip(names, row)) for row in values]
                        for row in records:
                            languages = row.get('languages', [row.get('lang')])
                            if not set(languages) <= set(LANGUAGES):
                                raise ValueError(f'{table} contains a language outside the baseline')
                            if table == 'cognate_clusters':
                                row['members'] = json.dumps(row['members'], ensure_ascii=False)
                        writer.write_table(pa.Table.from_pylist(records, schema=pa.schema(fields)))
                        count += len(records)
                temporary.replace(output)
                result[table] = dict(rows=count, sha256=sha256(output))
            except BaseException:
                temporary.unlink(missing_ok=True)
                raise
    (directory / 'lookups.manifest.json').write_text(json.dumps(result, indent=2) + '\n')
    return result


def sha256(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def rows(path):
    for batch in pq.ParquetFile(path).iter_batches(batch_size=8192):
        yield from batch.to_pylist()


def equal_field(name, left, right):
    if left == right:
        return True
    if name in ('senses_a', 'senses_b', 'translation_source_senses'):
        def normalized(value):
            value = json.loads(value or '[]')
            if name.startswith('senses_'):
                for sense in value:
                    if 'source_claims' in sense:
                        sense['source_claims'].sort(key=lambda claim: json.dumps(claim, sort_keys=True))
            return value
        return normalized(left) == normalized(right)
    return False


def check_row(left, right, index, skip=()):
    if left is None or right is None:
        raise ValueError(f'Row count changed at row {index}')
    if set(left) - set(skip) != set(right) - set(skip):
        raise ValueError('Dataset columns changed')
    for name in set(left) - set(skip):
        if not equal_field(name, left[name], right[name]):
            raise ValueError(f'Row {index}: {name} changed for {left.get("word_a")}/{left.get("word_b")}')


def verify_equal(actual, reference):
    count = 0
    for count, (left, right) in enumerate(zip_longest(rows(actual), rows(reference)), 1):
        check_row(left, right, count)
    if not count:
        raise ValueError('Empty dataset')
    return count


def classify_file(source, reference, output, db_url):
    """Keep v2's scalar inputs and the verified core membership; never realign senses."""
    source, output = Path(source), Path(output)
    pf = pq.ParquetFile(source)
    schema = pf.schema_arrow.append(pa.field('is_core', pa.bool_()))
    baseline = iter(rows(reference))
    temporary = output.with_suffix(output.suffix + '.tmp')
    categories, relations = Counter(), Counter()
    total = core = claims = 0
    try:
        with psycopg.connect(db_url) as conn, pq.ParquetWriter(temporary, schema, compression='zstd') as writer:
            for batch in pf.iter_batches(batch_size=8192):
                records = batch.to_pylist()
                with conn.cursor() as cur:
                    # Match the historical text COPY -> PostgreSQL REAL -> psycopg conversion exactly.
                    cur.execute('SELECT %s::text[]::real[], %s::text[]::real[], %s::text[]::real[]',
                                tuple([str(row[name]) for row in records] for name in SCORES))
                    converted = cur.fetchone()
                for index, row in enumerate(records):
                    old = next(baseline, None)
                    check_row(row, old, total + 1, skip=LABELS)
                    root_a, root_b = row['etym_root_a'], row['etym_root_b']
                    if row['shared_etym_root'] and not root_a and not root_b:
                        root_a = root_b = row['shared_etym_root']
                    result = classify_pair_senses(row['word_a'], row['lang_a'], [], root_a,
                        row['word_b'], row['lang_b'], [], root_b,
                        *(values[index] for values in converted))
                    # The old SQL ranks ties without a tie-break. Preserve the accepted pair tags.
                    row.update(category=result.category, etymological_relation=result.etymological_relation,
                               is_core=old['is_core'])
                    check_row(row, old, total + 1)
                    categories[row['category']] += 1
                    relations[row['etymological_relation']] += 1
                    core += row['is_core']
                    for side in ('a', 'b'):
                        claims += sum(len(s.get('source_claims', [])) for s in json.loads(row[f'senses_{side}']))
                    total += 1
                writer.write_table(pa.Table.from_pylist(records, schema=schema))
                if total % (8192 * 20) == 0:
                    print(f'Classified and verified {total:,} rows', flush=True)
            if next(baseline, None) is not None or total == 0:
                raise ValueError('Reference row count differs or dataset is empty')
        temporary.replace(output)
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise
    return dict(rows=total, categories=dict(categories), relations=dict(relations),
                is_core_rows=core, attached_source_claims=claims, reference_sha256=sha256(reference),
                output_sha256=sha256(output), core_policy='preserve verified reference membership',
                all_fields_and_row_order_verified=True)

"""Verify every field preserved by the new pair stages and every inverse row."""
import argparse
import itertools
import json
import sys
from pathlib import Path

from e0 import ROOT, OUTPUT, digest, save_json
from e5_build import DATA

sys.path.insert(0, str(ROOT))
from pipeline.src.dataset_artifact import rows, check_row
from extract_etymology_records import clean_etymology_root


def verify(destination):
    destination.mkdir(exist_ok=False)
    result = {}
    for partner in ['da', 'de', 'en', 'nb', 'sv']:
        pair = tuple(sorted([partner, 'nl']))
        directory = DATA / '_'.join(pair)
        protocol = json.loads((directory / 'protocol.json').read_text())
        for name, expected in protocol['artifacts'].items():
            assert digest(directory / name) == expected, (pair, name)
        previous = None
        count = 0
        for count, (raw, final) in enumerate(itertools.zip_longest(rows(directory / 'raw.parquet'), rows(directory / 'final.parquet')), 1):
            check_row(raw, final, count, skip=('category', 'etymological_relation', 'is_core',
                'senses_a', 'senses_b', 'etym_root_a', 'etym_root_b', 'shared_etym_root'))
            assert final['is_core'] is None
            for side in ['a', 'b']:
                original = json.loads(raw[f'senses_{side}'])
                actual = json.loads(final[f'senses_{side}'])
                for s in original:
                    if isinstance(s.get('etym_root'), str):
                        s['etym_root'] = clean_etymology_root(s['etym_root'])
                for s in actual:
                    s.pop('source_claims', None)
                assert original == actual, (pair, count, side, 'sense inventory changed')
            if previous is None:
                previous = final
            else:
                inverse = dict(previous)
                for name in ['lang', 'word', 'ipa', 'def', 'pos', 'senses', 'etym_root', 'etym_text']:
                    inverse[name+'_a'], inverse[name+'_b'] = previous[name+'_b'], previous[name+'_a']
                check_row(inverse, final, count)
                previous = None
        assert count and previous is None
        metrics = json.loads((directory / 'metrics.json').read_text())
        assert metrics['rows'] == count
        result[':'.join(pair)] = dict(metrics=metrics, rows_verified=count,
            protocol_sha256=digest(directory / 'protocol.json'), final_sha256=digest(directory / 'final.parquet'),
            all_original_senses_and_nonderived_fields_preserved=True, all_inverse_rows_equal=True)
        print('Verified', pair, count, flush=True)
    save_json(destination / 'verification.json', result)
    save_json(destination / 'protocol.json', dict(code_sha256=digest(Path(__file__)),
        scope='Every Dutch pair row: stage input hashes, preserved fields/senses, core null policy and symmetric inverse. New labels not judged by this structural check.'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=OUTPUT / 'e5-dutch-build002')
    verify(parser.parse_args().output)

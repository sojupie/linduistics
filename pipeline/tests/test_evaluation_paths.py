"""Frozen Windows manifests remain usable without rewriting them on Linux."""
import json

import pytest

from pipeline.evaluation import e0


def test_frozen_manifest_paths(tmp_path, monkeypatch):
    monkeypatch.setattr(e0, 'OUTPUT', tmp_path)
    path = tmp_path / 'e0_input_manifest.json'
    hashes = {'pipeline\\data\\Gen.parquet': 'old-hash'}
    path.write_text(json.dumps({'baseline_and_lookup_hashes': hashes}))
    before = path.read_bytes()
    assert e0.frozen_input_hashes() == {'pipeline/data/Gen.parquet': 'old-hash'}
    assert path.read_bytes() == before
    hashes['pipeline/data/Gen.parquet'] = 'conflicting-hash'
    path.write_text(json.dumps({'baseline_and_lookup_hashes': hashes}))
    with pytest.raises(ValueError, match='Duplicate'):
        e0.frozen_input_hashes()

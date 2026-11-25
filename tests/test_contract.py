from __future__ import annotations

import json
from pathlib import Path

from l1.contract import CONTRACT_VERSION, artifact_bytes, sha256_file, validate_results


ROOT = Path(__file__).resolve().parents[1]


def test_public_results_satisfy_contract():
    results = json.loads((ROOT / "assets" / "data" / "results.json").read_text(encoding="utf-8"))
    validate_results(results)
    assert results["contract_version"] == CONTRACT_VERSION


def test_contract_hashes_reconcile_to_tracked_artifacts():
    contract = json.loads((ROOT / "assets" / "data" / "contract.json").read_text(encoding="utf-8"))
    assert contract["contract"] == CONTRACT_VERSION
    assert len(contract["artifacts"]) >= 10
    for relative, metadata in contract["artifacts"].items():
        path = ROOT / relative
        assert path.exists(), relative
        assert len(artifact_bytes(path)) == metadata["bytes"], relative
        assert sha256_file(path) == metadata["sha256"], relative


def test_data_manifest_exposes_source_fingerprint():
    manifest = json.loads(
        (ROOT / "assets" / "data" / "data_manifest.json").read_text(encoding="utf-8")
    )
    assert manifest["schema_version"] == "cairn-data-v1"
    assert len(manifest["data_sha256"]) == 64
    assert manifest["raw_redistributed"] is False
    assert manifest["rows"] > 5_000

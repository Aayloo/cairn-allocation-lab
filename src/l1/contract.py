"""Validation and artifact provenance for the public research contract."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import pandas as pd


CONTRACT_VERSION = "cairn-results-v3"
TEXT_SUFFIXES = {".css", ".csv", ".html", ".js", ".json", ".md", ".toml", ".txt", ".xml"}
REQUIRED_METRICS = ("L1 SAA", "L1 TAA", "60/40", "Equal weight")
REQUIRED_METRIC_FIELDS = (
    "cagr",
    "annual_volatility",
    "sharpe",
    "sortino",
    "max_drawdown",
    "average_turnover",
    "total_cost",
)


def artifact_bytes(path: str | Path) -> bytes:
    """Read an artifact and normalize text line endings for cross-platform hashes."""
    target = Path(path)
    payload = target.read_bytes()
    if target.suffix.lower() in TEXT_SUFFIXES:
        payload = payload.replace(b"\r\n", b"\n")
    return payload


def sha256_file(path: str | Path) -> str:
    """Return a line-ending-normalized SHA-256 digest for an artifact."""
    return hashlib.sha256(artifact_bytes(path)).hexdigest()


def dataframe_sha256(frame: pd.DataFrame) -> str:
    """Hash a deterministic CSV representation without redistributing the data."""
    canonical = frame.sort_index().copy()
    canonical.index.name = "Date"
    payload = canonical.to_csv(float_format="%.10f").encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def validate_results(results: dict[str, Any]) -> None:
    """Enforce the browser-facing result contract used by Cairn."""
    if results.get("contract_version") != CONTRACT_VERSION:
        raise ValueError("Unexpected result contract version.")
    if results.get("base_currency") != "HKD":
        raise ValueError("The public result contract currently requires HKD.")
    if not isinstance(results.get("cost_bps"), (int, float)):
        raise ValueError("Transaction cost must be numeric.")

    metrics = results.get("metrics")
    if not isinstance(metrics, dict) or set(REQUIRED_METRICS) - set(metrics):
        raise ValueError("Required portfolio metrics are missing.")
    for name in REQUIRED_METRICS:
        values = metrics[name]
        missing = [field for field in REQUIRED_METRIC_FIELDS if field not in values]
        if missing:
            raise ValueError(f"{name} is missing metric fields: {missing}")
        if any(not isinstance(values[field], (int, float)) for field in REQUIRED_METRIC_FIELDS):
            raise ValueError(f"{name} contains a non-numeric metric.")

    weights = results.get("latest_weights")
    policy = results.get("policy_weights")
    if not isinstance(weights, dict) or not isinstance(policy, dict):
        raise ValueError("Portfolio weights must be objects.")
    if set(weights) != set(policy):
        raise ValueError("Current and policy weights must use the same universe.")
    if any(value < 0 for value in weights.values()):
        raise ValueError("Current weights must be long-only.")
    if abs(sum(weights.values()) - 1.0) > 1e-3:
        raise ValueError("Current weights must sum to one.")
    if abs(sum(policy.values()) - 1.0) > 1e-9:
        raise ValueError("Policy weights must sum to one.")

    for field in ("risk_contribution", "annual_return_contribution", "signals"):
        values = results.get(field)
        if not isinstance(values, dict) or not values:
            raise ValueError(f"{field} must be a non-empty object.")

    diagnostics = results.get("risk_diagnostics")
    if not isinstance(diagnostics, dict):
        raise ValueError("Risk concentration diagnostics are missing.")
    required_diagnostics = {
        "capital_hhi",
        "effective_capital_assets",
        "top3_capital_share",
        "risk_hhi_abs",
        "effective_risk_assets",
        "top3_risk_share_abs",
        "dominant_risk_asset",
        "dominant_risk_share",
        "negative_risk_assets",
        "risk_to_capital",
    }
    if required_diagnostics - set(diagnostics):
        raise ValueError("Risk concentration diagnostics are incomplete.")

    reconciliation = results.get("attribution_summary")
    if not isinstance(reconciliation, dict):
        raise ValueError("Attribution reconciliation is missing.")
    required_reconciliation = {
        "gross_contribution",
        "annual_cost",
        "net_arithmetic_return",
        "compounding_residual",
        "reconciled_cagr",
        "identity_error",
    }
    if required_reconciliation - set(reconciliation):
        raise ValueError("Attribution reconciliation is incomplete.")
    if abs(float(reconciliation["identity_error"])) > 1e-8:
        raise ValueError("Attribution reconciliation does not close.")

    if not isinstance(results.get("contribution_groups"), dict):
        raise ValueError("Group contributions are missing.")
    if not isinstance(results.get("yearly_returns_by_strategy"), dict):
        raise ValueError("Yearly strategy returns are missing.")


def write_artifact_contract(
    path: str | Path,
    root: str | Path,
    artifacts: list[str | Path],
) -> Path:
    """Write hashes and validation rules for the public output bundle."""
    project_root = Path(root)
    target = Path(path)
    records = {}
    digest_material = []
    for artifact in artifacts:
        artifact_path = Path(artifact)
        relative = artifact_path.resolve().relative_to(project_root.resolve()).as_posix()
        digest = sha256_file(artifact_path)
        records[relative] = {"sha256": digest, "bytes": len(artifact_bytes(artifact_path))}
        digest_material.append(f"{relative}:{digest}")

    build_id = hashlib.sha256("\n".join(sorted(digest_material)).encode("utf-8")).hexdigest()[:16]
    contract = {
        "contract": CONTRACT_VERSION,
        "schema": "configs/results.schema.json",
        "build_id": build_id,
        "validation_rules": [
            "HKD base currency",
            "Long-only current weights",
            "Current and policy weights sum to one",
            "Required portfolio metrics are numeric",
            "Every listed artifact has a SHA-256 digest",
        ],
        "artifacts": records,
    }
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(contract, indent=2) + "\n", encoding="utf-8")
    return target

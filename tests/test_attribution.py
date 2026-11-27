from __future__ import annotations

import pandas as pd
import pytest

from l1.attribution import (
    group_contributions,
    reconcile_attribution,
    yearly_returns_by_strategy,
)


def test_attribution_bridge_reconciles_to_compounded_return():
    history = pd.DataFrame(
        {
            "net_return": [0.01, -0.005, 0.012, 0.004],
            "cost": [0.0001, 0.0001, 0.0002, 0.0001],
        }
    )
    annual_cost = float(history["cost"].mean() * 12)
    net_arithmetic = float(history["net_return"].mean() * 12)
    contributions = pd.Series(
        {"SPY": net_arithmetic + annual_cost, "IEF": 0.0},
        dtype=float,
    )
    cagr = float((1 + history["net_return"]).prod() ** (12 / len(history)) - 1)
    result = reconcile_attribution(history, contributions, cagr)
    assert result["identity_error"] == 0
    assert result["reconciled_cagr"] == pytest.approx(cagr, abs=1e-6)


def test_group_contributions_sum_to_asset_total():
    contributions = pd.Series(
        {
            "SPY": 0.02,
            "VEA": 0.01,
            "EEM": 0.005,
            "IEF": 0.004,
            "LQD": 0.003,
            "GLD": 0.002,
            "DBC": 0.001,
            "BIL": 0.0005,
        }
    )
    groups = group_contributions(contributions)
    assert sum(groups.values()) == pytest.approx(float(contributions.sum()), abs=1e-6)


def test_yearly_strategy_returns_share_calendar_keys():
    index = pd.to_datetime(["2024-12-31", "2025-01-31", "2025-02-28"])
    histories = {
        "A": pd.DataFrame({"net_return": [0.1, 0.02, -0.01]}, index=index),
        "B": pd.DataFrame({"net_return": [0.05, 0.01, 0.0]}, index=index),
    }
    result = yearly_returns_by_strategy(histories)
    assert set(result) == {"A", "B"}
    assert set(result["A"]) == {"2024", "2025"}

from __future__ import annotations

import pandas as pd
import pytest

from l1.risk import concentration_summary, risk_to_capital


def test_concentration_and_risk_to_capital_are_deterministic():
    weights = pd.Series({"SPY": 0.4, "IEF": 0.4, "GLD": 0.2})
    risk = pd.Series({"SPY": 0.7, "IEF": 0.4, "GLD": -0.1})
    summary = concentration_summary(weights, risk)
    ratios = risk_to_capital(weights, risk)

    assert summary["capital_hhi"] == pytest.approx(0.36)
    assert summary["effective_capital_assets"] == pytest.approx(2.78)
    assert summary["dominant_risk_asset"] == "SPY"
    assert summary["negative_risk_assets"] == ["GLD"]
    assert ratios["SPY"] == pytest.approx(1.75)
    assert ratios["GLD"] == pytest.approx(-0.5)


def test_absolute_risk_hhi_handles_hedges():
    weights = pd.Series({"A": 0.5, "B": 0.25, "C": 0.25})
    risk = pd.Series({"A": 1.2, "B": -0.1, "C": 0.2})
    summary = concentration_summary(weights, risk)
    assert 0 < summary["risk_hhi_abs"] <= 1
    assert summary["effective_risk_assets"] >= 1

"""Portfolio risk concentration diagnostics."""

from __future__ import annotations

import pandas as pd


def concentration_summary(
    weights: pd.Series,
    risk_contribution: pd.Series,
) -> dict[str, object]:
    """Summarize how concentrated the portfolio is in capital and risk."""
    capital = weights.clip(lower=0).astype(float)
    capital = capital / capital.sum()
    capital_hhi = float((capital**2).sum())

    absolute_risk = risk_contribution.abs().astype(float)
    absolute_risk = absolute_risk / absolute_risk.sum()
    risk_hhi = float((absolute_risk**2).sum())
    risk_rank = absolute_risk.sort_values(ascending=False)
    dominant_asset = str(risk_contribution.idxmax())

    return {
        "capital_hhi": round(capital_hhi, 4),
        "effective_capital_assets": round(1 / capital_hhi, 2),
        "top3_capital_share": round(float(capital.nlargest(3).sum()), 4),
        "risk_hhi_abs": round(risk_hhi, 4),
        "effective_risk_assets": round(1 / risk_hhi, 2),
        "top3_risk_share_abs": round(float(risk_rank.head(3).sum()), 4),
        "dominant_risk_asset": dominant_asset,
        "dominant_risk_share": round(float(risk_contribution[dominant_asset]), 4),
        "negative_risk_assets": [
            str(ticker) for ticker, value in risk_contribution.items() if value < 0
        ],
    }


def risk_to_capital(
    weights: pd.Series,
    risk_contribution: pd.Series,
) -> dict[str, float]:
    """Compare each asset's share of risk with its share of capital."""
    result = {}
    for ticker in weights.index:
        capital = float(weights[ticker])
        result[str(ticker)] = (
            round(float(risk_contribution[ticker]) / capital, 4) if capital else 0.0
        )
    return result

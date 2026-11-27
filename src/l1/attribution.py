"""Return attribution reconciliation helpers."""

from __future__ import annotations

import pandas as pd


CONTRIBUTION_GROUPS = {
    "Equity": ("SPY", "VEA", "EEM"),
    "Duration & credit": ("IEF", "LQD"),
    "Real assets": ("GLD", "DBC"),
    "Cash": ("BIL",),
}


def reconcile_attribution(
    history: pd.DataFrame,
    annual_contribution: pd.Series,
    cagr: float,
) -> dict[str, float]:
    """Reconcile additive asset contributions to compounded net return."""
    gross_contribution = float(annual_contribution.sum())
    annual_cost = float(history["cost"].mean() * 12)
    net_arithmetic = float(history["net_return"].mean() * 12)
    compounding_residual = float(cagr - net_arithmetic)
    reconciled_cagr = gross_contribution - annual_cost + compounding_residual
    return {
        "gross_contribution": round(gross_contribution, 6),
        "annual_cost": round(annual_cost, 6),
        "net_arithmetic_return": round(net_arithmetic, 6),
        "compounding_residual": round(compounding_residual, 6),
        "reconciled_cagr": round(reconciled_cagr, 6),
        "identity_error": round(reconciled_cagr - cagr, 10),
    }


def group_contributions(annual_contribution: pd.Series) -> dict[str, float]:
    """Aggregate asset contributions into portfolio decision sleeves."""
    return {
        label: round(float(annual_contribution.loc[list(tickers)].sum()), 6)
        for label, tickers in CONTRIBUTION_GROUPS.items()
    }


def yearly_returns_by_strategy(
    histories: dict[str, pd.DataFrame],
) -> dict[str, dict[str, float]]:
    """Build comparable calendar-year net returns for every portfolio."""
    return {
        label: {
            str(year): round(float(values), 6)
            for year, values in history["net_return"]
            .groupby(history.index.year)
            .apply(lambda returns: (1 + returns).prod() - 1)
            .items()
        }
        for label, history in histories.items()
    }

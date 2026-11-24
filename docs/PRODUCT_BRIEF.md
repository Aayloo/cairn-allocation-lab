# Cairn

**Cairn — Insurance-aware Multi-Asset Allocation Lab**

Cairn is a research cockpit for turning an investment view into an inspectable
portfolio decision. It connects strategic allocation, tactical signals,
constraints, implementation costs, risk, attribution and decision provenance in
one reproducible workflow.

## Product thesis

Most portfolio projects end at a backtest chart. Cairn is designed to answer the
questions that remain after the chart:

- Why this policy allocation?
- What changed at the latest decision point?
- Which constraints bind when the model proposes a rebalance?
- Did the result survive costs and currency translation?
- Where did return and risk actually come from?
- What evidence would invalidate the current conclusion?

## Product principles

1. **Numbers are computed, narratives are explained.** Every displayed metric
   comes from versioned code or a versioned data artifact. A language model may
   explain a number but must never invent or change it.
2. **Policy and implementation are separate.** SAA, TAA, execution and
   attribution are distinct layers with separate decisions and audit trails.
3. **Evidence before presentation.** The interface makes assumptions, tests,
   limitations and negative results visible.
4. **Research, not advice.** Cairn is a paper portfolio. It contains no real
   money, orders, personal account or investment recommendation.
5. **No employer data.** Public artifacts use public market data and sanitized
   examples only.

## Primary users

- Asset-allocation analyst preparing a policy or tactical recommendation.
- Portfolio analyst monitoring drift, risk and implementation.
- Investment committee member reviewing the evidence behind a proposal.
- Quant researcher checking whether a result is reproducible.

## Product surfaces

| Surface | Decision supported |
| --- | --- |
| Command | What requires attention now? |
| Allocation | How do policy, current and proposed weights differ? |
| Risk | Is capital concentration also risk concentration? |
| Attribution | Where did return come from? |
| Research | What is the testable thesis and what would falsify it? |
| Evidence | Can the result be reproduced and audited? |

## North-star artifact

One reproducible repository that produces:

- a browser-based research cockpit;
- versioned allocation and risk data;
- a monthly decision memo;
- an Excel review layer;
- a five-minute and twenty-minute investment narrative;
- a continuous paper-portfolio evidence log.

## Positioning

`Cairn` is the product name. `L1 Multi-Asset Shadow Portfolio` remains the name
of the paper-portfolio evidence series. The public repository should not mention
the author's employer or use internal data.

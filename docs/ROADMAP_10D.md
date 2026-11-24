# Cairn 10-working-day build plan

Start: 2026-11-24  
Target release: 2026-12-07

Each working day ends with one demonstrable improvement, tests, a commit and a
push. A day is complete only when the public site still builds and passes QA.

| Day | Date | Product slice | Acceptance evidence |
| --- | --- | --- | --- |
| 1 | 2026-11-24 | Brand, product brief and command-center shell | Cairn identity, responsive app shell, live KPIs and working navigation |
| 2 | 2026-11-25 | Data contract and provenance panel | typed result schema, manifest, data lineage and source status |
| 3 | 2026-11-26 | Allocation workspace | policy/current dilution, asset drill-down and constraint checks |
| 4 | 2026-11-27 | Risk workspace | capital-versus-risk map, risk decomposition and stress diagnostics |
| 5 | 2026-11-30 | Attribution workspace | contribution reconciliation, yearly heatmap and benchmark gap |
| 6 | 2026-12-01 | Research ledger | decision cards, falsification conditions and version history |
| 7 | 2026-12-02 | Scenario lab | rate, equity, credit and FX shock calculations |
| 8 | 2026-12-03 | Explain layer and audit guardrails | deterministic explanations, provenance badges and report generator |
| 9 | 2026-12-04 | Export pack | Excel, PDF memo, CSV downloads and accessibility review |
| 10 | 2026-12-07 | Release quality | CI, screenshots, 5/20-minute scripts and v1.0 tag |

## Daily operating rule

1. Pick the single acceptance item for the day.
2. Implement and test it.
3. Run `pytest` and browser QA.
4. Update `CHANGELOG.md` and the roadmap status.
5. Commit and push with a descriptive message.

## Definition of product-grade

- Works at 390, 768, 1024 and 1440 px without horizontal overflow.
- Every chart has a text summary and every download resolves.
- Keyboard focus, reduced motion and semantic labels are present.
- All numbers can be traced to `assets/data/results.json`, the data manifest or
  a documented deterministic calculation.
- Negative results remain visible.
- The public site never includes employer names or internal project data.

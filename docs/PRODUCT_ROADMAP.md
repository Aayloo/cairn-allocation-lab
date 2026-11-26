# Cairn product roadmap

Cairn evolves through capability milestones rather than a calendar-driven
feature count. Each milestone must leave a usable research improvement, a
reproducible artifact and a passing test surface.

| Milestone | Status | Product capability | Acceptance evidence |
| --- | --- | --- | --- |
| Foundation | Complete | Brand, product brief and command-center shell | Cairn identity, responsive app shell, live KPIs and working navigation |
| Data contract | Complete | Versioned inputs and provenance | typed result schema, manifest, data lineage, artifact hashes and source status |
| Allocation | Complete | Policy, current and proposed weights | policy/current dilution, asset drill-down and constraint checks |
| Risk | Next | Capital-versus-risk analysis | risk decomposition, concentration diagnostics and stress tests |
| Attribution | Planned | Return and risk explanation | contribution reconciliation, yearly heatmap and benchmark gap |
| Research ledger | Planned | Decision history and falsifiability | decision cards, invalidation conditions and version history |
| Scenario lab | Planned | Constraint-aware shocks | rate, equity, credit and FX scenario calculations |
| Explain layer | Planned | Deterministic research narration | provenance labels and report generation without invented metrics |
| Export pack | Planned | Portfolio and committee artifacts | Excel, PDF memo, CSV downloads and accessibility review |
| Release quality | Planned | Reproducible public product | CI, screenshots, product walkthrough and tagged release |

## Operating rule

1. Complete one capability milestone at a time.
2. Implement and test it.
3. Run `pytest` and browser QA.
4. Update `CHANGELOG.md` and roadmap status.
5. Commit and push with a descriptive message.

## Definition of product-grade

- Works at 390, 768, 1024 and 1440 px without horizontal overflow.
- Every chart has a text summary and every download resolves.
- Keyboard focus, reduced motion and semantic labels are present.
- All numbers can be traced to `assets/data/results.json`, the data manifest or
  a documented deterministic calculation.
- Negative results remain visible.
- The public site never includes employer names or internal project data.

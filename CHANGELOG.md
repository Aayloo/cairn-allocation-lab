# Changelog

## 2026-11-26 — Allocation studio

- Added an interactive eight-asset allocation draft with synchronized sliders
  and numeric percentage inputs.
- Added local draft persistence, current/policy reset actions and normalization.
- Added live fully-invested, equity-range, cash-range and single-asset checks
  with inline field errors and a constraint summary.
- Added turnover and estimated transaction-cost feedback without mutating the
  frozen policy or published performance history.
- Marked the allocation milestone complete and moved Risk to Next.

## 2026-11-25 — Data contract

- Added a versioned public-results schema and runtime validation for currency,
  numeric metrics, universe alignment and fully invested long-only weights.
- Expanded the data manifest with revision semantics, coverage and a SHA-256
  fingerprint of the canonical input data.
- Added an artifact contract that hashes results, configuration, charts and
  downloadable data outputs.
- Added a live Data Contract panel to the Evidence workspace.
- Marked the data-contract milestone complete and moved Allocation to Next.

## 2026-11-24 — Public positioning

- Removed calendar-duration framing from public product copy.
- Reorganized the roadmap around capability milestones and acceptance evidence.

## 2026-11-24 — Repository rename

- Renamed the GitHub repository from `l1-multi-asset-shadow` to
  `cairn-allocation-lab`.
- Updated canonical, social-preview, sitemap, documentation and repository links.
- Preserved the full Git history and the original research/data pipeline.
- Added a clickable product screenshot and prominent live-demo links to the
  README.

## 2026-11-24 — Day 1

- Introduced the Cairn product identity and 10-working-day roadmap.
- Replaced the long-form research page with a responsive research-cockpit shell.
- Added live KPI rendering, workspace navigation and a keyboard command palette.
- Added client-side performance, allocation, risk and attribution views backed by
  versioned JSON and CSV artifacts.
- Added a generated Cairn social card and product documentation.
- Added browser QA for all workspaces, responsive layouts, navigation and the
  command palette.
- Kept the paper-portfolio and no-investment-advice boundaries visible.

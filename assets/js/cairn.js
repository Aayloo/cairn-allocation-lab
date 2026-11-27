(() => {
  "use strict";

  const results = window.PORTFOLIO_RESULTS || {};
  const panels = Array.from(document.querySelectorAll("[data-view-panel]"));
  const navButtons = Array.from(document.querySelectorAll("[data-view-target]"));
  const mobileNavButtons = Array.from(document.querySelectorAll(".mobile-nav [data-view-target]"));
  const currentWorkspace = document.querySelector("#current-workspace");
  const menuButton = document.querySelector("#menu-button");
  const scrim = document.querySelector("#mobile-scrim");
  const commandTrigger = document.querySelector("#command-trigger");
  const commandDialog = document.querySelector("#command-dialog");
  const commandInput = document.querySelector("#command-input");
  const commandResults = document.querySelector("#command-results");
  const commandClose = document.querySelector("#command-close");
  const toast = document.querySelector("#toast");
  const tooltip = document.querySelector("#chart-tooltip");
  const canvas = document.querySelector("#performance-chart");

  const workspaceNames = {
    command: "Command",
    allocation: "Allocation",
    risk: "Risk",
    attribution: "Attribution",
    research: "Research",
    evidence: "Evidence",
  };

  const assetGroups = {
    equity: { label: "Equity", className: "equity", tickers: ["SPY", "VEA", "EEM"], color: "var(--positive)" },
    duration: { label: "Duration & credit", className: "duration", tickers: ["IEF", "LQD"], color: "var(--blue)" },
    real: { label: "Real assets", className: "real", tickers: ["GLD", "DBC"], color: "var(--accent)" },
    cash: { label: "Cash", className: "cash", tickers: ["BIL"], color: "#778393" },
  };

  const tickerClasses = {
    SPY: "equity",
    VEA: "equity",
    EEM: "equity",
    IEF: "duration",
    LQD: "duration",
    GLD: "real",
    DBC: "real",
    BIL: "cash",
  };

  const allocationStorageKey = "cairn-allocation-draft-v1";
  const allocationLimits = {
    singleAssetMax: 0.4,
    equityMin: 0.3,
    equityMax: 0.6,
    cashMin: 0.05,
    cashMax: 0.25,
    tolerance: 0.001,
  };
  let draftWeights = {};

  const commands = [
    { title: "Open command center", detail: "Portfolio overview and latest decision", icon: "command", target: "command", shortcut: "G D" },
    { title: "Inspect allocation", detail: "Policy weights, drift and constraints", icon: "allocation", target: "allocation", shortcut: "G A" },
    { title: "Review portfolio risk", detail: "Risk contribution and concentration", icon: "risk", target: "risk", shortcut: "G R" },
    { title: "Explain performance", detail: "Return contribution and calendar years", icon: "attribution", target: "attribution", shortcut: "G P" },
    { title: "Read research thesis", detail: "Decision record, falsification conditions and roadmap", icon: "research", target: "research", shortcut: "G S" },
    { title: "Audit the evidence", detail: "Data lineage, tests and downloads", icon: "evidence", target: "evidence", shortcut: "G E" },
  ];

  function readPath(object, path) {
    return path.split(".").reduce((value, key) => {
      if (value === undefined || value === null) return undefined;
      return value[key];
    }, object);
  }

  function format(value, mode) {
    if (mode === "text") return value ?? "—";
    if (value === undefined || value === null || Number.isNaN(Number(value))) return "—";
    if (mode === "percent") return `${(Number(value) * 100).toFixed(2)}%`;
    if (mode === "bps") {
      const bps = Math.abs(Number(value)) > 1 ? Number(value) : Number(value) * 10_000;
      return `${bps.toFixed(1)} bps`;
    }
    if (mode === "decimal") return Number(value).toFixed(3);
    return String(value);
  }

  function signedPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    const sign = number > 0 ? "+" : "";
    return `${sign}${(number * 100).toFixed(1)}%`;
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value;
    });
  }

  function renderPrimitiveResults() {
    document.querySelectorAll("[data-result]").forEach((element) => {
      const value = readPath(results, element.dataset.result);
      element.textContent = format(value, element.dataset.format);
    });
  }

  function groupWeights(weights) {
    return Object.entries(assetGroups).map(([key, group]) => {
      const value = group.tickers.reduce((sum, ticker) => sum + Number(weights?.[ticker] || 0), 0);
      return { key, ...group, value };
    });
  }

  function groupRisk(risk) {
    return Object.entries(assetGroups).map(([key, group]) => {
      const value = group.tickers.reduce((sum, ticker) => sum + Number(risk?.[ticker] || 0), 0);
      return { key, ...group, value };
    });
  }

  function renderOverviewAllocation() {
    const container = document.querySelector("#overview-allocation-list");
    const donut = document.querySelector("#allocation-donut");
    if (!container || !donut) return;
    const groups = groupWeights(results.latest_weights);
    let start = 0;
    const segments = groups.map((group) => {
      const end = start + group.value * 100;
      const segment = `${group.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      start = end;
      return segment;
    });
    donut.style.background = `conic-gradient(${segments.join(", ")})`;
    const equity = groups.find((group) => group.key === "equity");
    const centerValue = donut.querySelector("strong");
    if (centerValue) centerValue.textContent = format(equity?.value, "percent");
    donut.setAttribute("aria-label", `Current allocation: equity ${format(equity?.value, "percent")}, duration and credit ${format(groups[1]?.value, "percent")}, real assets ${format(groups[2]?.value, "percent")}, cash ${format(groups[3]?.value, "percent")}`);
    container.innerHTML = groups.map((group) => `
      <div class="allocation-row">
        <span><i style="background:${group.color}"></i>${group.label}</span>
        <strong>${format(group.value, "percent")}</strong>
      </div>
    `).join("");
  }

  function renderOverviewRisk() {
    const stack = document.querySelector("#overview-risk-stack");
    if (!stack) return;
    const groups = groupRisk(results.risk_contribution);
    const total = groups.reduce((sum, group) => sum + Math.max(0, group.value), 0);
    stack.innerHTML = groups.map((group) => `
      <span
        class="risk-fill--${group.className}"
        style="width:${(Math.max(0, group.value) / total) * 100}%"
        title="${group.label}: ${format(group.value, "percent")}"></span>
    `).join("");
    stack.setAttribute("aria-label", groups.map((group) => `${group.label} ${format(group.value, "percent")}`).join("; "));
  }

  function renderYearStrip() {
    const strip = document.querySelector("#year-strip");
    if (!strip) return;
    const returns = Object.entries(results.yearly_returns || {});
    const maxAbs = Math.max(...returns.map(([, value]) => Math.abs(Number(value))), 0.01);
    strip.innerHTML = returns.map(([year, value]) => {
      const height = Math.max(2, (Math.abs(Number(value)) / maxAbs) * 46);
      const state = Number(value) >= 0 ? "is-positive" : "is-negative";
      return `
        <div class="year-bar" title="${year}: ${signedPercent(value)}">
          <i class="${state}" style="height:${height}%"></i>
          <span>${year.slice(2)}</span>
        </div>
      `;
    }).join("");
  }

  function renderWeightTable() {
    const table = document.querySelector("#weight-table");
    if (!table) return;
    const tickers = Object.keys(results.policy_weights || {});
    table.innerHTML = tickers.map((ticker) => {
      const current = Number(results.latest_weights?.[ticker] || 0);
      const policy = Number(results.policy_weights?.[ticker] || 0);
      const delta = current - policy;
      const deltaClass = Math.abs(delta) < 0.0005 ? "" : delta > 0 ? "is-positive" : "is-negative";
      return `
        <div class="weight-row">
          <span class="asset-icon" aria-hidden="true">${ticker.slice(0, 2)}</span>
          <span class="weight-name">
            <strong>${results.ticker_labels?.[ticker] || ticker}</strong>
            <small>${ticker} · Policy ${format(policy, "percent")}</small>
          </span>
          <span class="weight-bar" aria-hidden="true"><i style="width:${Math.min(100, current * 250)}%"></i></span>
          <span class="weight-value">${format(current, "percent")}</span>
          <span class="weight-delta ${deltaClass}">${delta > 0 ? "+" : ""}${(delta * 100).toFixed(2)}%</span>
        </div>
      `;
    }).join("");
    const total = Object.values(results.latest_weights || {}).reduce((sum, value) => sum + Number(value), 0);
    const totalElement = document.querySelector("#weight-total");
    if (totalElement) totalElement.textContent = format(total, "percent");
  }

  function allocationGroup(ticker) {
    return tickerClasses[ticker] || "cash";
  }

  function validDraft(candidate) {
    const tickers = Object.keys(results.policy_weights || {});
    return candidate
      && tickers.every((ticker) => Number.isFinite(Number(candidate[ticker])))
      && Object.keys(candidate).length === tickers.length;
  }

  function loadAllocationDraft() {
    const fallback = { ...(results.latest_weights || {}) };
    try {
      const stored = JSON.parse(localStorage.getItem(allocationStorageKey) || "null");
      if (validDraft(stored)) return Object.fromEntries(
        Object.keys(fallback).map((ticker) => [ticker, Number(stored[ticker])])
      );
    } catch {
      // Fall back to the frozen current allocation.
    }
    return fallback;
  }

  function saveAllocationDraft() {
    try {
      localStorage.setItem(allocationStorageKey, JSON.stringify(draftWeights));
    } catch {
      // The draft remains usable for the current page session.
    }
  }

  function renderAllocationControls() {
    const container = document.querySelector("#allocation-controls");
    if (!container) return;
    container.innerHTML = Object.keys(results.policy_weights || {}).map((ticker) => {
      const group = allocationGroup(ticker);
      return `
        <div class="allocation-control" data-allocation-control="${ticker}">
          <div class="allocation-control-head">
            <span>
              <i class="risk-fill--${group}" aria-hidden="true"></i>
              ${results.ticker_labels?.[ticker] || ticker}
            </span>
            <small>${ticker} · current ${format(results.latest_weights?.[ticker], "percent")}</small>
          </div>
          <div class="allocation-control-inputs">
            <input
              type="range"
              min="0"
              max="60"
              step="0.1"
              value="${(draftWeights[ticker] * 100).toFixed(1)}"
              data-allocation-ticker="${ticker}"
              data-allocation-control-type="range"
              aria-label="${ticker} allocation slider"
            >
            <span class="allocation-number">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                inputmode="decimal"
                value="${(draftWeights[ticker] * 100).toFixed(1)}"
                data-allocation-ticker="${ticker}"
                data-allocation-control-type="number"
                aria-label="${ticker} allocation percent"
                aria-describedby="allocation-error-${ticker}"
              >
              <span aria-hidden="true">%</span>
            </span>
          </div>
          <small class="allocation-field-error" id="allocation-error-${ticker}" hidden></small>
        </div>
      `;
    }).join("");
  }

  function setAllocationDraft(weights) {
    const tickers = Object.keys(results.policy_weights || {});
    draftWeights = Object.fromEntries(
      tickers.map((ticker) => [ticker, Math.max(0, Math.min(1, Number(weights[ticker] || 0)))])
    );
    document.querySelectorAll("[data-allocation-ticker]").forEach((input) => {
      const ticker = input.dataset.allocationTicker;
      input.value = (draftWeights[ticker] * 100).toFixed(1);
    });
    updateAllocationDraft();
  }

  function invalidateAllocationControl(ticker, message = "") {
    const control = document.querySelector(`[data-allocation-control="${ticker}"]`);
    const error = document.querySelector(`#allocation-error-${ticker}`);
    const inputs = document.querySelectorAll(`[data-allocation-ticker="${ticker}"]`);
    if (!control || !error) return;
    const invalid = Boolean(message);
    control.classList.toggle("is-invalid", invalid);
    error.hidden = !invalid;
    error.textContent = message;
    inputs.forEach((input) => {
      if (invalid) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    });
  }

  function updateAllocationDraft() {
    const tickers = Object.keys(results.policy_weights || {});
    const current = results.latest_weights || {};
    const total = tickers.reduce((sum, ticker) => sum + draftWeights[ticker], 0);
    const equity = Object.keys(draftWeights)
      .filter((ticker) => allocationGroup(ticker) === "equity")
      .reduce((sum, ticker) => sum + draftWeights[ticker], 0);
    const cash = Object.keys(draftWeights)
      .filter((ticker) => allocationGroup(ticker) === "cash")
      .reduce((sum, ticker) => sum + draftWeights[ticker], 0);
    const turnover = 0.5 * tickers.reduce(
      (sum, ticker) => sum + Math.abs(draftWeights[ticker] - Number(current[ticker] || 0)),
      0
    );
    const cost = turnover * Number(results.cost_bps || 0) / 10_000;

    setText("#allocation-total", format(total, "percent"));
    setText("#allocation-equity", format(equity, "percent"));
    setText("#allocation-cash", format(cash, "percent"));
    setText("#allocation-turnover", format(turnover, "percent"));
    setText("#allocation-cost", format(cost, "bps"));

    const constraints = [
      {
        label: `Fully invested: ${format(total, "percent")}`,
        pass: Math.abs(total - 1) <= allocationLimits.tolerance,
      },
      {
        label: `Equity within 30%–60%: ${format(equity, "percent")}`,
        pass: equity >= allocationLimits.equityMin && equity <= allocationLimits.equityMax,
      },
      {
        label: `Cash within 5%–25%: ${format(cash, "percent")}`,
        pass: cash >= allocationLimits.cashMin && cash <= allocationLimits.cashMax,
      },
    ];

    const oversized = tickers.filter((ticker) => {
      const invalid = draftWeights[ticker] > allocationLimits.singleAssetMax + 1e-9;
      invalidateAllocationControl(
        ticker,
        invalid ? `Reduce ${ticker} to 40% or below.` : ""
      );
      return invalid;
    });
    constraints.push({
      label: oversized.length
        ? `Single-sleeve ceiling breached: ${oversized.join(", ")}`
        : "Single-sleeve ceiling: every asset is 40% or below",
      pass: oversized.length === 0,
    });

    const list = document.querySelector("#allocation-constraint-list");
    if (list) {
      list.innerHTML = constraints.map((constraint) => `
        <li class="${constraint.pass ? "" : "is-error"}">${constraint.label}</li>
      `).join("");
    }
    const status = document.querySelector("#allocation-constraint-status");
    const failures = constraints.filter((constraint) => !constraint.pass).length;
    if (status) {
      status.textContent = failures ? `${failures} issue${failures === 1 ? "" : "s"}` : "Pass";
      status.classList.remove("signal-chip--pending", "signal-chip--positive", "signal-chip--error");
      status.classList.add(failures ? "signal-chip--error" : "signal-chip--positive");
    }
    saveAllocationDraft();
  }

  function initializeAllocationBuilder() {
    if (!document.querySelector("#allocation-controls")) return;
    draftWeights = loadAllocationDraft();
    renderAllocationControls();
    setAllocationDraft(draftWeights);

    document.querySelectorAll("[data-allocation-ticker]").forEach((input) => {
      const update = () => {
        const ticker = input.dataset.allocationTicker;
        const percentage = Math.max(0, Math.min(100, Number(input.value) || 0));
        draftWeights[ticker] = percentage / 100;
        document.querySelectorAll(`[data-allocation-ticker="${ticker}"]`).forEach((peer) => {
          if (peer !== input) peer.value = percentage.toFixed(1);
        });
        updateAllocationDraft();
      };
      input.addEventListener("input", update);
      input.addEventListener("change", update);
    });

    document.querySelector("#use-current-allocation")?.addEventListener("click", () => {
      setAllocationDraft(results.latest_weights || {});
      showToast("Current allocation loaded into the draft.");
    });
    document.querySelector("#use-policy-allocation")?.addEventListener("click", () => {
      setAllocationDraft(results.policy_weights || {});
      showToast("Policy allocation loaded into the draft.");
    });
    document.querySelector("#normalize-allocation")?.addEventListener("click", () => {
      const total = Object.values(draftWeights).reduce((sum, value) => sum + value, 0);
      const source = total > 0 ? draftWeights : results.policy_weights;
      const sourceTotal = Object.values(source).reduce((sum, value) => sum + value, 0);
      setAllocationDraft(Object.fromEntries(
        Object.keys(source).map((ticker) => [ticker, source[ticker] / sourceTotal])
      ));
    });
  }

  function renderRiskBars() {
    const container = document.querySelector("#risk-bars");
    if (!container) return;
    const entries = Object.entries(results.risk_contribution || {})
      .sort((a, b) => Number(b[1]) - Number(a[1]));
    const maxAbs = Math.max(...entries.map(([, value]) => Math.abs(Number(value))), 0.01);
    container.innerHTML = entries.map(([ticker, value]) => {
      const group = tickerClasses[ticker] || "cash";
      const width = Math.max(1, (Math.abs(Number(value)) / maxAbs) * 100);
      return `
        <div class="risk-bar-row">
          <span class="risk-bar-label">
            <strong>${results.ticker_labels?.[ticker] || ticker}</strong>
            <small>${ticker} · capital ${format(results.latest_weights?.[ticker], "percent")}</small>
          </span>
          <span class="risk-bar-track" aria-hidden="true"><i class="risk-fill--${group}" style="width:${width}%"></i></span>
          <span class="risk-bar-value">${format(value, "percent")}</span>
        </div>
      `;
    }).join("");
  }

  function renderRiskDiagnostics() {
    const diagnostics = results.risk_diagnostics;
    if (!diagnostics) return;
    const groups = groupWeights(results.latest_weights);
    const riskGroups = groupRisk(results.risk_contribution);
    const equityCapital = groups.find((group) => group.key === "equity")?.value || 0;
    const equityRisk = riskGroups.find((group) => group.key === "equity")?.value || 0;

    setText("#equity-risk-share", format(equityRisk, "percent"));
    setText("#equity-capital-caption", `of variance from ${format(equityCapital, "percent")} of capital`);
    setText("#effective-capital-assets", Number(diagnostics.effective_capital_assets).toFixed(1));
    setText("#effective-risk-assets", Number(diagnostics.effective_risk_assets).toFixed(1));
    setText("#top3-capital-share", format(diagnostics.top3_capital_share, "percent"));
    setText("#top3-risk-share", format(diagnostics.top3_risk_share_abs, "percent"));
    const dominant = diagnostics.dominant_risk_asset;
    setText(
      "#risk-dominant-chip",
      `${dominant} largest risk · ${format(diagnostics.dominant_risk_share, "percent")}`
    );

    const container = document.querySelector("#risk-decomposition-table");
    if (!container) return;
    const contributors = Object.entries(results.risk_contribution || {})
      .sort((a, b) => Number(b[1]) - Number(a[1]));
    container.innerHTML = contributors.map(([ticker, risk]) => {
      const capital = Number(results.latest_weights?.[ticker] || 0);
      const ratio = Number(diagnostics.risk_to_capital?.[ticker] || 0);
      const role = ratio < 0 ? "hedge" : ratio > 1.1 ? "amplifier" : "aligned";
      const roleLabel = ratio < 0
        ? `hedge ${ratio.toFixed(2)}×`
        : `${role} ${ratio.toFixed(2)}×`;
      return `
        <div class="risk-decomposition-row">
          <span class="risk-decomposition-name">
            <strong>${results.ticker_labels?.[ticker] || ticker}</strong>
            <small>${ticker}</small>
          </span>
          <span>${format(capital, "percent")}</span>
          <span>${format(risk, "percent")}</span>
          <span class="risk-role risk-role--${role}">${roleLabel}</span>
        </div>
      `;
    }).join("");
  }

  function renderHistoricalStress() {
    const container = document.querySelector("#historical-stress-tape");
    if (!container) return;
    const losses = Object.entries(results.yearly_returns || {})
      .filter(([, value]) => Number(value) < 0)
      .sort((a, b) => Number(a[1]) - Number(b[1]));
    const maxDrawdown = results.metrics?.["L1 TAA"]?.max_drawdown;
    const cards = losses.map(([year, value]) => `
      <div class="stress-card">
        <span>${year} calendar year</span>
        <strong>${signedPercent(value)}</strong>
        <small>Realised paper-portfolio return</small>
      </div>
    `);
    cards.push(`
      <div class="stress-card">
        <span>Full-sample peak-to-trough</span>
        <strong>${format(maxDrawdown, "percent")}</strong>
        <small>Maximum drawdown</small>
      </div>
    `);
    container.innerHTML = cards.join("");
  }

  function renderContributionBars() {
    const container = document.querySelector("#contribution-bars");
    if (!container) return;
    const entries = Object.entries(results.annual_return_contribution || {})
      .sort((a, b) => Number(b[1]) - Number(a[1]));
    const max = Math.max(...entries.map(([, value]) => Math.abs(Number(value))), 0.01);
    container.innerHTML = entries.map(([ticker, value]) => {
      const width = Math.max(1, (Math.abs(Number(value)) / max) * 100);
      return `
        <div class="contribution-row">
          <span class="contribution-label">
            <strong>${results.ticker_labels?.[ticker] || ticker}</strong>
            <small>${ticker}</small>
          </span>
          <span class="contribution-track" aria-hidden="true">
            <i style="width:${width}%;background:${Number(value) >= 0 ? "var(--positive)" : "var(--negative)"}"></i>
          </span>
          <span class="contribution-value">${signedPercent(value)}</span>
        </div>
      `;
    }).join("");
  }

  function renderAttributionSummary() {
    const summary = results.attribution_summary;
    if (!summary) return;
    setText("#attribution-gross-contribution", format(summary.gross_contribution, "percent"));
    setText("#attribution-annual-cost", format(-summary.annual_cost, "percent"));
    setText("#attribution-net-arithmetic", format(summary.net_arithmetic_return, "percent"));
    setText("#attribution-compounding-residual", format(summary.compounding_residual, "percent"));
    setText("#attribution-reconciled-cagr", format(summary.reconciled_cagr, "percent"));
    setText("#attribution-identity-error", Number(summary.identity_error).toExponential(1));

    const status = document.querySelector("#attribution-identity-status");
    if (status) {
      const closed = Math.abs(Number(summary.identity_error)) < 1e-8;
      status.textContent = closed ? "Identity closed" : "Review required";
      status.classList.remove("signal-chip--positive", "signal-chip--error");
      status.classList.add(closed ? "signal-chip--positive" : "signal-chip--error");
    }

    const container = document.querySelector("#contribution-groups");
    if (!container) return;
    const groups = Object.entries(results.contribution_groups || {});
    const total = groups.reduce((sum, [, value]) => sum + Number(value), 0);
    container.innerHTML = groups.map(([label, value]) => `
      <div class="contribution-group">
        <span>${label}</span>
        <strong>${signedPercent(value)}</strong>
        <small>${format(Number(value) / total, "percent")} of contribution</small>
      </div>
    `).join("");
  }

  function renderHeatmap() {
    const heatmap = document.querySelector("#year-heatmap");
    if (!heatmap) return;
    const returns = Object.entries(results.yearly_returns || {});
    const benchmarkReturns = results.yearly_returns_by_strategy?.["60/40"] || {};
    const maxAbs = Math.max(...returns.map(([, value]) => Math.abs(Number(value))), 0.01);
    heatmap.innerHTML = returns.map(([year, value]) => {
      const number = Number(value);
      const alpha = 0.05 + (Math.abs(number) / maxAbs) * 0.24;
      const state = number >= 0 ? "is-positive" : "is-negative";
      const benchmark = benchmarkReturns[year];
      const active = Number.isFinite(Number(benchmark)) ? number - Number(benchmark) : null;
      return `
        <div class="heat-cell ${state}" style="--heat-alpha:${alpha}">
          <span>${year}</span>
          <strong>${signedPercent(number)}</strong>
          <small>${active === null ? "60/40 n/a" : `vs 60/40 ${active > 0 ? "+" : ""}${(active * 100).toFixed(1)} pp`}</small>
        </div>
      `;
    }).join("");
  }

  function renderBenchmarkGap() {
    const target = document.querySelector("#benchmark-gap");
    if (!target) return;
    const gap = Number(results.metrics?.["60/40"]?.cagr) - Number(results.metrics?.["L1 SAA"]?.cagr);
    target.textContent = `${gap >= 0 ? "+" : ""}${(gap * 100).toFixed(2)} pp`;
    const sharpeGap = Number(results.metrics?.["60/40"]?.sharpe) - Number(results.metrics?.["L1 SAA"]?.sharpe);
    const sharpeTarget = document.querySelector("#benchmark-sharpe-gap");
    if (sharpeTarget) {
      sharpeTarget.textContent = `${sharpeGap >= 0 ? "+" : ""}${sharpeGap.toFixed(3)}`;
    }
  }

  function renderStaticModules() {
    renderOverviewAllocation();
    renderOverviewRisk();
    renderYearStrip();
    renderWeightTable();
    renderRiskBars();
    renderRiskDiagnostics();
    renderHistoricalStress();
    renderContributionBars();
    renderAttributionSummary();
    renderHeatmap();
    renderBenchmarkGap();
  }

  function shortHash(value) {
    return typeof value === "string" && value.length > 12 ? `${value.slice(0, 12)}…` : value || "—";
  }

  async function loadDataContract() {
    const status = document.querySelector("#contract-status");
    try {
      const [manifestResponse, contractResponse] = await Promise.all([
        fetch("assets/data/data_manifest.json"),
        fetch("assets/data/contract.json"),
      ]);
      if (!manifestResponse.ok || !contractResponse.ok) {
        throw new Error("Contract artifacts are unavailable.");
      }
      const [manifest, contract] = await Promise.all([
        manifestResponse.json(),
        contractResponse.json(),
      ]);
      setText("#contract-name", contract.contract);
      setText("#contract-build", contract.build_id);
      setText("#contract-data-hash", shortHash(manifest.data_sha256));
      setText("#contract-artifact-count", `${Object.keys(contract.artifacts || {}).length} verified`);
      setText("#contract-source", manifest.source);
      setText("#contract-coverage", `${manifest.start} → ${manifest.end}`);
      if (status) {
        status.textContent = "Verified";
        status.classList.remove("signal-chip--pending", "signal-chip--error");
        status.classList.add("signal-chip--verified");
      }
    } catch {
      if (status) {
        status.textContent = "Unavailable";
        status.classList.remove("signal-chip--pending", "signal-chip--verified");
        status.classList.add("signal-chip--error");
      }
    }
  }

  function showWorkspace(id, { updateHash = true, focus = false } = {}) {
    const targetId = workspaceNames[id] ? id : "command";
    panels.forEach((panel) => {
      const active = panel.id === targetId;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    navButtons.forEach((button) => {
      const active = button.dataset.viewTarget === targetId;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    mobileNavButtons.forEach((button) => {
      const active = button.dataset.viewTarget === targetId;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (currentWorkspace) currentWorkspace.textContent = workspaceNames[targetId];
    document.title = `${workspaceNames[targetId]} · Cairn`;
    if (updateHash && window.location.hash !== `#${targetId}`) {
      history.replaceState(null, "", `#${targetId}`);
    }
    closeMenu();
    if (focus) {
      const heading = document.querySelector(`#${targetId} h1, #${targetId} h2`);
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    window.setTimeout(drawPerformanceChart, 30);
  }

  navButtons.forEach((button) => {
    button.addEventListener("click", () => showWorkspace(button.dataset.viewTarget));
  });

  function openMenu() {
    document.body.classList.add("nav-open");
    menuButton?.setAttribute("aria-expanded", "true");
    menuButton?.setAttribute("aria-label", "Close workspace navigation");
    if (scrim) scrim.hidden = false;
  }

  function closeMenu({ restoreFocus = false } = {}) {
    const wasOpen = document.body.classList.contains("nav-open");
    document.body.classList.remove("nav-open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "Open workspace navigation");
    if (scrim) scrim.hidden = true;
    if (restoreFocus && wasOpen) menuButton?.focus();
  }

  menuButton?.addEventListener("click", () => {
    if (document.body.classList.contains("nav-open")) closeMenu({ restoreFocus: true });
    else openMenu();
  });
  scrim?.addEventListener("click", () => closeMenu({ restoreFocus: true }));

  let historyRows = [];
  let activeRange = "ALL";
  let latestChartPoints = [];
  let resizeFrame = 0;

  function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return [];
    const columns = lines[0].split(",");
    const dateIndex = columns.indexOf("date");
    const navIndex = columns.indexOf("nav");
    const drawdownIndex = columns.indexOf("drawdown");
    return lines.slice(1).filter(Boolean).map((line) => {
      const cells = line.split(",");
      return {
        date: cells[dateIndex],
        nav: Number(cells[navIndex]),
        drawdown: Number(cells[drawdownIndex]),
      };
    }).filter((row) => row.date && Number.isFinite(row.nav));
  }

  function filteredHistory() {
    if (!historyRows.length) return [];
    if (activeRange === "ALL") return historyRows;
    const years = activeRange === "1Y" ? 1 : activeRange === "3Y" ? 3 : 5;
    const latest = new Date(`${historyRows.at(-1).date}T00:00:00`);
    const cutoff = new Date(latest);
    cutoff.setFullYear(cutoff.getFullYear() - years);
    return historyRows.filter((row) => new Date(`${row.date}T00:00:00`) >= cutoff);
  }

  function drawPerformanceChart() {
    if (!canvas || canvas.closest("[hidden]")) return;
    const rows = filteredHistory();
    if (!rows.length) return;
    const wrap = canvas.parentElement;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(200, rect.width);
    const height = Math.max(180, rect.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = { top: 18, right: 10, bottom: 30, left: 42 };
    const innerWidth = width - pad.left - pad.right;
    const innerHeight = height - pad.top - pad.bottom;
    const navValues = rows.map((row) => row.nav);
    const rawMin = Math.min(...navValues);
    const rawMax = Math.max(...navValues);
    const range = Math.max(0.08, rawMax - rawMin);
    const min = rawMin - range * 0.08;
    const max = rawMax + range * 0.08;

    function x(index) {
      return pad.left + (index / Math.max(1, rows.length - 1)) * innerWidth;
    }

    function y(value) {
      return pad.top + (1 - (value - min) / (max - min)) * innerHeight;
    }

    ctx.font = '10px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = "#657181";
    ctx.strokeStyle = "rgba(222, 231, 240, 0.08)";
    ctx.lineWidth = 1;
    for (let index = 0; index <= 4; index += 1) {
      const lineY = pad.top + (innerHeight / 4) * index;
      const value = max - ((max - min) / 4) * index;
      ctx.beginPath();
      ctx.moveTo(pad.left, lineY);
      ctx.lineTo(width - pad.right, lineY);
      ctx.stroke();
      ctx.fillText(value.toFixed(2), 2, lineY + 3);
    }

    const tickCount = width < 480 ? 3 : 6;
    ctx.textAlign = "center";
    for (let index = 0; index < tickCount; index += 1) {
      const rowIndex = Math.round((rows.length - 1) * (index / Math.max(1, tickCount - 1)));
      const row = rows[rowIndex];
      const label = activeRange === "1Y"
        ? row.date.slice(5, 7)
        : row.date.slice(0, 4);
      ctx.fillStyle = "#657181";
      ctx.fillText(label, x(rowIndex), height - 8);
    }
    ctx.textAlign = "left";

    const fill = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
    fill.addColorStop(0, "rgba(102, 215, 170, 0.20)");
    fill.addColorStop(1, "rgba(102, 215, 170, 0)");
    ctx.beginPath();
    rows.forEach((row, index) => {
      if (index === 0) ctx.moveTo(x(index), y(row.nav));
      else ctx.lineTo(x(index), y(row.nav));
    });
    ctx.lineTo(x(rows.length - 1), height - pad.bottom);
    ctx.lineTo(x(0), height - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.beginPath();
    rows.forEach((row, index) => {
      if (index === 0) ctx.moveTo(x(index), y(row.nav));
      else ctx.lineTo(x(index), y(row.nav));
    });
    ctx.strokeStyle = "#66d7aa";
    ctx.lineWidth = 2.1;
    ctx.stroke();

    const latestIndex = rows.length - 1;
    ctx.beginPath();
    ctx.arc(x(latestIndex), y(rows[latestIndex].nav), 4, 0, Math.PI * 2);
    ctx.fillStyle = "#66d7aa";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x(latestIndex), y(rows[latestIndex].nav), 8, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(102, 215, 170, 0.32)";
    ctx.lineWidth = 2;
    ctx.stroke();

    latestChartPoints = rows.map((row, index) => ({
      ...row,
      x: x(index),
      y: y(row.nav),
    }));
  }

  function showChartTooltip(event) {
    if (!tooltip || !latestChartPoints.length) return;
    const rect = canvas.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    let closest = latestChartPoints[0];
    for (const point of latestChartPoints) {
      if (Math.abs(point.x - pointerX) < Math.abs(closest.x - pointerX)) closest = point;
    }
    if (Math.abs(closest.x - pointerX) > 26) {
      tooltip.hidden = true;
      return;
    }
    tooltip.innerHTML = `${closest.date}<strong>NAV ${closest.nav.toFixed(4)}</strong>Drawdown ${(closest.drawdown * 100).toFixed(2)}%`;
    tooltip.style.left = `${closest.x}px`;
    tooltip.style.top = `${closest.y}px`;
    tooltip.hidden = false;
  }

  canvas?.addEventListener("pointermove", showChartTooltip);
  canvas?.addEventListener("pointerleave", () => {
    if (tooltip) tooltip.hidden = true;
  });

  document.querySelectorAll("[data-range]").forEach((button) => {
    button.addEventListener("click", () => {
      activeRange = button.dataset.range;
      document.querySelectorAll("[data-range]").forEach((candidate) => {
        candidate.classList.toggle("is-active", candidate === button);
      });
      drawPerformanceChart();
    });
  });

  const chartObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(drawPerformanceChart);
  });
  if (canvas?.parentElement) chartObserver.observe(canvas.parentElement);

  let commandIndex = 0;
  let filteredCommands = commands.slice();

  function renderCommands() {
    if (!commandResults) return;
    if (!filteredCommands.length) {
      commandResults.innerHTML = '<div class="command-empty">No matching workspace or metric.</div>';
      return;
    }
    commandResults.innerHTML = `
      <div class="command-group-label">Workspaces</div>
      ${filteredCommands.map((command, index) => `
        <button class="command-result ${index === commandIndex ? "is-selected" : ""}" type="button" data-command-index="${index}">
          <svg aria-hidden="true"><use href="#icon-${command.icon}"/></svg>
          <span><strong>${command.title}</strong><small>${command.detail}</small></span>
          <span>${command.shortcut}</span>
        </button>
      `).join("")}
    `;
    commandResults.querySelectorAll("[data-command-index]").forEach((button) => {
      button.addEventListener("click", () => {
        const command = filteredCommands[Number(button.dataset.commandIndex)];
        closeCommandPalette();
        showWorkspace(command.target, { focus: true });
      });
    });
  }

  function filterCommands() {
    const query = commandInput?.value.trim().toLowerCase() || "";
    filteredCommands = commands.filter((command) =>
      `${command.title} ${command.detail}`.toLowerCase().includes(query)
    );
    commandIndex = 0;
    renderCommands();
  }

  function openCommandPalette() {
    if (!commandDialog) return;
    commandIndex = 0;
    filteredCommands = commands.slice();
    if (commandInput) commandInput.value = "";
    renderCommands();
    commandDialog.showModal();
    commandTrigger?.setAttribute("aria-expanded", "true");
    window.setTimeout(() => commandInput?.focus(), 0);
  }

  function closeCommandPalette() {
    if (commandDialog?.open) commandDialog.close();
    commandTrigger?.setAttribute("aria-expanded", "false");
    commandTrigger?.focus();
  }

  commandTrigger?.addEventListener("click", openCommandPalette);
  commandClose?.addEventListener("click", closeCommandPalette);
  commandInput?.addEventListener("input", filterCommands);
  commandDialog?.addEventListener("click", (event) => {
    if (event.target === commandDialog) closeCommandPalette();
  });

  document.querySelector("#copy-command")?.addEventListener("click", async () => {
    const command = document.querySelector("#reproduce-command")?.textContent || "";
    try {
      await navigator.clipboard.writeText(command);
      showToast("Reproduction commands copied.");
    } catch {
      showToast("Copy failed. Select the command block instead.");
    }
  });

  let toastTimer;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 2200);
  }

  let pendingGo = false;
  document.addEventListener("keydown", (event) => {
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openCommandPalette();
      return;
    }
    if (event.key === "Escape") {
      if (commandDialog?.open) closeCommandPalette();
      else closeMenu({ restoreFocus: true });
      pendingGo = false;
      return;
    }
    if (commandDialog?.open) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        commandIndex = Math.min(filteredCommands.length - 1, commandIndex + 1);
        renderCommands();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        commandIndex = Math.max(0, commandIndex - 1);
        renderCommands();
      } else if (event.key === "Enter" && filteredCommands[commandIndex]) {
        event.preventDefault();
        const command = filteredCommands[commandIndex];
        closeCommandPalette();
        showWorkspace(command.target, { focus: true });
      }
      return;
    }
    if (typing) return;
    if (event.key.toLowerCase() === "g") {
      pendingGo = true;
      window.setTimeout(() => {
        pendingGo = false;
      }, 1200);
      return;
    }
    if (pendingGo) {
      const mapping = { d: "command", a: "allocation", r: "risk", p: "attribution", s: "research", e: "evidence" };
      const target = mapping[event.key.toLowerCase()];
      if (target) {
        event.preventDefault();
        showWorkspace(target);
      }
      pendingGo = false;
    }
  });

  renderPrimitiveResults();
  renderStaticModules();
  initializeAllocationBuilder();
  loadDataContract();
  const initialWorkspace = window.location.hash.replace("#", "");
  showWorkspace(workspaceNames[initialWorkspace] ? initialWorkspace : "command", { updateHash: false });

  fetch("assets/data/performance_history.csv")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then((text) => {
      historyRows = parseCsv(text);
      drawPerformanceChart();
    })
    .catch(() => {
      if (tooltip) {
        tooltip.textContent = "Performance history could not be loaded.";
        tooltip.hidden = false;
        tooltip.style.left = "50%";
        tooltip.style.top = "50%";
      }
    });
})();

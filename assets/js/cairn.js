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

  function renderHeatmap() {
    const heatmap = document.querySelector("#year-heatmap");
    if (!heatmap) return;
    const returns = Object.entries(results.yearly_returns || {});
    const maxAbs = Math.max(...returns.map(([, value]) => Math.abs(Number(value))), 0.01);
    heatmap.innerHTML = returns.map(([year, value]) => {
      const number = Number(value);
      const alpha = 0.05 + (Math.abs(number) / maxAbs) * 0.24;
      const state = number >= 0 ? "is-positive" : "is-negative";
      return `
        <div class="heat-cell ${state}" style="--heat-alpha:${alpha}">
          <span>${year}</span>
          <strong>${signedPercent(number)}</strong>
        </div>
      `;
    }).join("");
  }

  function renderBenchmarkGap() {
    const target = document.querySelector("#benchmark-gap");
    if (!target) return;
    const gap = Number(results.metrics?.["60/40"]?.cagr) - Number(results.metrics?.["L1 SAA"]?.cagr);
    target.textContent = `${gap >= 0 ? "+" : ""}${(gap * 100).toFixed(2)} pp`;
  }

  function renderStaticModules() {
    renderOverviewAllocation();
    renderOverviewRisk();
    renderYearStrip();
    renderWeightTable();
    renderRiskBars();
    renderContributionBars();
    renderHeatmap();
    renderBenchmarkGap();
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

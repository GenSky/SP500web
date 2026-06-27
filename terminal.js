import { scoreStock } from "./src/lib/scoring";
import { filterByUniverse, mergeStocks } from "./src/lib/universes";

const root = document.querySelector("#terminal-root");
const PAGE_TITLE = "GENSKY VRS";
const tapeSymbols = ["AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "CRM", "ADBE", "INTC", "AMD"];

const state = {
  search: "",
  sector: "ALL",
  maxPe: "",
  maxForwardPe: "",
  maxPeg: "",
  minScore: "0",
  signal: "ALL",
  sortKey: "score",
  sortDir: "desc",
  visibleRows: [],
  lastScanAt: new Date(),
  lastUpdatedAt: new Date(),
  tapeTick: 0,
  notice: "SCAN COMPLETE"
};

const allStocks = filterByUniverse(mergeStocks([]), "SP500").map(toTerminalStock);
const sectors = ["ALL", ...Array.from(new Set(allStocks.map((stock) => stock.sector).filter(Boolean))).sort()];

if (!root) {
  throw new Error("terminal root not found");
}

render();
startClock();
window.setInterval(() => {
  state.tapeTick += 1;
  renderTickerTape();
}, 8000);

window.addEventListener("keydown", (event) => {
  if (!["F1", "F2", "F3", "F4", "F5", "F8"].includes(event.key)) return;
  event.preventDefault();
  runCommand(event.key.replace("F", ""));
});

function toTerminalStock(stock) {
  if (stock.hasMetrics === false) {
    const score = simpleValueScore(stock);
    return {
      ...stock,
      valueScore: score,
      finalRiskAdjustedValueScore: score,
      valueTrapRiskScore: 75,
      terminalScore: score,
      signal: signalFor(score, 75),
      terminalReason: "Metrics are missing. Import or refresh data before using this ticker.",
      hasUsableMetrics: false
    };
  }

  const score = scoreStock(stock);
  const terminalScore = Math.round(score.finalRiskAdjustedValueScore);
  return {
    ...stock,
    ...score,
    terminalScore,
    signal: signalFor(terminalScore, score.valueTrapRiskScore),
    terminalReason: reasonFor(stock, score),
    hasUsableMetrics: true
  };
}

function simpleValueScore(stock) {
  let score = 50;
  score += lowerMetricBonus(stock.trailingPE, 10, 25, 14);
  score += lowerMetricBonus(stock.forwardPE, 9, 22, 16);
  score += lowerMetricBonus(stock.pegRatio, 0.8, 2.2, 12);

  if (isUsable(stock.marketCap) && stock.marketCap > 10_000_000_000) score += 4;
  if (!isUsable(stock.trailingPE)) score -= 10;
  if (!isUsable(stock.forwardPE)) score -= 10;
  if (isUsable(stock.trailingPE) && stock.trailingPE > 45) score -= 14;
  if (isUsable(stock.pegRatio) && stock.pegRatio > 3) score -= 12;

  return clamp(Math.round(score));
}

function lowerMetricBonus(value, good, poor, weight) {
  if (!isUsable(value)) return 0;
  if (value <= good) return weight;
  if (value >= poor) return -Math.round(weight * 0.7);
  return Math.round(((poor - value) / (poor - good)) * weight);
}

function signalFor(score, trapRisk) {
  if (trapRisk >= 70 || score < 60) return "AVOID";
  if (score >= 80 && trapRisk < 45) return "BUY";
  return "WATCH";
}

function reasonFor(stock, score) {
  const valuation = [
    metricPhrase("P/E", stock.trailingPE),
    metricPhrase("forward P/E", stock.forwardPE),
    metricPhrase("PEG", stock.pegRatio)
  ].filter(Boolean).join(" / ");
  const fcf = isUsable(stock.freeCashFlowYield) ? `FCF yield ${formatNumber(stock.freeCashFlowYield)}%` : "FCF yield unavailable";
  const risk = `trap risk ${Math.round(score.valueTrapRiskScore)}`;
  return `${valuation || "valuation data limited"}; ${fcf}; ${risk}. Simple research score, verify current data.`;
}

function metricPhrase(label, value) {
  return isUsable(value) ? `${label} ${formatNumber(value)}` : "";
}

function render() {
  state.lastUpdatedAt = new Date();
  const visibleRows = applyFilters(allStocks).sort(sortRows);
  state.visibleRows = visibleRows;
  const topStock = allStocks.slice().sort((a, b) => b.terminalScore - a.terminalScore || a.ticker.localeCompare(b.ticker))[0];

  root.innerHTML = `
    <header class="terminal-header">
      <div class="brand-block"><strong>${PAGE_TITLE}</strong><span>Value Research System</span></div>
      <div class="header-center">S&amp;P 500 VALUE RESEARCH SYSTEM</div>
      <div class="header-right"><span id="live-date"></span><span id="live-clock"></span><span>LOCAL SCAN READY</span></div>
    </header>

    <section class="ticker-tape" aria-label="Ticker tape"><div id="ticker-track" class="ticker-track"></div></section>

    <nav class="command-row" aria-label="Terminal commands">
      ${commandButton("1", "SCAN")}
      ${commandButton("2", "FILTER")}
      ${commandButton("3", "TOP VALUE")}
      ${commandButton("4", "WATCHLIST")}
      ${commandButton("5", "REFRESH")}
      ${commandButton("8", "EXPORT")}
    </nav>

    <main>
      <section class="dashboard-grid" aria-label="Terminal dashboard">
        ${renderOverviewPanel(visibleRows)}
        ${renderTopSignalsPanel()}
        ${renderPickPanel(topStock)}
        ${renderSectorPanel()}
        ${renderFiltersPanel()}
        ${renderSignalsPanel()}
      </section>

      <section class="panel scanner-panel" id="scanner-panel">
        <h2>MAIN STOCK SCANNER</h2>
        <div class="table-tools">
          <span>${visibleRows.length} rows visible / ${allStocks.length} S&amp;P 500 rows loaded</span>
          <span>Sort: ${escapeHtml(sortLabel(state.sortKey))} ${state.sortDir.toUpperCase()}</span>
          <span>${escapeHtml(state.notice)}</span>
        </div>
        <div class="table-wrap">${renderTable(visibleRows)}</div>
      </section>
    </main>

    <footer class="status-footer">
      <strong>GENSKY VRS 1994 MODE</strong>
      <span><span class="footer-label">Visible</span>${visibleRows.length}</span>
      <span><span class="footer-label">Last updated</span>${timeString(state.lastUpdatedAt)}</span>
      <span>RESEARCH ONLY - NOT FINANCIAL ADVICE</span>
    </footer>
  `;

  bindEvents();
  updateClock();
  renderTickerTape();
}

function commandButton(key, label) {
  return `<button class="fkey" type="button" data-command="${key}">[F${key} ${label}]</button>`;
}

function renderOverviewPanel(rows) {
  const watchCount = allStocks.filter((stock) => stock.signal === "WATCH").length;
  const avoidCount = allStocks.filter((stock) => stock.signal === "AVOID").length;
  return `<article class="panel">
    <h2>MARKET OVERVIEW</h2>
    <div class="panel-body metric-grid">
      ${metric("Total loaded", allStocks.length)}
      ${metric("Passing filters", rows.length)}
      ${metric("Marked watch", watchCount)}
      ${metric("Marked avoid", avoidCount)}
      ${metric("Last scan", timeString(state.lastScanAt))}
      ${metric("Data mode", "LOCAL")}
    </div>
  </article>`;
}

function renderTopSignalsPanel() {
  const top = allStocks.slice().sort((a, b) => b.terminalScore - a.terminalScore || a.ticker.localeCompare(b.ticker)).slice(0, 7);
  return `<article class="panel">
    <h2>TOP VALUE SIGNALS</h2>
    <div class="panel-body"><ol class="top-list">
      ${top.map((stock) => `<li><button class="symbol-link" type="button" data-symbol-search="${stock.ticker}">${stock.ticker}</button><span>${escapeHtml(stock.companyName)}</span><b class="${scoreClass(stock.terminalScore)}">${stock.terminalScore}</b></li>`).join("")}
    </ol></div>
  </article>`;
}

function renderPickPanel(stock) {
  if (!stock) return `<article class="panel"><h2>AI PICK / SCORE</h2><div class="panel-body empty-state">No scored rows available.</div></article>`;
  return `<article class="panel">
    <h2>AI PICK / SCORE</h2>
    <div class="panel-body">
      <div class="pick-label">Highest local research score</div>
      <div class="pick-symbol"><strong>${stock.ticker}</strong><span>${escapeHtml(stock.companyName)}</span>${signalBadge(stock.signal)}</div>
      <div class="metric"><small>Simple research score</small><strong>${stock.terminalScore}</strong></div>
      <p class="pick-reason">${escapeHtml(stock.terminalReason)}</p>
    </div>
  </article>`;
}

function renderSectorPanel() {
  const bySector = new Map();
  allStocks.forEach((stock) => {
    const list = bySector.get(stock.sector) || [];
    list.push(stock);
    bySector.set(stock.sector, list);
  });

  if (bySector.size === 0) {
    return `<article class="panel"><h2>SECTOR RADAR</h2><div class="panel-body empty-state">Sector data unavailable.</div></article>`;
  }

  const rows = Array.from(bySector.entries()).map(([sector, stocks]) => {
    const avg = Math.round(stocks.reduce((sum, stock) => sum + stock.terminalScore, 0) / stocks.length);
    const leader = stocks.slice().sort((a, b) => b.terminalScore - a.terminalScore)[0];
    return { sector, avg, leader, count: stocks.length };
  }).sort((a, b) => b.avg - a.avg).slice(0, 8);

  return `<article class="panel"><h2>SECTOR RADAR</h2><div class="panel-body"><ul class="sector-list">
    ${rows.map((row) => `<li><button class="symbol-link" type="button" data-sector-pick="${escapeAttr(row.sector)}">${escapeHtml(row.sector.slice(0, 8).toUpperCase())}</button><span>${row.count} rows / lead ${row.leader.ticker}</span><b class="${scoreClass(row.avg)}">${row.avg}</b></li>`).join("")}
  </ul></div></article>`;
}

function renderFiltersPanel() {
  return `<article class="panel filters-panel" id="filters-panel">
    <h2>VALUE FILTERS</h2>
    <form class="panel-body form-grid" id="filter-form">
      <label>Search symbol/company<input id="filter-search" name="search" value="${escapeAttr(state.search)}" autocomplete="off" placeholder="CMG, Apple, software"></label>
      <label>Sector<select name="sector">${sectors.map((sector) => `<option value="${escapeAttr(sector)}" ${state.sector === sector ? "selected" : ""}>${escapeHtml(sector)}</option>`).join("")}</select></label>
      <label>Signal<select name="signal">${["ALL", "BUY", "WATCH", "AVOID"].map((signal) => `<option value="${signal}" ${state.signal === signal ? "selected" : ""}>${signal}</option>`).join("")}</select></label>
      <label>Max P/E<input name="maxPe" inputmode="decimal" value="${escapeAttr(state.maxPe)}" placeholder="30"></label>
      <label>Max forward P/E<input name="maxForwardPe" inputmode="decimal" value="${escapeAttr(state.maxForwardPe)}" placeholder="25"></label>
      <label>Max PEG<input name="maxPeg" inputmode="decimal" value="${escapeAttr(state.maxPeg)}" placeholder="2.0"></label>
      <label>Minimum score<input name="minScore" inputmode="numeric" value="${escapeAttr(state.minScore)}" placeholder="60"></label>
      <button class="fkey" type="submit">[RUN FILTER]</button>
    </form>
  </article>`;
}

function renderSignalsPanel() {
  const messages = [
    state.notice,
    "VALUE GAP DETECTED",
    "CHECK DEBT / FCF",
    "WIDE VALUATION DISPERSION",
    "REVIEW BEFORE TRADE",
    "LOCAL DATA - VERIFY CURRENT QUOTES"
  ];
  return `<article class="panel"><h2>NOTES / SIGNALS</h2><div class="panel-body"><ul class="signal-list">
    ${messages.map((message) => `<li>&gt; ${escapeHtml(message)}</li>`).join("")}
  </ul></div></article>`;
}

function renderTable(rows) {
  if (rows.length === 0) return `<div class="empty-state">NO ROWS MATCH CURRENT FILTERS.</div>`;
  return `<table aria-label="S&P 500 value scanner table">
    <thead><tr>
      ${header("rank", "Rank")}
      ${header("ticker", "Symbol")}
      ${header("company", "Company")}
      ${header("sector", "Sector")}
      ${header("price", "Price")}
      ${header("marketCap", "Market Cap")}
      ${header("pe", "P/E")}
      ${header("forwardPe", "Forward P/E")}
      ${header("peg", "PEG")}
      ${header("score", "Value Score")}
      ${header("signal", "Signal")}
    </tr></thead>
    <tbody>
      ${rows.map((stock, index) => `<tr>
        <td>${index + 1}</td>
        <td><button class="symbol-link" type="button" data-symbol-search="${stock.ticker}">${stock.ticker}</button></td>
        <td class="company" title="${escapeAttr(stock.companyName)}">${escapeHtml(stock.companyName)}</td>
        <td>${escapeHtml(stock.sector || "--")}</td>
        <td>${currency(stock.price)}</td>
        <td>${marketCap(stock.marketCap)}</td>
        <td>${metricValue(stock.trailingPE)}</td>
        <td>${metricValue(stock.forwardPE)}</td>
        <td>${metricValue(stock.pegRatio)}</td>
        <td><span class="badge ${scoreBucket(stock.terminalScore)}">${stock.terminalScore}</span></td>
        <td>${signalBadge(stock.signal)}</td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

function header(key, label) {
  const marker = state.sortKey === key ? (state.sortDir === "asc" ? " ^" : " v") : "";
  return `<th><button type="button" data-sort="${key}">${escapeHtml(label)}${marker}</button></th>`;
}

function metric(label, value) {
  return `<div class="metric"><small>${escapeHtml(label)}</small><strong>${escapeHtml(String(value))}</strong></div>`;
}

function bindEvents() {
  document.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => runCommand(button.dataset.command));
  });

  document.querySelector("#filter-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    collectFilters(event.currentTarget);
    state.notice = "FILTER RUN COMPLETE";
    render();
    document.querySelector("#scanner-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDir = defaultSortDir(key);
      }
      state.notice = `SORT ${sortLabel(key).toUpperCase()}`;
      render();
    });
  });

  document.querySelectorAll("[data-symbol-search]").forEach((button) => {
    button.addEventListener("click", () => {
      state.search = button.dataset.symbolSearch || "";
      state.signal = "ALL";
      state.sector = "ALL";
      state.notice = `SYMBOL FOCUS ${state.search}`;
      render();
      document.querySelector("#scanner-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll("[data-sector-pick]").forEach((button) => {
    button.addEventListener("click", () => {
      state.search = "";
      state.sector = button.dataset.sectorPick || "ALL";
      state.notice = `SECTOR RADAR ${state.sector}`;
      render();
    });
  });
}

function collectFilters(form) {
  const data = new FormData(form);
  state.search = String(data.get("search") || "").trim();
  state.sector = String(data.get("sector") || "ALL");
  state.signal = String(data.get("signal") || "ALL");
  state.maxPe = String(data.get("maxPe") || "").trim();
  state.maxForwardPe = String(data.get("maxForwardPe") || "").trim();
  state.maxPeg = String(data.get("maxPeg") || "").trim();
  state.minScore = String(data.get("minScore") || "0").trim();
}

function runCommand(command) {
  switch (String(command)) {
    case "1":
    case "5":
      state.lastScanAt = new Date();
      state.notice = command === "1" ? "SCAN COMPLETE" : "REFRESH COMPLETE";
      render();
      break;
    case "2":
      document.querySelector("#filter-search")?.focus();
      document.querySelector("#filters-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      break;
    case "3":
      state.sortKey = "score";
      state.sortDir = "desc";
      state.notice = "TOP VALUE SORT";
      render();
      document.querySelector("#scanner-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      break;
    case "4":
      state.signal = "WATCH";
      state.search = "";
      state.notice = "WATCHLIST SIGNAL FILTER";
      render();
      break;
    case "8":
      exportCsv();
      break;
    default:
      break;
  }
}

function applyFilters(stocks) {
  const search = state.search.toUpperCase();
  const maxPe = parseOptionalNumber(state.maxPe);
  const maxForwardPe = parseOptionalNumber(state.maxForwardPe);
  const maxPeg = parseOptionalNumber(state.maxPeg);
  const minScore = parseOptionalNumber(state.minScore) ?? 0;

  return stocks.filter((stock) => {
    if (search && !`${stock.ticker} ${stock.companyName}`.toUpperCase().includes(search)) return false;
    if (state.sector !== "ALL" && stock.sector !== state.sector) return false;
    if (state.signal !== "ALL" && stock.signal !== state.signal) return false;
    if (maxPe !== null && (!isUsable(stock.trailingPE) || stock.trailingPE > maxPe)) return false;
    if (maxForwardPe !== null && (!isUsable(stock.forwardPE) || stock.forwardPE > maxForwardPe)) return false;
    if (maxPeg !== null && (!isUsable(stock.pegRatio) || stock.pegRatio > maxPeg)) return false;
    return stock.terminalScore >= minScore;
  });
}

function sortRows(a, b) {
  const dir = state.sortDir === "asc" ? 1 : -1;
  const av = sortValue(a, state.sortKey);
  const bv = sortValue(b, state.sortKey);
  if (typeof av === "string" || typeof bv === "string") return String(av).localeCompare(String(bv)) * dir;
  return ((av || 0) - (bv || 0)) * dir || a.ticker.localeCompare(b.ticker);
}

function sortValue(stock, key) {
  const values = {
    rank: stock.terminalScore,
    ticker: stock.ticker,
    company: stock.companyName,
    sector: stock.sector,
    price: stock.price,
    marketCap: stock.marketCap,
    pe: stock.trailingPE,
    forwardPe: stock.forwardPE,
    peg: stock.pegRatio,
    score: stock.terminalScore,
    signal: stock.signal
  };
  return values[key] ?? stock.terminalScore;
}

function defaultSortDir(key) {
  return ["ticker", "company", "sector", "signal"].includes(key) ? "asc" : "desc";
}

function renderTickerTape() {
  const track = document.querySelector("#ticker-track");
  if (!track) return;
  const items = tapeSymbols.map((symbol) => {
    const stock = allStocks.find((item) => item.ticker === symbol);
    const price = stock ? currency(stock.price) : "--";
    const move = tickerMove(symbol, state.tapeTick);
    const className = move >= 0 ? "positive" : "negative";
    const sign = move >= 0 ? "+" : "";
    return `<span class="ticker-item"><span class="ticker-symbol">${symbol}</span><span class="ticker-price">${price}</span><span class="${className}">${sign}${move.toFixed(2)}%</span></span>`;
  });
  track.innerHTML = [...items, ...items].join("");
}

function tickerMove(symbol, tick) {
  let seed = tick * 97;
  for (const char of symbol) seed += char.charCodeAt(0) * 17;
  const normalized = ((seed * 9301 + 49297) % 233280) / 233280;
  return normalized * 5 - 2.5;
}

function exportCsv() {
  const rows = state.visibleRows;
  const headers = ["Rank", "Symbol", "Company", "Sector", "Price", "Market Cap", "PE", "Forward PE", "PEG", "Value Score", "Signal"];
  const csvRows = [headers, ...rows.map((stock, index) => [
    index + 1,
    stock.ticker,
    stock.companyName,
    stock.sector,
    stock.price,
    stock.marketCap,
    stock.trailingPE,
    stock.forwardPE,
    stock.pegRatio,
    stock.terminalScore,
    stock.signal
  ])];
  const csv = csvRows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gensky-vrs-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  state.notice = "CSV EXPORT COMPLETE";
  render();
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function startClock() {
  updateClock();
  window.setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  const clock = document.querySelector("#live-clock");
  const date = document.querySelector("#live-date");
  if (clock) clock.textContent = now.toLocaleTimeString();
  if (date) date.textContent = now.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

function signalBadge(signal) {
  return `<span class="signal ${signal.toLowerCase()}">${signal}</span>`;
}

function scoreBucket(score) {
  if (score >= 80) return "good";
  if (score >= 60) return "watch";
  return "avoid";
}

function scoreClass(score) {
  return scoreBucket(score);
}

function sortLabel(key) {
  const labels = {
    rank: "Rank",
    ticker: "Symbol",
    company: "Company",
    sector: "Sector",
    price: "Price",
    marketCap: "Market Cap",
    pe: "P/E",
    forwardPe: "Forward P/E",
    peg: "PEG",
    score: "Value Score",
    signal: "Signal"
  };
  return labels[key] || "Value Score";
}

function parseOptionalNumber(value) {
  if (String(value || "").trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isUsable(value) {
  return Number.isFinite(value) && value > 0;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function currency(value) {
  if (!isUsable(value)) return "--";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function marketCap(value) {
  if (!isUsable(value)) return "--";
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

function metricValue(value) {
  return isUsable(value) ? formatNumber(value) : "--";
}

function formatNumber(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value) : "--";
}

function timeString(value) {
  return value.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char] || char));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

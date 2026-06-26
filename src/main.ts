import "./styles.css";
import { parseCsvWatchlist } from "./lib/csvImport";
import { scoreStock } from "./lib/scoring";
import { loadCustomStocks, loadTrackedTrades, saveCustomStocks, saveTrackedTrades } from "./lib/storage";
import { pickTrade } from "./lib/tradePicker";
import { displayUniverse, filterByUniverse, mergeStocks } from "./lib/universes";
import type { FilterState, ScoredStock, StockMetric, StockUniverse, TrackerEntry, TradeUniverse } from "./types";

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("#app root not found");
}

const app = appRoot;

let customStocks = loadCustomStocks();
let trackedTrades = loadTrackedTrades();
let filters: FilterState = {
  universe: "NASDAQ_100",
  sector: "All",
  minValueScore: 0,
  maxDebtRisk: 100,
  positiveFcfOnly: false,
  minAnalystUpside: 0,
  minDrawdown: 0,
  avoidValueTraps: false
};

render();

function render(): void {
  const allStocks = mergeStocks(customStocks);
  const scored = scoreAll(allStocks);
  const metricStocks = scored.filter((stock) => stock.hasMetrics !== false);
  const visible = applyFilters(scored, filters).sort(byFinal);
  const needsDataCount = visible.filter((stock) => stock.hasMetrics === false).length;
  const sectors = ["All", ...Array.from(new Set(scored.map((stock) => stock.sector))).sort()];

  app.innerHTML = `
    <header class="app-shell">
      <nav class="topbar" aria-label="Primary navigation">
        <a class="brand" href="#top" aria-label="Gensky Value Picker home">
          <span class="brand-mark">GV</span>
          <span><strong>Gensky Value Picker</strong><small>Research and paper tracking only</small></span>
        </a>
        <div class="top-actions">
          <a href="#best-ideas">Best Ideas</a>
          <a href="#tracker">Tracker</a>
          <a href="#csv-import">CSV Import</a>
        </div>
      </nav>
      <section class="hero" id="top">
        <div>
          <p class="eyebrow">Stock universe</p>
          <h1>Rank value ideas across Nasdaq-100, S&P 500, custom watchlists, and the combined market list.</h1>
          <p class="warning">Sample data only. Replace with fresh market data before making real decisions.</p>
        </div>
        <div class="universe-panel">
          <label for="universe-select">Universe</label>
          <select id="universe-select">
            ${option("NASDAQ_100", "Nasdaq-100", filters.universe)}
            ${option("SP500", "S&P 500", filters.universe)}
            ${option("CUSTOM", "Custom Watchlist", filters.universe)}
            ${option("ALL", "All Stocks Combined", filters.universe)}
          </select>
          <div class="universe-stats">
            <span>${filterByUniverse(scored, "NASDAQ_100").length}<small>Nasdaq-100</small></span>
            <span>${filterByUniverse(scored, "SP500").length}<small>S&P 500</small></span>
            <span>${filterByUniverse(scored, "CUSTOM").length}<small>Custom</small></span>
            <span>${scored.length}<small>Combined</small></span>
          </div>
        </div>
      </section>
    </header>

    <main>
      <section class="section filters" aria-label="Filters">
        <label>Sector<select id="sector-filter">${sectors.map((sector) => option(sector, sector, filters.sector)).join("")}</select></label>
        <label>Minimum value score<input id="min-value-score" type="number" min="0" max="100" value="${filters.minValueScore}"></label>
        <label>Maximum debt risk<input id="max-debt-risk" type="number" min="0" max="100" value="${filters.maxDebtRisk}"></label>
        <label>Analyst upside greater than<input id="min-upside" type="number" min="0" max="100" value="${filters.minAnalystUpside}"></label>
        <label>Drawdown greater than<input id="min-drawdown" type="number" min="0" max="100" value="${filters.minDrawdown}"></label>
        <label class="checkbox"><input id="positive-fcf" type="checkbox" ${filters.positiveFcfOnly ? "checked" : ""}> Positive FCF only</label>
        <label class="checkbox"><input id="avoid-traps" type="checkbox" ${filters.avoidValueTraps ? "checked" : ""}> Avoid value traps</label>
      </section>

      <section class="section score-summary" aria-label="Score outputs">
        ${summaryCard("Visible rows", visible.length.toString(), "Includes scored ideas and needs-data constituents")}
        ${summaryCard("Scored ideas", visible.filter((stock) => stock.hasMetrics !== false).length.toString(), "Rows with valuation and quality metrics")}
        ${summaryCard("Needs data", needsDataCount.toString(), "Constituents waiting for CSV/API metrics")}
        ${summaryCard("Top final score", formatScore(visible.find((stock) => stock.hasMetrics !== false)?.finalRiskAdjustedValueScore), "Ranked by risk-adjusted value")}
        ${summaryCard("Tracked trades", trackedTrades.length.toString(), "Stored in localStorage with universe")}
      </section>

      <section class="section" id="rankings">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Rankings</p>
            <h2>${rankingTitle(filters.universe)}</h2>
          </div>
          <p>Default sort: Final Risk-Adjusted Value Score.</p>
        </div>
        <div class="score-key">
          <span>Value Score</span>
          <span>Quality Score</span>
          <span>Balance Sheet Score</span>
          <span>Growth Score</span>
          <span>Momentum Setup Score</span>
          <span>Value Trap Risk Score</span>
          <span>Final Risk-Adjusted Value Score</span>
        </div>
        ${renderTable(visible)}
      </section>

      <section class="section best-ideas" id="best-ideas">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Best Ideas</p>
            <h2>Shortlists by universe, safety, upside, and trap risk.</h2>
          </div>
        </div>
        <div class="idea-grid">
          ${ideaList("Best Nasdaq-100 ideas", topIdeas(metricStocks, "NASDAQ_100"))}
          ${ideaList("Best S&P 500 ideas", topIdeas(metricStocks, "SP500"))}
          ${ideaList("Best overall ideas", metricStocks.slice().sort(byFinal).slice(0, 5))}
          ${ideaList("Safest value ideas", metricStocks.filter((stock) => stock.valueScore >= 60 && stock.valueTrapRiskScore < 35).sort(byFinal).slice(0, 5))}
          ${ideaList("Highest upside risky ideas", metricStocks.filter((stock) => stock.analystUpsidePercent >= 15).sort((a, b) => b.analystUpsidePercent - a.analystUpsidePercent).slice(0, 5))}
          ${ideaList("Avoid list / value traps", metricStocks.filter((stock) => stock.valueTrapRiskScore >= 65).sort((a, b) => b.valueTrapRiskScore - a.valueTrapRiskScore).slice(0, 5))}
        </div>
      </section>

      <section class="section sector-rankings">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">By sector</p>
            <h2>Top undervalued stocks by sector.</h2>
          </div>
        </div>
        <div class="sector-grid">${renderSectorLeaders(metricStocks)}</div>
      </section>

      <section class="section" id="tracker">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Paper tracker</p>
            <h2>Tracked trades store their source universe.</h2>
          </div>
        </div>
        ${renderTracker()}
      </section>

      <section class="section csv-section" id="csv-import">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">CSV import</p>
            <h2>Paste a custom watchlist.</h2>
          </div>
          <p>Accepted headers include ticker, company, sector, price, forwardPE, freeCashFlowYield, revenueGrowth, epsGrowth, debtToEquity, analystUpside, drawdown, notes.</p>
        </div>
        <textarea id="csv-text" rows="8" spellcheck="false" placeholder="ticker,company,sector,price,forwardPE,freeCashFlowYield,revenueGrowth,epsGrowth,debtToEquity,analystUpside,drawdown,notes"></textarea>
        <div class="csv-actions">
          <button id="import-csv" type="button">Import to Custom Watchlist</button>
          <button id="clear-custom" type="button">Clear Custom Watchlist</button>
          <span id="csv-status">${customStocks.length} custom stocks saved</span>
        </div>
      </section>
    </main>
  `;

  bindEvents(scored);
}

function scoreAll(stocks: StockMetric[]): ScoredStock[] {
  return stocks.map((stock) => {
    if (stock.hasMetrics === false) {
      return {
        ...stock,
        valueScore: 0,
        qualityScore: 0,
        balanceSheetScore: 0,
        growthScore: 0,
        momentumSetupScore: 0,
        valueTrapRiskScore: 0,
        finalRiskAdjustedValueScore: 0,
        debtRisk: 0,
        category: "Needs data",
        penalties: {
          highDebtPenalty: 0,
          negativeFreeCashFlowPenalty: 0,
          decliningRevenuePenalty: 0,
          weakEarningsGrowthPenalty: 0,
          valueTrapPenalty: 0,
          cyclicalBusinessPenalty: 0
        },
        tradeIdea: {
          action: "Needs data",
          why: "This ticker is in the selected index universe, but it does not have valuation, growth, balance sheet, free cash flow, momentum, or analyst metrics yet. Import fresh data before ranking or tracking it."
        }
      };
    }

    const scores = scoreStock(stock);
    const scored: ScoredStock = { ...stock, hasMetrics: true, ...scores, tradeIdea: { action: "Watchlist only", why: "" } };
    return { ...scored, tradeIdea: pickTrade(scored) };
  });
}

function applyFilters(stocks: ScoredStock[], filterState: FilterState): ScoredStock[] {
  const metricFiltersActive =
    filterState.minValueScore > 0 ||
    filterState.maxDebtRisk < 100 ||
    filterState.positiveFcfOnly ||
    filterState.minAnalystUpside > 0 ||
    filterState.minDrawdown > 0;

  return filterByUniverse(stocks, filterState.universe)
    .filter((stock) => filterState.sector === "All" || stock.sector === filterState.sector)
    .filter((stock) => {
      if (stock.hasMetrics === false) {
        return !metricFiltersActive;
      }
      return stock.valueScore >= filterState.minValueScore;
    })
    .filter((stock) => stock.hasMetrics === false || stock.debtRisk <= filterState.maxDebtRisk)
    .filter((stock) => stock.hasMetrics === false || !filterState.positiveFcfOnly || stock.freeCashFlowYield > 0)
    .filter((stock) => stock.hasMetrics === false || stock.analystUpsidePercent >= filterState.minAnalystUpside)
    .filter((stock) => stock.hasMetrics === false || stock.oneYearDrawdownPercent >= filterState.minDrawdown)
    .filter((stock) => stock.hasMetrics === false || !filterState.avoidValueTraps || stock.valueTrapRiskScore < 70);
}

function bindEvents(scored: ScoredStock[]): void {
  bindSelect("universe-select", (value) => { filters = { ...filters, universe: value as StockUniverse }; render(); });
  bindSelect("sector-filter", (value) => { filters = { ...filters, sector: value }; render(); });
  bindNumber("min-value-score", (value) => { filters = { ...filters, minValueScore: value }; render(); });
  bindNumber("max-debt-risk", (value) => { filters = { ...filters, maxDebtRisk: value }; render(); });
  bindNumber("min-upside", (value) => { filters = { ...filters, minAnalystUpside: value }; render(); });
  bindNumber("min-drawdown", (value) => { filters = { ...filters, minDrawdown: value }; render(); });
  bindCheckbox("positive-fcf", (value) => { filters = { ...filters, positiveFcfOnly: value }; render(); });
  bindCheckbox("avoid-traps", (value) => { filters = { ...filters, avoidValueTraps: value }; render(); });

  document.querySelectorAll<HTMLButtonElement>("[data-track]").forEach((button) => {
    button.addEventListener("click", () => {
      const stock = scored.find((item) => item.ticker === button.dataset.track);
      if (!stock) return;
      const universe = trackerUniverse(stock, filters.universe);
      trackedTrades = [
        {
          id: `${stock.ticker}-${Date.now()}`,
          ticker: stock.ticker,
          companyName: stock.companyName,
          universe,
          action: stock.tradeIdea.action,
          openedAt: new Date().toISOString(),
          finalRiskAdjustedValueScore: stock.finalRiskAdjustedValueScore,
          valueTrapRiskScore: stock.valueTrapRiskScore,
          notes: stock.tradeIdea.why,
          status: "Watching"
        },
        ...trackedTrades
      ];
      saveTrackedTrades(trackedTrades);
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-remove-trade]").forEach((button) => {
    button.addEventListener("click", () => {
      trackedTrades = trackedTrades.filter((entry) => entry.id !== button.dataset.removeTrade);
      saveTrackedTrades(trackedTrades);
      render();
    });
  });

  document.querySelector<HTMLButtonElement>("#import-csv")?.addEventListener("click", () => {
    const textarea = document.querySelector<HTMLTextAreaElement>("#csv-text");
    const status = document.querySelector<HTMLSpanElement>("#csv-status");
    const result = parseCsvWatchlist(textarea?.value ?? "");
    if (result.stocks.length > 0) {
      customStocks = mergeCustomStocks(customStocks, result.stocks);
      saveCustomStocks(customStocks);
      filters = { ...filters, universe: "CUSTOM" };
      render();
    } else if (status) {
      status.textContent = result.errors.join(" ");
    }
  });

  document.querySelector<HTMLButtonElement>("#clear-custom")?.addEventListener("click", () => {
    customStocks = [];
    saveCustomStocks(customStocks);
    render();
  });
}

function renderTable(stocks: ScoredStock[]): string {
  if (stocks.length === 0) {
    return `<div class="empty-state">No stocks match the current filters.</div>`;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ticker</th><th>Universe</th><th>Sector</th><th>Price</th><th>Final Risk-Adjusted Value Score</th><th>Value Score</th><th>Quality Score</th><th>Balance Sheet Score</th><th>Growth Score</th><th>Momentum Setup Score</th><th>Value Trap Risk Score</th><th>Category</th><th>AI Trade Picker</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${stocks.map(renderStockRow).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderStockRow(stock: ScoredStock): string {
  if (stock.hasMetrics === false) {
    return `
      <tr class="needs-data-row">
        <td><strong>${stock.ticker}</strong><small>${stock.companyName}</small></td>
        <td>${displayUniverse(stock)}</td>
        <td>${stock.sector}<small>${stock.industry}</small></td>
        <td>--</td>
        <td><span class="status-pill muted">Needs data</span></td>
        <td>--</td>
        <td>--</td>
        <td>--</td>
        <td>--</td>
        <td>--</td>
        <td>--</td>
        <td>Needs data</td>
        <td><strong>Import metrics</strong><details><summary>Why no trade?</summary><p>${stock.tradeIdea.why}</p></details></td>
        <td><button type="button" disabled>Needs data</button></td>
      </tr>
    `;
  }

  return `
    <tr>
      <td><strong>${stock.ticker}</strong><small>${stock.companyName}</small></td>
      <td>${displayUniverse(stock)}</td>
      <td>${stock.sector}<small>${stock.industry}</small></td>
      <td>${currency(stock.price)}</td>
      <td><span class="score-pill ${scoreTone(stock.finalRiskAdjustedValueScore)}">${formatScore(stock.finalRiskAdjustedValueScore)}</span></td>
      <td>${formatScore(stock.valueScore)}</td>
      <td>${formatScore(stock.qualityScore)}</td>
      <td>${formatScore(stock.balanceSheetScore)}</td>
      <td>${formatScore(stock.growthScore)}</td>
      <td>${formatScore(stock.momentumSetupScore)}</td>
      <td><span class="risk ${riskTone(stock.valueTrapRiskScore)}">${formatScore(stock.valueTrapRiskScore)}</span></td>
      <td>${stock.category}</td>
      <td><strong>${stock.tradeIdea.action}</strong><details><summary>Why this trade?</summary><p>${stock.tradeIdea.why}</p></details></td>
      <td><button type="button" data-track="${stock.ticker}">Track</button></td>
    </tr>
  `;
}

function renderTracker(): string {
  if (trackedTrades.length === 0) {
    return `<div class="empty-state">No paper trades tracked yet.</div>`;
  }

  return `<div class="tracker-list">
    ${trackedTrades.map((entry) => `
      <article class="tracker-card">
        <div><strong>${entry.ticker}</strong><span>${entry.companyName}</span></div>
        <div><small>Universe</small><span>${entry.universe}</span></div>
        <div><small>Idea</small><span>${entry.action}</span></div>
        <div><small>Final / Trap</small><span>${formatScore(entry.finalRiskAdjustedValueScore)} / ${formatScore(entry.valueTrapRiskScore)}</span></div>
        <button type="button" data-remove-trade="${entry.id}">Remove</button>
      </article>
    `).join("")}
  </div>`;
}

function renderSectorLeaders(stocks: ScoredStock[]): string {
  const bySector = new Map<string, ScoredStock[]>();
  stocks.forEach((stock) => {
    const list = bySector.get(stock.sector) ?? [];
    list.push(stock);
    bySector.set(stock.sector, list);
  });
  return Array.from(bySector.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([sector, items]) => {
    const leader = items.sort(byFinal)[0];
    return `<article><small>${sector}</small><strong>${leader.ticker}</strong><span>${leader.companyName}</span><b>${formatScore(leader.finalRiskAdjustedValueScore)}</b></article>`;
  }).join("");
}

function ideaList(title: string, stocks: ScoredStock[]): string {
  return `<article class="idea-card"><h3>${title}</h3>${stocks.length ? `<ol>${stocks.map((stock) => `<li><span>${stock.ticker}</span><strong>${formatScore(stock.finalRiskAdjustedValueScore)}</strong><small>${stock.category}</small></li>`).join("")}</ol>` : `<p>No ideas match.</p>`}</article>`;
}

function topIdeas(stocks: ScoredStock[], universe: StockUniverse): ScoredStock[] {
  return filterByUniverse(stocks, universe).sort(byFinal).slice(0, 5);
}

function byFinal(a: ScoredStock, b: ScoredStock): number {
  if (a.hasMetrics === false && b.hasMetrics !== false) return 1;
  if (a.hasMetrics !== false && b.hasMetrics === false) return -1;
  return b.finalRiskAdjustedValueScore - a.finalRiskAdjustedValueScore || a.ticker.localeCompare(b.ticker);
}

function trackerUniverse(stock: ScoredStock, currentUniverse: StockUniverse): TradeUniverse {
  if (currentUniverse === "CUSTOM") return "CUSTOM";
  if (currentUniverse === "SP500" && stock.indexMembership.includes("SP500")) return "SP500";
  if (currentUniverse === "NASDAQ_100" && stock.indexMembership.includes("NASDAQ_100")) return "NASDAQ_100";
  if (stock.indexMembership.includes("NASDAQ_100")) return "NASDAQ_100";
  if (stock.indexMembership.includes("SP500")) return "SP500";
  return "CUSTOM";
}

function mergeCustomStocks(existing: StockMetric[], incoming: StockMetric[]): StockMetric[] {
  const byTicker = new Map(existing.map((stock) => [stock.ticker, stock]));
  incoming.forEach((stock) => byTicker.set(stock.ticker, stock));
  return Array.from(byTicker.values());
}

function bindSelect(id: string, handler: (value: string) => void): void {
  document.querySelector<HTMLSelectElement>(`#${id}`)?.addEventListener("change", (event) => handler((event.target as HTMLSelectElement).value));
}

function bindNumber(id: string, handler: (value: number) => void): void {
  document.querySelector<HTMLInputElement>(`#${id}`)?.addEventListener("change", (event) => handler(Number((event.target as HTMLInputElement).value) || 0));
}

function bindCheckbox(id: string, handler: (value: boolean) => void): void {
  document.querySelector<HTMLInputElement>(`#${id}`)?.addEventListener("change", (event) => handler((event.target as HTMLInputElement).checked));
}

function rankingTitle(universe: StockUniverse): string {
  const titles: Record<StockUniverse, string> = {
    NASDAQ_100: "Top undervalued Nasdaq-100 stocks.",
    SP500: "Top undervalued S&P 500 stocks.",
    CUSTOM: "Top undervalued custom watchlist stocks.",
    ALL: "Top undervalued stocks overall."
  };
  return titles[universe];
}

function option(value: string, label: string, selected: string): string {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
}

function summaryCard(label: string, value: string, note: string): string {
  return `<article><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function scoreTone(value: number): string {
  if (value >= 72) return "good";
  if (value >= 52) return "ok";
  return "bad";
}

function riskTone(value: number): string {
  if (value >= 70) return "bad";
  if (value >= 45) return "ok";
  return "good";
}

function formatScore(value: number | undefined): string {
  return Number.isFinite(value) ? String(Math.round(Number(value))) : "--";
}

function currency(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}
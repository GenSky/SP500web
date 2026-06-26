import "./styles.css";
import type { ChartPoint } from "./data/freeChartData";
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

type ViewMode = "cards" | "table";
type SortKey = "final" | "value" | "quality" | "trapRisk" | "upside" | "ticker";

let viewMode: ViewMode = "cards";
let sortKey: SortKey = "final";
let trackMessage = "";
let tickerSearchMessage = "";
let pendingTickerFocus = "";
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
  const visible = applyFilters(scored, filters).sort(bySelectedSort);
  const sectors = ["All", ...Array.from(new Set(scored.map((stock) => stock.sector))).sort()];

  app.innerHTML = `
    <header class="app-shell">
      <nav class="topbar" aria-label="Primary navigation">
        <a class="brand" href="#top" aria-label="Gensky Value Picker home">
          <span class="brand-mark">GV</span>
          <span><strong>Gensky Value Picker</strong><small>Research only</small></span>
        </a>
        <div class="top-actions">
          <a href="#best-ideas">Best Ideas</a>
          <a href="#filters">Filters</a>
          <a href="#tracker">Tracker</a>
          <a href="#csv-import">CSV Import</a>
        </div>
      </nav>
      <section class="hero scanner-controls" id="top" aria-label="Stock scanner controls">
        <p class="warning">Research only. Verify data before decisions.</p>
        <div class="universe-panel">
          <label for="universe-select">Stock list</label>
          <select id="universe-select">
            ${option("NASDAQ_100", "Nasdaq-100", filters.universe)}
            ${option("SP500", "S&P 500", filters.universe)}
            ${option("CUSTOM", "Custom Watchlist", filters.universe)}
            ${option("ALL", "All Stocks Combined", filters.universe)}
          </select>
          <div class="ticker-search" role="search" aria-label="Ticker search">
            <label for="ticker-search">Find ticker</label>
            <div class="ticker-search-row">
              <input id="ticker-search" type="search" autocomplete="off" placeholder="CMG, AAPL, MSFT">
              <button id="ticker-search-button" type="button">Find</button>
            </div>
            <p class="search-status">${tickerSearchMessage ? escapeHtml(tickerSearchMessage) : "Type a ticker and jump to it."}</p>
          </div>
        </div>
      </section>
    </header>

    <main>
      ${renderTrackMessage()}

      <section class="section rankings-section" id="rankings">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Rankings</p>
            <h2>${rankingTitle(filters.universe)}</h2>
          </div>
          <p>Sorted by final risk-adjusted value.</p>
        </div>
        <div class="results-toolbar" aria-label="Results controls">
          <div class="view-switch" aria-label="Choose results view">
            <button type="button" data-view-mode="cards" class="${viewMode === "cards" ? "active" : ""}">Cards</button>
            <button type="button" data-view-mode="table" class="${viewMode === "table" ? "active" : ""}">Table</button>
          </div>
          <label>Sort
            <select id="sort-select">
              ${option("final", "Best overall score", sortKey)}
              ${option("value", "Cheapest valuation", sortKey)}
              ${option("quality", "Highest quality", sortKey)}
              ${option("trapRisk", "Lowest trap risk", sortKey)}
              ${option("upside", "Highest analyst upside", sortKey)}
              ${option("ticker", "Ticker A to Z", sortKey)}
            </select>
          </label>
        </div>
        ${renderResults(visible)}
      </section>

      <section class="section filter-panel" id="filters" aria-label="Filters">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Filters</p>
            <h2>Narrow the list after you understand the scores.</h2>
          </div>
          <p>Leave these alone at first. Use them when you want a cleaner list, less debt risk, or more analyst upside.</p>
        </div>
        <div class="filters">${renderFilters(sectors)}</div>
      </section>

      <section class="section best-ideas" id="best-ideas">
        <div class="section-heading compact">
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
  focusPendingTicker();
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
    .filter((stock) => stock.hasMetrics === false || filterState.minAnalystUpside <= 0 || stock.analystUpsidePercent >= filterState.minAnalystUpside)
    .filter((stock) => stock.hasMetrics === false || filterState.minDrawdown <= 0 || stock.oneYearDrawdownPercent >= filterState.minDrawdown)
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
  bindSelect("sort-select", (value) => { sortKey = value as SortKey; render(); });

  const runTickerSearch = () => searchTicker(scored);
  document.querySelector<HTMLButtonElement>("#ticker-search-button")?.addEventListener("click", runTickerSearch);
  document.querySelector<HTMLInputElement>("#ticker-search")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runTickerSearch();
    }
  });

  document.querySelectorAll<HTMLButtonElement>("[data-view-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      viewMode = button.dataset.viewMode as ViewMode;
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-symbol]").forEach((button) => {
    button.addEventListener("click", () => {
      const stock = scored.find((item) => item.ticker === button.dataset.symbol);
      if (stock) void openStockPanel(stock);
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-track]").forEach((button) => {
    button.addEventListener("click", () => {
      const stock = scored.find((item) => item.ticker === button.dataset.track);
      if (!stock) return;
      if (isTracked(stock.ticker)) {
        trackMessage = `${stock.ticker} is already in your paper tracker.`;
        render();
        return;
      }
      const universe = trackerUniverse(stock, filters.universe);
      const nextTrades: TrackerEntry[] = [
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
      try {
        saveTrackedTrades(nextTrades);
        trackedTrades = nextTrades;
        trackMessage = `Added ${stock.ticker} to your paper tracker.`;
      } catch {
        trackMessage = `Could not save ${stock.ticker}. Browser storage may be blocked.`;
      }
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-jump-tracker]").forEach((button) => {
    button.addEventListener("click", () => document.querySelector("#tracker")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  });

  document.querySelectorAll<HTMLButtonElement>("[data-remove-trade]").forEach((button) => {
    button.addEventListener("click", () => {
      trackedTrades = trackedTrades.filter((entry) => entry.id !== button.dataset.removeTrade);
      saveTrackedTrades(trackedTrades);
      trackMessage = "";
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

function searchTicker(scored: ScoredStock[]): void {
  const input = document.querySelector<HTMLInputElement>("#ticker-search");
  const ticker = input?.value.trim().toUpperCase() ?? "";
  if (!ticker) {
    tickerSearchMessage = "Type a ticker first.";
    render();
    return;
  }

  const stock = scored.find((item) => item.ticker.toUpperCase() === ticker);
  if (!stock) {
    tickerSearchMessage = `${ticker} is not in the loaded lists yet. Add it with CSV import if you want it here.`;
    render();
    return;
  }

  const isVisibleNow = applyFilters(scored, filters).some((item) => item.ticker === stock.ticker);
  if (!isVisibleNow) {
    filters = {
      universe: defaultUniverseForStock(stock),
      sector: "All",
      minValueScore: 0,
      maxDebtRisk: 100,
      positiveFcfOnly: false,
      minAnalystUpside: 0,
      minDrawdown: 0,
      avoidValueTraps: false
    };
  }
  viewMode = "cards";
  tickerSearchMessage = `Found ${stock.ticker}: ${stock.companyName}`;
  pendingTickerFocus = stock.ticker;
  render();
}

function focusPendingTicker(): void {
  if (!pendingTickerFocus) return;
  const ticker = pendingTickerFocus;
  pendingTickerFocus = "";
  window.setTimeout(() => {
    const target = document.querySelector<HTMLElement>(`[data-stock-ticker="${cssEscape(ticker)}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("stock-focus");
    window.setTimeout(() => target.classList.remove("stock-focus"), 2600);
  }, 0);
}

function defaultUniverseForStock(stock: ScoredStock): StockUniverse {
  if (filters.universe !== "ALL" && filterByUniverse([stock], filters.universe).length > 0) return filters.universe;
  if (stock.indexMembership.includes("SP500")) return "SP500";
  if (stock.indexMembership.includes("NASDAQ_100")) return "NASDAQ_100";
  if (filterByUniverse([stock], "CUSTOM").length > 0) return "CUSTOM";
  return "ALL";
}

function cssEscape(value: string): string {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/"/g, "\\\"");
}

function renderFilters(sectors: string[]): string {
  return `
    <label>Sector<select id="sector-filter">${sectors.map((sector) => option(sector, sector, filters.sector)).join("")}</select></label>
    <label>Minimum value score<input id="min-value-score" type="number" min="0" max="100" value="${filters.minValueScore}"></label>
    <label>Maximum debt risk<input id="max-debt-risk" type="number" min="0" max="100" value="${filters.maxDebtRisk}"></label>
    <label>Analyst upside greater than<input id="min-upside" type="number" min="0" max="100" value="${filters.minAnalystUpside}"></label>
    <label>Drawdown greater than<input id="min-drawdown" type="number" min="0" max="100" value="${filters.minDrawdown}"></label>
    <label class="checkbox"><input id="positive-fcf" type="checkbox" ${filters.positiveFcfOnly ? "checked" : ""}> Positive FCF only</label>
    <label class="checkbox"><input id="avoid-traps" type="checkbox" ${filters.avoidValueTraps ? "checked" : ""}> Avoid value traps</label>
  `;
}

function renderResults(stocks: ScoredStock[]): string {
  return viewMode === "table" ? renderTable(stocks) : renderCards(stocks);
}

function renderCards(stocks: ScoredStock[]): string {
  if (stocks.length === 0) {
    return `<div class="empty-state">No stocks match the current filters.</div>`;
  }

  return `<div class="stock-cards">${stocks.map(renderStockCard).join("")}</div>`;
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
            <th>Ticker</th><th>Sector</th><th>Price</th><th>Final Risk-Adjusted Value Score</th><th>Value Score</th><th>Quality Score</th><th>Balance Sheet Score</th><th>Growth Score</th><th>Momentum Setup Score</th><th>Value Trap Risk Score</th><th>What it does</th><th>AI Trade Picker</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${stocks.map(renderStockRow).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderStockCard(stock: ScoredStock): string {
  if (stock.hasMetrics === false) {
    return `
      <article class="stock-card needs-data-row" data-stock-ticker="${escapeHtml(stock.ticker)}">
        <div class="stock-card-main">
          <button class="ticker-link" type="button" data-symbol="${stock.ticker}"><strong>${stock.ticker}</strong><small>${stock.companyName}</small></button>
          <span class="status-pill muted">Needs data</span>
        </div>
        <div class="stock-card-grid">
          ${metricTile("Sector", stock.sector)}
          ${metricTile("Industry", stock.industry)}
        </div>
        <div class="stock-card-trade"><strong>Import metrics</strong><details><summary>Why no trade?</summary>${renderTradeWhy(stock.tradeIdea.why)}</details></div>
        <button type="button" disabled>Needs data</button>
      </article>
    `;
  }

  return `
    <article class="stock-card" data-stock-ticker="${escapeHtml(stock.ticker)}">
      <div class="stock-card-main">
        <button class="ticker-link" type="button" data-symbol="${stock.ticker}"><strong>${stock.ticker}</strong><small>${stock.companyName}</small></button>
        <div class="stock-card-score">
          <small>Final</small>
          <span class="score-pill ${scoreTone(stock.finalRiskAdjustedValueScore)}">${formatScore(stock.finalRiskAdjustedValueScore)}</span>
        </div>
      </div>
      <div class="stock-card-grid">
        ${metricTile("Price", currency(stock.price))}
        ${metricTile("Sector", stock.sector)}
        ${metricTile("Value", formatScore(stock.valueScore))}
        ${metricTile("Quality", formatScore(stock.qualityScore))}
        ${metricTile("Trap risk", formatScore(stock.valueTrapRiskScore))}
      </div>
      <div class="stock-card-note">
        <strong>What it does</strong>
        <span>${escapeHtml(companySnippet(stock))}</span>
      </div>
      <div class="stock-card-trade"><strong>${stock.tradeIdea.action}</strong><details><summary>Why this idea?</summary>${renderTradeWhy(stock.tradeIdea.why)}</details></div>
      ${trackButton(stock)}
    </article>
  `;
}

function renderStockRow(stock: ScoredStock): string {
  if (stock.hasMetrics === false) {
    return `
      <tr class="needs-data-row" data-stock-ticker="${escapeHtml(stock.ticker)}">
        <td data-label="Ticker"><button class="ticker-link" type="button" data-symbol="${stock.ticker}"><strong>${stock.ticker}</strong><small>${stock.companyName}</small></button></td>
        <td data-label="Sector">${stock.sector}<small>${stock.industry}</small></td>
        <td data-label="Price">--</td>
        <td data-label="Final score"><span class="status-pill muted">Needs data</span></td>
        <td data-label="Value">--</td>
        <td data-label="Quality">--</td>
        <td data-label="Balance">--</td>
        <td data-label="Growth">--</td>
        <td data-label="Momentum">--</td>
        <td data-label="Trap risk">--</td>
        <td data-label="What it does">${escapeHtml(companySnippet(stock))}</td>
        <td data-label="Trade"><strong>Import metrics</strong><details><summary>Why no trade?</summary>${renderTradeWhy(stock.tradeIdea.why)}</details></td>
        <td data-label="Track"><button type="button" disabled>Needs data</button></td>
      </tr>
    `;
  }

  return `
    <tr data-stock-ticker="${escapeHtml(stock.ticker)}">
      <td data-label="Ticker"><button class="ticker-link" type="button" data-symbol="${stock.ticker}"><strong>${stock.ticker}</strong><small>${stock.companyName}</small></button></td>
      <td data-label="Sector">${stock.sector}<small>${stock.industry}</small></td>
      <td data-label="Price">${currency(stock.price)}</td>
      <td data-label="Final score"><span class="score-pill ${scoreTone(stock.finalRiskAdjustedValueScore)}">${formatScore(stock.finalRiskAdjustedValueScore)}</span></td>
      <td data-label="Value">${formatScore(stock.valueScore)}</td>
      <td data-label="Quality">${formatScore(stock.qualityScore)}</td>
      <td data-label="Balance">${formatScore(stock.balanceSheetScore)}</td>
      <td data-label="Growth">${formatScore(stock.growthScore)}</td>
      <td data-label="Momentum">${formatScore(stock.momentumSetupScore)}</td>
      <td data-label="Trap risk"><span class="risk ${riskTone(stock.valueTrapRiskScore)}">${formatScore(stock.valueTrapRiskScore)}</span></td>
      <td data-label="What it does">${escapeHtml(companySnippet(stock))}</td>
      <td data-label="Trade"><strong>${stock.tradeIdea.action}</strong><details><summary>Why this idea?</summary>${renderTradeWhy(stock.tradeIdea.why)}</details></td>
      <td data-label="Track">${trackButton(stock)}</td>
    </tr>
  `;
}

async function openStockPanel(stock: ScoredStock): Promise<void> {
  document.querySelector("[data-chart-modal]")?.remove();
  const { freeChartData } = await import("./data/freeChartData");
  const points = freeChartData[stock.ticker] ?? [];
  document.body.insertAdjacentHTML("beforeend", `
    <div class="chart-modal" data-chart-modal role="dialog" aria-modal="true" aria-label="${escapeHtml(stock.ticker)} chart">
      <button class="chart-backdrop" type="button" data-close-chart aria-label="Close chart"></button>
      <section class="chart-panel">
        <header class="chart-header">
          <div>
            <p class="eyebrow">Ticker chart</p>
            <h3>${escapeHtml(stock.ticker)} <span>${escapeHtml(stock.companyName)}</span></h3>
            <p>${escapeHtml(stock.sector)} / ${escapeHtml(stock.industry)} / ${escapeHtml(displayUniverse(stock))}</p>
          </div>
          <button class="chart-close" type="button" data-close-chart>Close</button>
        </header>
        ${points.length >= 2 ? renderPriceChart(points, stock) : `<div class="empty-state">Chart data is not available for ${escapeHtml(stock.ticker)} yet. Run the free chart refresh again later.</div>`}
        <div class="chart-stats">
          ${metricTile("Price", currency(stock.price))}
          ${metricTile("Final score", formatScore(stock.finalRiskAdjustedValueScore))}
          ${metricTile("Value", formatScore(stock.valueScore))}
          ${metricTile("Quality", formatScore(stock.qualityScore))}
          ${metricTile("Trap risk", formatScore(stock.valueTrapRiskScore))}
          ${metricTile("Forward P/E", formatNumber(stock.forwardPE))}
          ${metricTile("FCF yield", `${formatNumber(stock.freeCashFlowYield)}%`)}
          ${metricTile("Drawdown", `${formatNumber(stock.oneYearDrawdownPercent)}%`)}
          ${metricTile("Market cap", compactNumber(stock.marketCap))}
        </div>
        <div class="chart-thesis">
          <strong>${escapeHtml(stock.tradeIdea.action)}</strong>
          ${renderTradeWhy(stock.tradeIdea.why)}
          <small>Chart data is a generated one-year weekly view from free Yahoo Finance data. Research only; verify current quotes and filings.</small>
        </div>
      </section>
    </div>
  `);

  const modal = document.querySelector<HTMLElement>("[data-chart-modal]");
  const close = (): void => modal?.remove();
  modal?.querySelectorAll<HTMLButtonElement>("[data-close-chart]").forEach((button) => button.addEventListener("click", close));
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      close();
      document.removeEventListener("keydown", onKeyDown);
    }
  };
  document.addEventListener("keydown", onKeyDown);
}

function renderPriceChart(points: ChartPoint[], stock: ScoredStock): string {
  const width = 860;
  const height = 390;
  const left = 56;
  const right = 18;
  const top = 18;
  const priceHeight = 255;
  const volumeTop = 295;
  const volumeHeight = 58;
  const plotWidth = width - left - right;
  const highs = points.map((point) => point[2]);
  const lows = points.map((point) => point[3]);
  const closes = points.map((point) => point[4]);
  const volumes = points.map((point) => point[5]);
  const minPriceRaw = Math.min(...lows);
  const maxPriceRaw = Math.max(...highs);
  const pad = Math.max((maxPriceRaw - minPriceRaw) * 0.08, maxPriceRaw * 0.01);
  const minPrice = minPriceRaw - pad;
  const maxPrice = maxPriceRaw + pad;
  const maxVolume = Math.max(...volumes, 1);
  const xFor = (index: number): number => left + (points.length === 1 ? 0 : (index / (points.length - 1)) * plotWidth);
  const yFor = (price: number): number => top + ((maxPrice - price) / (maxPrice - minPrice || 1)) * priceHeight;
  const candleWidth = Math.max(3, Math.min(9, plotWidth / points.length * 0.58));
  const closePath = linePath(points.map((point, index) => [xFor(index), yFor(point[4])]));
  const ma20 = movingAverage(closes, 20).map((value, index) => value === null ? null : [xFor(index), yFor(value)] as [number, number]);
  const ma50 = movingAverage(closes, 50).map((value, index) => value === null ? null : [xFor(index), yFor(value)] as [number, number]);
  const first = points[0];
  const last = points[points.length - 1];
  const change = last[4] - first[4];
  const changePercent = first[4] !== 0 ? (change / first[4]) * 100 : 0;
  const changeClass = change >= 0 ? "positive" : "negative";
  const grid = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const y = top + ratio * priceHeight;
    const label = maxPrice - ratio * (maxPrice - minPrice);
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" /><text x="8" y="${y + 4}">${formatNumber(label)}</text>`;
  }).join("");
  const candles = points.map((point, index) => {
    const [date, open, high, low, close, volume] = point;
    const x = xFor(index);
    const isUp = close >= open;
    const color = isUp ? "#16a34a" : "#ef4444";
    const bodyTop = Math.min(yFor(open), yFor(close));
    const bodyHeight = Math.max(1.5, Math.abs(yFor(open) - yFor(close)));
    const volumeHeightValue = (volume / maxVolume) * volumeHeight;
    return `<g aria-label="${date}">
      <line class="wick" x1="${x}" y1="${yFor(high)}" x2="${x}" y2="${yFor(low)}" stroke="${color}" />
      <rect x="${x - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" fill="${color}" />
      <rect class="volume-bar" x="${x - candleWidth / 2}" y="${volumeTop + volumeHeight - volumeHeightValue}" width="${candleWidth}" height="${volumeHeightValue}" fill="${color}" />
    </g>`;
  }).join("");

  return `<div class="chart-wrap">
    <div class="chart-meta">
      <div><strong>${currency(last[4])}</strong><span class="${changeClass}">${change >= 0 ? "+" : ""}${formatNumber(change)} (${change >= 0 ? "+" : ""}${formatNumber(changePercent)}%)</span></div>
      <div><small>Weekly candles</small><small>MA20 / MA50 / Volume</small></div>
    </div>
    <svg class="price-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(stock.ticker)} one year weekly price chart">
      <rect width="${width}" height="${height}" rx="8" />
      <g class="grid">${grid}</g>
      <g>${candles}</g>
      <path class="close-line" d="${closePath}" />
      <path class="ma ma20" d="${segmentedLinePath(ma20)}" />
      <path class="ma ma50" d="${segmentedLinePath(ma50)}" />
      <line class="volume-rule" x1="${left}" y1="${volumeTop}" x2="${width - right}" y2="${volumeTop}" />
      <text class="date-label" x="${left}" y="${height - 14}">${first[0]}</text>
      <text class="date-label" x="${width - right}" y="${height - 14}" text-anchor="end">${last[0]}</text>
    </svg>
  </div>`;
}

function movingAverage(values: number[], windowSize: number): Array<number | null> {
  return values.map((_, index) => {
    if (index + 1 < windowSize) return null;
    const windowValues = values.slice(index + 1 - windowSize, index + 1);
    return windowValues.reduce((sum, value) => sum + value, 0) / windowSize;
  });
}

function linePath(points: Array<[number, number]>): string {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${roundCoord(x)} ${roundCoord(y)}`).join(" ");
}

function segmentedLinePath(points: Array<[number, number] | null>): string {
  let path = "";
  let drawing = false;
  points.forEach((point) => {
    if (!point) {
      drawing = false;
      return;
    }
    path += `${drawing ? " L" : " M"}${roundCoord(point[0])} ${roundCoord(point[1])}`;
    drawing = true;
  });
  return path.trim();
}

function metricTile(label: string, value: string): string {
  return `<article><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></article>`;
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

function renderTradeWhy(text: string): string {
  const [scoreLine, ...rest] = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const explanation = rest.join(" ");
  if (!scoreLine || !explanation) return `<p>${escapeHtml(text)}</p>`;
  return `<div class="trade-simple"><strong>${escapeHtml(scoreLine)}</strong><span>${escapeHtml(explanation)}</span></div>`;
}

function renderTrackMessage(): string {
  if (!trackMessage) return "";
  return `<section class="section track-message" role="status"><span>${escapeHtml(trackMessage)}</span><a href="#tracker">View tracker</a></section>`;
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
  return `<article class="idea-card"><h3>${title}</h3>${stocks.length ? `<ol>${stocks.map((stock) => `<li><button class="idea-ticker" type="button" data-symbol="${stock.ticker}"><span>${stock.ticker}</span><small>${escapeHtml(stock.companyName)}</small></button><strong>${formatScore(stock.finalRiskAdjustedValueScore)}</strong><small>${escapeHtml(companySnippet(stock))}</small></li>`).join("")}</ol>` : `<p>No ideas match.</p>`}</article>`;
}

function topIdeas(stocks: ScoredStock[], universe: StockUniverse): ScoredStock[] {
  return filterByUniverse(stocks, universe).sort(byFinal).slice(0, 5);
}

function bySelectedSort(a: ScoredStock, b: ScoredStock): number {
  if (a.hasMetrics === false && b.hasMetrics !== false) return 1;
  if (a.hasMetrics !== false && b.hasMetrics === false) return -1;
  if (sortKey === "ticker") return a.ticker.localeCompare(b.ticker);
  if (sortKey === "trapRisk") return a.valueTrapRiskScore - b.valueTrapRiskScore || byFinal(a, b);
  const fields: Record<Exclude<SortKey, "ticker" | "trapRisk">, keyof ScoredStock> = {
    final: "finalRiskAdjustedValueScore",
    value: "valueScore",
    quality: "qualityScore",
    upside: "analystUpsidePercent"
  };
  const field = fields[sortKey];
  return Number(b[field]) - Number(a[field]) || byFinal(a, b);
}

function byFinal(a: ScoredStock, b: ScoredStock): number {
  if (a.hasMetrics === false && b.hasMetrics !== false) return 1;
  if (a.hasMetrics !== false && b.hasMetrics === false) return -1;
  return b.finalRiskAdjustedValueScore - a.finalRiskAdjustedValueScore || a.ticker.localeCompare(b.ticker);
}

function isTracked(ticker: string): boolean {
  return trackedTrades.some((entry) => entry.ticker === ticker);
}

function trackButton(stock: ScoredStock): string {
  if (isTracked(stock.ticker)) {
    return `<button class="tracked-action" type="button" data-jump-tracker>Tracked</button>`;
  }
  return `<button type="button" data-track="${stock.ticker}">Track</button>`;
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
    NASDAQ_100: "Nasdaq-100 value list",
    SP500: "S&P 500 value list",
    CUSTOM: "Custom watchlist value list",
    ALL: "Combined value list"
  };
  return titles[universe];
}

function option(value: string, label: string, selected: string): string {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
}

function summaryCard(label: string, value: string, note: string): string {
  return `<article><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
}

function legendItem(label: string, text: string): string {
  return `<article><strong>${label}</strong><span>${text}</span></article>`;
}

function companySnippet(stock: StockMetric): string {
  const sector = stock.sector.toLowerCase();
  const industry = stock.industry.toLowerCase();
  const text = `${sector} ${industry}`;

  const rules: Array<[RegExp, string]> = [
    [/semiconductor|chip/, "Makes chips or chip technology used in electronics, data centers, cars, and devices."],
    [/software|application|infrastructure|information technology services/, "Sells software or tech services businesses use to run their work, data, customers, or operations."],
    [/communication|internet|interactive media|social media|entertainment|streaming/, "Runs media, internet, telecom, or entertainment platforms that make money from ads, subscriptions, or services."],
    [/bank|capital markets|credit|financial data|asset management|mortgage/, "Provides money services like banking, lending, investing, payments, or financial market tools."],
    [/insurance/, "Sells insurance products that help people or businesses manage financial risk."],
    [/payment|transaction/, "Processes payments and money movement for consumers, merchants, or businesses."],
    [/healthcare|drug|pharma|biotech|medical|diagnostic|life science|managed care/, "Makes healthcare products or services, such as medicines, devices, testing, insurance, or care support."],
    [/aerospace|defense|industrial|machinery|electrical equipment|engineering|construction|building/, "Makes or supports physical products, equipment, buildings, infrastructure, or industrial services."],
    [/oil|gas|energy|e&p|midstream|refining|pipeline/, "Produces, transports, or sells energy like oil, natural gas, fuel, or related services."],
    [/utility|utilities|electric|water|renewable/, "Provides essential services like electricity, gas, water, or power infrastructure."],
    [/reit|real estate|property/, "Owns, rents, or operates real estate such as buildings, data centers, homes, stores, or offices."],
    [/materials|chemical|mining|gold|steel|packaging|paper|metals/, "Produces raw materials or supplies like metals, chemicals, packaging, paper, or construction inputs."],
    [/retail|apparel|restaurant|travel|hotel|leisure|auto|home improvement|consumer discretionary/, "Sells consumer products or experiences like shopping, restaurants, travel, cars, or home goods."],
    [/food|beverage|household|personal products|tobacco|staples|grocery/, "Sells everyday consumer staples like food, drinks, household products, or personal care items."],
    [/transport|rail|air freight|logistics|trucking|airline/, "Moves people, packages, freight, or supplies through transportation and logistics networks."]
  ];

  const match = rules.find(([pattern]) => pattern.test(text));
  if (match) return match[1];

  const cleanIndustry = stock.industry.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  return `${stock.companyName} is a ${cleanIndustry || stock.sector} business in the ${stock.sector} sector.`;
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

function formatNumber(value: number): string {
  return Number.isFinite(value) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value) : "--";
}

function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

function roundCoord(value: number): number {
  return Math.round(value * 10) / 10;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char] ?? char));
}
function currency(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

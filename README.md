# Gensky Value Picker

A research-only stock value dashboard for ranking ideas across multiple universes:

- Nasdaq-100
- S&P 500
- Custom Watchlist
- All Stocks Combined

The app includes full Nasdaq-100 and S&P 500 constituent coverage, confidence-adjusted scoring, dated signal research, IV-aware paper structures, and a local paper tracker.

> Sample data only. Replace with fresh market data before making real decisions.

## What It Does

- Filters by universe, sector, minimum value score, maximum debt risk, positive free cash flow, analyst upside, drawdown, and value trap avoidance.
- Scores every stock across value, quality, balance sheet, growth, momentum setup, value trap risk, and final risk-adjusted value.
- Measures core-input confidence, penalizes default-filled rows, and prevents incomplete records from presenting as high-conviction signals.
- Appends dated score snapshots and evaluates first-crossing events at 5/10/20/60 forward market snapshots, including same-sector excess return and a chronological holdout.
- Shows a cross-sectional regime proxy, sector percentile, saved score history, and risk-size guardrails.
- Opens a ticker chart panel with weekly candles, 20/50-week moving averages, volume, score tiles, and trade rationale.
- Ranks top undervalued Nasdaq-100 stocks, S&P 500 stocks, overall ideas, and sector leaders.
- Labels ideas as cheap but risky, quality value, deep value, turnaround, or avoid / possible trap.
- Suggests research-only trade ideas and conditions option structures on manually entered IV rank/percentile, expected move, skew, term structure, and days to earnings.
- Tracks paper ideas with entry price, latest saved return, position quantity, thesis, invalidation, status, and source universe.
- Imports custom watchlists from pasted CSV-style data.

## Local Development

The local folder name contains an ampersand, so this repo uses a local `.npmrc` on this machine to make npm scripts run through PowerShell. The file is intentionally ignored and not required on CI.

```bash
npm install
npm run dev
npm run build
npm test
npm run refresh:free-data
npm run refresh:free-charts
npm run refresh:strategy-history
npm run backfill:strategy-history
npm run refresh:free-all
```

## Data

Current app data combines full public index constituent lists, a generated free market data refresh, and sample fallback metric data:

- `src/data/indexConstituents.ts`
- `src/data/freeMarketData.ts`
- `src/data/sampleNasdaqStocks.ts`
- `src/data/sampleSp500Stocks.ts`
- `scripts/fetch-free-market-data.mjs`
- `scripts/fetch-free-chart-data.mjs`

Run `npm run refresh:free-data` to regenerate `src/data/freeMarketData.ts` from free Yahoo Finance data. Run `npm run refresh:free-charts` to regenerate `src/data/freeChartData.ts` with one-year weekly OHLCV chart history. `npm run refresh:strategy-history` preserves prior snapshots and appends the current score state. `npm run backfill:strategy-history` rebuilds the research history from the repository's saved market-data commits. `npm run refresh:free-all` runs the normal refresh pipeline. This is no-key and no-paid-API, but it is unofficial, can be delayed, incomplete, rate-limited, or unavailable.

The Strategy Lab is deliberately labeled as observed research rather than a production backtest. Its current history begins with the repository's first saved market snapshot, excludes left-censored first observations, does not include dividends, costs, slippage, taxes, or a point-in-time constituent database, and leaves the 60-snapshot result unavailable until that forward window actually exists. The formula is fixed rather than optimized on the displayed history; the final 30% of eligible entry dates is reported as a chronological holdout.

The constituent file covers the full Nasdaq-100 and S&P 500 security rows used by the selector. Stocks without valuation, growth, balance sheet, cash flow, analyst, and momentum metrics are shown as `Needs data` and are excluded from rankings until sample, free refresh, CSV, or future API data supplies those fields.

The S&P 500 sample metrics file remains as a fallback and includes 50+ S&P 500-style stocks across Technology, Communication Services, Consumer Discretionary, Consumer Staples, Financials, Healthcare, Industrials, Energy, Utilities, Real Estate, and Materials.

Future data-source options are documented in `docs/data-source-plan.md`.

## Deployment

GitHub Pages deploys the built Vite `dist` output through `.github/workflows/deploy-pages.yml`.

Published URL:

```text
https://gensky.github.io/SP500web/
```

## Guardrails

This app does not auto-trade, does not execute through a broker, and does not contain a live options or earnings feed. IV and catalyst inputs in the ticker cockpit are entered manually and saved only in the browser. It is for research, idea generation, and paper tracking only.

# Gensky Value Picker

A research-only stock value dashboard for ranking ideas across multiple universes:

- Nasdaq-100
- S&P 500
- Custom Watchlist
- All Stocks Combined

The app includes full Nasdaq-100 and S&P 500 constituent coverage, ranks stocks with free refreshed, sample, or imported metrics, suggests paper trade structures, and stores tracked ideas in `localStorage`.

> Sample data only. Replace with fresh market data before making real decisions.

## What It Does

- Filters by universe, sector, minimum value score, maximum debt risk, positive free cash flow, analyst upside, drawdown, and value trap avoidance.
- Scores every stock across value, quality, balance sheet, growth, momentum setup, value trap risk, and final risk-adjusted value.
- Ranks top undervalued Nasdaq-100 stocks, S&P 500 stocks, overall ideas, and sector leaders.
- Labels ideas as cheap but risky, quality value, deep value, turnaround, or avoid / possible trap.
- Suggests research-only trade ideas: long shares / LEAPS, cash-secured put, bull call spread, watchlist only, or avoid.
- Tracks paper ideas with their source universe: `NASDAQ_100`, `SP500`, or `CUSTOM`.
- Imports custom watchlists from pasted CSV-style data.

## Local Development

The local folder name contains an ampersand, so this repo uses a local `.npmrc` on this machine to make npm scripts run through PowerShell. The file is intentionally ignored and not required on CI.

```bash
npm install
npm run dev
npm run build
npm run refresh:free-data
```

## Data

Current app data combines full public index constituent lists, a generated free market data refresh, and sample fallback metric data:

- `src/data/indexConstituents.ts`
- `src/data/freeMarketData.ts`
- `src/data/sampleNasdaqStocks.ts`
- `src/data/sampleSp500Stocks.ts`
- `scripts/fetch-free-market-data.mjs`

Run `npm run refresh:free-data` to regenerate `src/data/freeMarketData.ts` from free Yahoo Finance data. This is no-key and no-paid-API, but it is unofficial, can be delayed, incomplete, rate-limited, or unavailable. The generated notes flag fields that needed defaults.

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

This app does not auto-trade, does not execute through a broker, and does not require paid APIs in this version. It is for research, idea generation, and paper tracking only.

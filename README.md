# Gensky Value Picker

A research-only stock value dashboard for ranking ideas across multiple universes:

- Nasdaq-100
- S&P 500
- Custom Watchlist
- All Stocks Combined

The app ranks sample stock metrics with a risk-adjusted value model, suggests paper trade structures, and stores tracked ideas in `localStorage`.

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
```

## Data

Current app data is sample-only TypeScript data:

- `src/data/sampleNasdaqStocks.ts`
- `src/data/sampleSp500Stocks.ts`

The S&P 500 sample file includes 50+ S&P 500-style stocks across Technology, Communication Services, Consumer Discretionary, Consumer Staples, Financials, Healthcare, Industrials, Energy, Utilities, Real Estate, and Materials.

Future data-source options are documented in `docs/data-source-plan.md`.

## Deployment

GitHub Pages deploys the built Vite `dist` output through `.github/workflows/deploy-pages.yml`.

Published URL:

```text
https://gensky.github.io/SP500web/
```

## Guardrails

This app does not auto-trade, does not execute through a broker, and does not require paid APIs in this version. It is for research, idea generation, and paper tracking only.
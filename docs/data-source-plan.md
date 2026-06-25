# Data Source Plan

S&P500web is research, idea generation, and paper tracking only. This version does not require paid APIs, does not auto-trade, and does not connect to a broker.

## Current Version

The app uses typed sample data for Nasdaq-100, S&P 500, and user-imported custom watchlists. The UI includes this warning: "Sample data only. Replace with fresh market data before making real decisions."

## Future Data Options

### Manual CSV Export/Import

Use broker, screener, or spreadsheet exports and paste them into the CSV importer. This is the lowest-friction option and keeps source control in the user's hands. Suggested columns: ticker, company, sector, industry, price, marketCap, forwardPE, trailingPE, evToEbitda, priceToFreeCashFlow, freeCashFlowYield, pegRatio, revenueGrowthEstimate, epsGrowthEstimate, debtToEquity, netDebtToEbitda, analystUpsidePercent, oneYearDrawdownPercent, momentumScore, qualityScore, notes.

### Financial Modeling Prep

Financial Modeling Prep can provide broad fundamentals, analyst estimates, ratios, and market data through an API. It is a good candidate for production-style refreshes, but plan for rate limits, paid tiers, and field mapping checks.

### Alpha Vantage

Alpha Vantage has accessible stock endpoints and some fundamentals. It may work for smaller watchlists, but rate limits can become restrictive for full S&P 500 coverage.

### Polygon.io

Polygon.io is strong for market data and reference data. Fundamentals coverage and cost should be evaluated before using it as the primary source of value metrics.

### Tiingo

Tiingo can provide market and fundamental data with a developer-friendly API. It is worth evaluating for reliability, rate limits, and license fit.

### Nasdaq Data Link

Nasdaq Data Link offers many datasets from different vendors. Coverage and licensing vary by dataset, so it should be treated as a catalog rather than a single source.

### yfinance

`yfinance` can be useful for local research notebooks and one-off analysis. It should not be treated as a production source of truth for a public website because availability, terms, and fields can change.

### SEC Company Facts

SEC company facts are useful for source-of-truth fundamentals reported in filings. They require careful XBRL tag mapping, trailing-twelve-month calculations, restatement handling, and sector-specific interpretation. SEC data does not directly provide analyst upside or market sentiment.

### OpenAI

OpenAI can summarize theses, risks, filings, transcripts, and user-provided research. It should not be the source of truth for prices, fundamentals, analyst estimates, or scoring inputs. Use it for explanation and synthesis after validated data is collected.

## Recommended Path

1. Keep manual CSV import for immediate use.
2. Add a validated data adapter layer with clear field provenance.
3. Start with a small paid/free API trial for 25 to 50 tickers.
4. Add SEC company facts for fundamentals that need auditability.
5. Keep OpenAI-generated content separate from raw metrics and scoring inputs.
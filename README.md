# S&P500web

A static GitHub Pages dashboard for S&P 500 market snapshots.

The site displays the S&P 500 index, major S&P 500 ETF proxies, and a small set of large benchmark holdings. Market data is pulled by a server-side updater and committed to `data/market.json`, so the public website does not expose an API key or rely on browser-side cross-origin requests.

## Data Pipeline

- `scripts/update_market_data.py` pulls free delayed chart data from the Yahoo Finance chart endpoint.
- `data/market.json` stores the latest generated snapshot and one year of daily closing history.
- `.github/workflows/update-market-data.yml` refreshes the JSON on weekdays after the U.S. market close and can also be run manually from GitHub Actions.

The data is for informational display only and should not be treated as trading, investment, or financial advice.

## Local Preview

Because the page fetches `data/market.json`, preview it with a local web server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.

## Refresh Data Locally

```bash
python scripts/update_market_data.py
```

## Deploy

This repository is configured for GitHub Pages from the `main` branch root.

Published URL:

```text
https://gensky.github.io/SP500web/
```

## Files

- `index.html` - Page structure
- `style.css` - Responsive dashboard styling
- `app.js` - Data rendering, chart drawing, and range controls
- `data/market.json` - Generated market data snapshot
- `scripts/update_market_data.py` - Free data fetcher
- `.github/workflows/update-market-data.yml` - Scheduled data refresh
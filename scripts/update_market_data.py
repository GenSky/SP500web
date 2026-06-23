#!/usr/bin/env python3
"""Fetch free daily market data and write data/market.json for S&P500web."""

from __future__ import annotations

import json
import math
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "market.json"
SOURCE_NAME = "Yahoo Finance chart endpoint"
SOURCE_URL = "https://query1.finance.yahoo.com/v8/finance/chart"


@dataclass(frozen=True)
class SymbolConfig:
    symbol: str
    name: str
    kind: str


SYMBOLS = [
    SymbolConfig("^GSPC", "S&P 500 Index", "Index"),
    SymbolConfig("SPY", "SPDR S&P 500 ETF Trust", "ETF"),
    SymbolConfig("VOO", "Vanguard S&P 500 ETF", "ETF"),
    SymbolConfig("IVV", "iShares Core S&P 500 ETF", "ETF"),
    SymbolConfig("RSP", "Invesco S&P 500 Equal Weight ETF", "ETF"),
    SymbolConfig("AAPL", "Apple", "Large holding"),
    SymbolConfig("MSFT", "Microsoft", "Large holding"),
    SymbolConfig("NVDA", "NVIDIA", "Large holding"),
    SymbolConfig("AMZN", "Amazon", "Large holding"),
    SymbolConfig("GOOGL", "Alphabet Class A", "Large holding"),
    SymbolConfig("META", "Meta Platforms", "Large holding"),
    SymbolConfig("BRK-B", "Berkshire Hathaway Class B", "Large holding"),
    SymbolConfig("JPM", "JPMorgan Chase", "Large holding"),
    SymbolConfig("XOM", "Exxon Mobil", "Large holding"),
    SymbolConfig("UNH", "UnitedHealth Group", "Large holding"),
]


def fetch_chart(symbol: str) -> dict[str, Any]:
    encoded = quote(symbol, safe="")
    url = f"{SOURCE_URL}/{encoded}?range=1y&interval=1d&includePrePost=false"
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; SP500web data updater)",
        },
    )
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def finite(value: Any) -> float | None:
    if isinstance(value, (int, float)) and math.isfinite(value):
        return float(value)
    return None


def build_history(payload: dict[str, Any]) -> list[dict[str, Any]]:
    result = payload["chart"]["result"][0]
    timestamps = result.get("timestamp") or []
    quote_data = result["indicators"]["quote"][0]
    closes = quote_data.get("close") or []
    volumes = quote_data.get("volume") or []
    history: list[dict[str, Any]] = []

    for index, timestamp in enumerate(timestamps):
        close = finite(closes[index] if index < len(closes) else None)
        if close is None:
            continue
        day = datetime.fromtimestamp(timestamp, tz=timezone.utc).date().isoformat()
        volume = finite(volumes[index] if index < len(volumes) else None)
        history.append({"date": day, "close": round(close, 4), "volume": int(volume or 0)})

    return history


def pct_change(current: float, previous: float | None) -> float | None:
    if previous is None or previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 4)


def first_close_on_or_after(history: list[dict[str, Any]], prefix: str) -> float | None:
    for point in history:
        if point["date"] >= prefix:
            return float(point["close"])
    return None


def summarize(config: SymbolConfig, payload: dict[str, Any]) -> dict[str, Any]:
    result = payload["chart"]["result"][0]
    meta = result.get("meta", {})
    history = build_history(payload)
    if len(history) < 2:
        raise ValueError(f"Not enough price history for {config.symbol}")

    last = float(history[-1]["close"])
    previous = float(history[-2]["close"])
    one_month_anchor = float(history[-23]["close"]) if len(history) > 23 else float(history[0]["close"])
    year_prefix = f"{datetime.now(timezone.utc).year}-01-01"
    ytd_anchor = first_close_on_or_after(history, year_prefix) or float(history[0]["close"])
    closes = [float(point["close"]) for point in history]

    return {
        "symbol": config.symbol,
        "name": config.name,
        "type": config.kind,
        "currency": meta.get("currency", "USD"),
        "exchange": meta.get("fullExchangeName") or meta.get("exchangeName") or "",
        "last": round(last, 4),
        "previousClose": round(previous, 4),
        "change": round(last - previous, 4),
        "changePercent": pct_change(last, previous),
        "oneMonthPercent": pct_change(last, one_month_anchor),
        "ytdPercent": pct_change(last, ytd_anchor),
        "fiftyTwoWeekHigh": round(max(closes), 4),
        "fiftyTwoWeekLow": round(min(closes), 4),
        "history": history,
    }


def main() -> int:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, Any]] = []
    failures: list[str] = []

    for config in SYMBOLS:
        try:
            payload = fetch_chart(config.symbol)
            rows.append(summarize(config, payload))
            time.sleep(0.35)
        except (HTTPError, URLError, TimeoutError, ValueError, KeyError, IndexError, json.JSONDecodeError) as error:
            failures.append(f"{config.symbol}: {error}")

    if not rows:
        print("No market data could be fetched.", file=sys.stderr)
        for failure in failures:
            print(failure, file=sys.stderr)
        return 1

    index_row = next((row for row in rows if row["symbol"] == "^GSPC"), rows[0])
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sourceName": SOURCE_NAME,
        "sourceUrl": SOURCE_URL,
        "notes": "Free delayed market data. Values are for informational website display only.",
        "index": index_row,
        "symbols": rows,
        "failures": failures,
    }

    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT)} with {len(rows)} symbols.")
    if failures:
        print("Partial failures:")
        for failure in failures:
            print(f"- {failure}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
import type { StockMetric, TrackerEntry } from "../types";

const CUSTOM_STOCKS_KEY = "gensky.valuePicker.customStocks.v1";
const TRACKER_KEY = "gensky.valuePicker.trackedTrades.v2";

export function loadCustomStocks(): StockMetric[] {
  return readJson<StockMetric[]>(CUSTOM_STOCKS_KEY, []);
}

export function saveCustomStocks(stocks: StockMetric[]): void {
  localStorage.setItem(CUSTOM_STOCKS_KEY, JSON.stringify(stocks));
}

export function loadTrackedTrades(): TrackerEntry[] {
  return readJson<TrackerEntry[]>(TRACKER_KEY, []);
}

export function saveTrackedTrades(entries: TrackerEntry[]): void {
  localStorage.setItem(TRACKER_KEY, JSON.stringify(entries));
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
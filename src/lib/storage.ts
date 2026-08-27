import type { OptionContext, StockMetric, TrackerEntry } from "../types";

const CUSTOM_STOCKS_KEY = "gensky.valuePicker.customStocks.v1";
const TRACKER_KEY = "gensky.valuePicker.trackedTrades.v2";
const OPTION_CONTEXT_KEY = "gensky.valuePicker.optionContext.v1";

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

export function loadOptionContexts(): Record<string, OptionContext> {
  return readJson<Record<string, OptionContext>>(OPTION_CONTEXT_KEY, {});
}

export function saveOptionContexts(contexts: Record<string, OptionContext>): void {
  localStorage.setItem(OPTION_CONTEXT_KEY, JSON.stringify(contexts));
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

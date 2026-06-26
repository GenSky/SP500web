import { indexConstituents } from "../data/indexConstituents";
import { sampleNasdaqStocks } from "../data/sampleNasdaqStocks";
import { sampleSp500Stocks } from "../data/sampleSp500Stocks";
import type { StockMetric, StockUniverse } from "../types";

export function mergeStocks(customStocks: StockMetric[]): StockMetric[] {
  const byTicker = new Map<string, StockMetric>();
  for (const stock of [...indexConstituents, ...sampleNasdaqStocks, ...sampleSp500Stocks, ...customStocks]) {
    const existing = byTicker.get(stock.ticker);
    if (!existing) {
      byTicker.set(stock.ticker, stock);
      continue;
    }

    const mergedMembership = Array.from(new Set([...existing.indexMembership, ...stock.indexMembership]));
    const preferIncomingMetrics = stock.hasMetrics !== false;
    const base = preferIncomingMetrics ? { ...existing, ...stock } : { ...stock, ...existing };

    byTicker.set(stock.ticker, {
      ...base,
      indexMembership: mergedMembership,
      hasMetrics: existing.hasMetrics !== false || stock.hasMetrics !== false
    });
  }
  return Array.from(byTicker.values());
}

export function filterByUniverse<T extends StockMetric>(stocks: T[], universe: StockUniverse): T[] {
  if (universe === "ALL") return stocks;
  if (universe === "CUSTOM") return stocks.filter((stock) => stock.indexMembership.length === 0);
  return stocks.filter((stock) => stock.indexMembership.includes(universe));
}

export function displayUniverse(stock: StockMetric): string {
  if (stock.indexMembership.length === 0) return "CUSTOM";
  return stock.indexMembership.join(" + ");
}

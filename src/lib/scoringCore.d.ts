import type { ScoreBreakdown, StockMetric } from "../types";

export const CORE_METRIC_FIELDS: readonly string[];
export function getMetricConfidence(stock: StockMetric): { score: number; missing: string[] };
export function scoreStock(stock: StockMetric): ScoreBreakdown;

import type { IndexMembership, StockMetric } from "../types";

type Seed = [string, string, IndexMembership[], string, string, number, number, number, number, number, number, number, number, number, number, number, number, number, number, string];

export function makeStock(seed: Seed): StockMetric {
  const [
    ticker,
    companyName,
    indexMembership,
    sector,
    industry,
    marketCap,
    price,
    forwardPE,
    trailingPE,
    evToEbitda,
    priceToFreeCashFlow,
    freeCashFlowYield,
    pegRatio,
    revenueGrowthEstimate,
    epsGrowthEstimate,
    debtToEquity,
    netDebtToEbitda,
    analystUpsidePercent,
    oneYearDrawdownPercent,
    notes
  ] = seed;

  return {
    ticker,
    companyName,
    indexMembership,
    sector,
    industry,
    marketCap,
    price,
    forwardPE,
    trailingPE,
    evToEbitda,
    priceToFreeCashFlow,
    freeCashFlowYield,
    pegRatio,
    revenueGrowthEstimate,
    epsGrowthEstimate,
    debtToEquity,
    netDebtToEbitda,
    analystUpsidePercent,
    oneYearDrawdownPercent,
    momentumScore: Math.max(15, Math.min(92, 66 - oneYearDrawdownPercent * 0.55 + revenueGrowthEstimate * 0.8 + epsGrowthEstimate * 0.35)),
    qualityScore: Math.max(22, Math.min(96, 76 + freeCashFlowYield * 1.2 - debtToEquity * 5 - Math.max(0, netDebtToEbitda - 1.5) * 4 + revenueGrowthEstimate * 0.35)),
    notes
  };
}
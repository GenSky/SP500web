import type { ScoreBreakdown, StockMetric, ValueCategory } from "../types";

const STRUCTURALLY_CHALLENGED_INDUSTRIES = [
  "Legacy Telecom",
  "Broadcasting",
  "Department Stores",
  "Office REITs",
  "Commodity Chemicals"
];

const CYCLICAL_SECTORS = new Set(["Energy", "Materials", "Industrials", "Consumer Discretionary", "Real Estate"]);

const clamp = (value: number, min = 0, max = 100): number => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

const lowerIsBetter = (value: number, best: number, worst: number): number => {
  if (!Number.isFinite(value)) return 45;
  return clamp(((worst - value) / (worst - best)) * 100);
};

const higherIsBetter = (value: number, worst: number, best: number): number => {
  if (!Number.isFinite(value)) return 45;
  return clamp(((value - worst) / (best - worst)) * 100);
};

export function scoreStock(stock: StockMetric): ScoreBreakdown {
  const valuationRaw = average([
    lowerIsBetter(stock.forwardPE, 7, 30),
    lowerIsBetter(stock.trailingPE, 8, 38),
    lowerIsBetter(stock.evToEbitda, 5, 24),
    lowerIsBetter(stock.priceToFreeCashFlow, 5, 36),
    higherIsBetter(stock.freeCashFlowYield, -4, 10),
    lowerIsBetter(stock.pegRatio, 0.5, 3.2),
    higherIsBetter(stock.analystUpsidePercent, -10, 35),
    higherIsBetter(stock.oneYearDrawdownPercent, 0, 45)
  ]);

  const highDebtPenalty = clamp((stock.debtToEquity - 1.2) * 12 + (stock.netDebtToEbitda - 2.5) * 8, 0, 22);
  const negativeFreeCashFlowPenalty = stock.freeCashFlowYield < 0 ? clamp(Math.abs(stock.freeCashFlowYield) * 3 + 12, 12, 28) : 0;
  const decliningRevenuePenalty = stock.revenueGrowthEstimate < 0 ? clamp(Math.abs(stock.revenueGrowthEstimate) * 2.2 + 8, 8, 24) : 0;
  const weakEarningsGrowthPenalty = stock.epsGrowthEstimate < 0 ? clamp(Math.abs(stock.epsGrowthEstimate) * 1.8 + 7, 7, 22) : stock.epsGrowthEstimate < 4 ? 6 : 0;
  const cyclicalBusinessPenalty = CYCLICAL_SECTORS.has(stock.sector) ? 4 : 0;
  const valueTrapRiskScore = calculateValueTrapRisk(stock, valuationRaw);
  const valueTrapPenalty = clamp(valueTrapRiskScore * 0.22, 0, 24);

  const valueScore = clamp(
    valuationRaw -
      highDebtPenalty -
      negativeFreeCashFlowPenalty -
      decliningRevenuePenalty -
      weakEarningsGrowthPenalty -
      cyclicalBusinessPenalty -
      valueTrapPenalty
  );

  const balanceSheetScore = clamp(100 - (stock.debtToEquity * 18 + stock.netDebtToEbitda * 14));
  const growthScore = average([
    higherIsBetter(stock.revenueGrowthEstimate, -8, 22),
    higherIsBetter(stock.epsGrowthEstimate, -10, 28),
    lowerIsBetter(stock.pegRatio, 0.5, 3)
  ]);
  const momentumSetupScore = average([
    clamp(stock.momentumScore),
    higherIsBetter(stock.oneYearDrawdownPercent, 0, 40),
    higherIsBetter(stock.analystUpsidePercent, -5, 35)
  ]);
  const qualityScore = clamp(stock.qualityScore);

  const finalRiskAdjustedValueScore = clamp(
    valueScore * 0.36 +
      qualityScore * 0.18 +
      balanceSheetScore * 0.16 +
      growthScore * 0.14 +
      momentumSetupScore * 0.16 -
      valueTrapRiskScore * 0.28
  );

  return {
    valueScore: round(valueScore),
    qualityScore: round(qualityScore),
    balanceSheetScore: round(balanceSheetScore),
    growthScore: round(growthScore),
    momentumSetupScore: round(momentumSetupScore),
    valueTrapRiskScore: round(valueTrapRiskScore),
    finalRiskAdjustedValueScore: round(finalRiskAdjustedValueScore),
    debtRisk: round(clamp(100 - balanceSheetScore)),
    category: categorize(valueScore, qualityScore, growthScore, momentumSetupScore, valueTrapRiskScore, stock),
    penalties: {
      highDebtPenalty: round(highDebtPenalty),
      negativeFreeCashFlowPenalty: round(negativeFreeCashFlowPenalty),
      decliningRevenuePenalty: round(decliningRevenuePenalty),
      weakEarningsGrowthPenalty: round(weakEarningsGrowthPenalty),
      valueTrapPenalty: round(valueTrapPenalty),
      cyclicalBusinessPenalty: round(cyclicalBusinessPenalty)
    }
  };
}

function calculateValueTrapRisk(stock: StockMetric, valuationRaw: number): number {
  let risk = 8;
  const looksCheap = valuationRaw > 68 || stock.forwardPE < 13 || stock.priceToFreeCashFlow < 12;

  if (looksCheap && stock.revenueGrowthEstimate < 0) risk += 20;
  if (stock.freeCashFlowYield < 0) risk += 22;
  else if (stock.freeCashFlowYield < 2.5) risk += 10;
  if (stock.debtToEquity > 1.6) risk += 12;
  if (stock.netDebtToEbitda > 3) risk += 14;
  if (stock.epsGrowthEstimate < 0) risk += 16;
  if (stock.oneYearDrawdownPercent > 35 && stock.momentumScore < 45) risk += 16;
  if (STRUCTURALLY_CHALLENGED_INDUSTRIES.some((industry) => stock.industry.includes(industry))) risk += 14;
  if (looksCheap && stock.qualityScore < 55) risk += 8;

  return clamp(risk);
}

function categorize(
  valueScore: number,
  qualityScore: number,
  growthScore: number,
  momentumSetupScore: number,
  trapRisk: number,
  stock: StockMetric
): ValueCategory {
  if (trapRisk >= 72) return "Avoid / possible trap";
  if (trapRisk >= 52 || stock.debtToEquity > 2.2 || stock.netDebtToEbitda > 4) return "Cheap but risky";
  if (valueScore >= 78 && qualityScore >= 72 && trapRisk < 38) return "Quality value";
  if (valueScore >= 84 && stock.oneYearDrawdownPercent >= 18) return "Deep value";
  if (valueScore >= 62 && growthScore < 48 && momentumSetupScore >= 48) return "Turnaround";
  return qualityScore >= 65 ? "Quality value" : "Cheap but risky";
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

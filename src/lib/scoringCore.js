const STRUCTURALLY_CHALLENGED_INDUSTRIES = [
  "Legacy Telecom", "Broadcasting", "Department Stores", "Office REITs", "Commodity Chemicals"
];

const CYCLICAL_SECTORS = new Set(["Energy", "Materials", "Industrials", "Consumer Discretionary", "Real Estate"]);

export const CORE_METRIC_FIELDS = [
  "forwardPE", "trailingPE", "evToEbitda", "priceToFreeCashFlow", "freeCashFlowYield", "pegRatio",
  "revenueGrowthEstimate", "epsGrowthEstimate", "debtToEquity", "netDebtToEbitda",
  "analystUpsidePercent", "oneYearDrawdownPercent"
];

const clamp = (value, min = 0, max = 100) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
const lowerIsBetter = (value, best, worst) => Number.isFinite(value) ? clamp(((worst - value) / (worst - best)) * 100) : 45;
const higherIsBetter = (value, worst, best) => Number.isFinite(value) ? clamp(((value - worst) / (best - worst)) * 100) : 45;

export function getMetricConfidence(stock) {
  const explicitMissing = Array.isArray(stock.missingMetrics) ? stock.missingMetrics : [];
  const noteMatch = typeof stock.notes === "string" ? stock.notes.match(/Defaults used for:\s*([^.]*)/i) : null;
  const noteMissing = noteMatch ? noteMatch[1].split(",").map((field) => field.trim()).filter(Boolean) : [];
  const aliases = {
    freeCashflow: ["priceToFreeCashFlow", "freeCashFlowYield"],
    revenueGrowth: ["revenueGrowthEstimate"],
    earningsGrowth: ["epsGrowthEstimate"],
    targetMeanPrice: ["analystUpsidePercent"],
    "52WeekHigh": ["oneYearDrawdownPercent"]
  };
  const expanded = [...explicitMissing, ...noteMissing].flatMap((field) => aliases[field] ?? [field]);
  const missing = [...new Set(expanded)].filter((field) => CORE_METRIC_FIELDS.includes(field));
  const observed = CORE_METRIC_FIELDS.filter((field) => Number.isFinite(stock[field]) && !missing.includes(field)).length;
  const inferred = Math.round((observed / CORE_METRIC_FIELDS.length) * 100);
  const explicit = Number(stock.dataConfidence);
  return { score: round(Number.isFinite(explicit) ? clamp(explicit) : inferred), missing };
}

export function scoreStock(stock) {
  const valuationRaw = average([
    lowerIsBetter(stock.forwardPE, 7, 30), lowerIsBetter(stock.trailingPE, 8, 38),
    lowerIsBetter(stock.evToEbitda, 5, 24), lowerIsBetter(stock.priceToFreeCashFlow, 5, 36),
    higherIsBetter(stock.freeCashFlowYield, -4, 10), lowerIsBetter(stock.pegRatio, 0.5, 3.2),
    higherIsBetter(stock.analystUpsidePercent, -10, 35), higherIsBetter(stock.oneYearDrawdownPercent, 0, 45)
  ]);

  const highDebtPenalty = clamp((stock.debtToEquity - 1.2) * 12 + (stock.netDebtToEbitda - 2.5) * 8, 0, 22);
  const negativeFreeCashFlowPenalty = stock.freeCashFlowYield < 0 ? clamp(Math.abs(stock.freeCashFlowYield) * 3 + 12, 12, 28) : 0;
  const decliningRevenuePenalty = stock.revenueGrowthEstimate < 0 ? clamp(Math.abs(stock.revenueGrowthEstimate) * 2.2 + 8, 8, 24) : 0;
  const weakEarningsGrowthPenalty = stock.epsGrowthEstimate < 0 ? clamp(Math.abs(stock.epsGrowthEstimate) * 1.8 + 7, 7, 22) : stock.epsGrowthEstimate < 4 ? 6 : 0;
  const cyclicalBusinessPenalty = CYCLICAL_SECTORS.has(stock.sector) ? 4 : 0;
  const valueTrapRiskScore = calculateValueTrapRisk(stock, valuationRaw);
  const valueTrapPenalty = clamp(valueTrapRiskScore * 0.22, 0, 24);
  const confidence = getMetricConfidence(stock);
  const dataQualityPenalty = clamp((100 - confidence.score) * 0.22, 0, 22);

  const valueScore = clamp(valuationRaw - highDebtPenalty - negativeFreeCashFlowPenalty - decliningRevenuePenalty -
    weakEarningsGrowthPenalty - cyclicalBusinessPenalty - valueTrapPenalty);
  const balanceSheetScore = clamp(100 - (stock.debtToEquity * 18 + stock.netDebtToEbitda * 14));
  const growthScore = average([
    higherIsBetter(stock.revenueGrowthEstimate, -8, 22), higherIsBetter(stock.epsGrowthEstimate, -10, 28),
    lowerIsBetter(stock.pegRatio, 0.5, 3)
  ]);
  const momentumSetupScore = average([
    clamp(stock.momentumScore), higherIsBetter(stock.oneYearDrawdownPercent, 0, 40),
    higherIsBetter(stock.analystUpsidePercent, -5, 35)
  ]);
  const qualityScore = clamp(stock.qualityScore);
  let finalRiskAdjustedValueScore = clamp(
    valueScore * 0.36 + qualityScore * 0.18 + balanceSheetScore * 0.16 + growthScore * 0.14 +
    momentumSetupScore * 0.16 - valueTrapRiskScore * 0.28 - dataQualityPenalty
  );
  if (confidence.score < 65) finalRiskAdjustedValueScore = Math.min(finalRiskAdjustedValueScore, 64.9);
  else if (confidence.score < 80) finalRiskAdjustedValueScore = Math.min(finalRiskAdjustedValueScore, 74.9);

  return {
    valueScore: round(valueScore), qualityScore: round(qualityScore), balanceSheetScore: round(balanceSheetScore),
    growthScore: round(growthScore), momentumSetupScore: round(momentumSetupScore),
    valueTrapRiskScore: round(valueTrapRiskScore), dataConfidenceScore: confidence.score,
    finalRiskAdjustedValueScore: round(finalRiskAdjustedValueScore), debtRisk: round(clamp(100 - balanceSheetScore)),
    category: categorize(valueScore, qualityScore, growthScore, momentumSetupScore, valueTrapRiskScore, stock, confidence.score),
    penalties: {
      highDebtPenalty: round(highDebtPenalty), negativeFreeCashFlowPenalty: round(negativeFreeCashFlowPenalty),
      decliningRevenuePenalty: round(decliningRevenuePenalty), weakEarningsGrowthPenalty: round(weakEarningsGrowthPenalty),
      valueTrapPenalty: round(valueTrapPenalty), cyclicalBusinessPenalty: round(cyclicalBusinessPenalty),
      dataQualityPenalty: round(dataQualityPenalty)
    }
  };
}

function calculateValueTrapRisk(stock, valuationRaw) {
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

function categorize(valueScore, qualityScore, growthScore, momentumSetupScore, trapRisk, stock, confidence) {
  if (confidence < 65) return "Needs data";
  if (trapRisk >= 72) return "Avoid / possible trap";
  if (trapRisk >= 52 || stock.debtToEquity > 2.2 || stock.netDebtToEbitda > 4) return "Cheap but risky";
  if (valueScore >= 78 && qualityScore >= 72 && trapRisk < 38) return "Quality value";
  if (valueScore >= 84 && stock.oneYearDrawdownPercent >= 18) return "Deep value";
  if (valueScore >= 62 && growthScore < 48 && momentumSetupScore >= 48) return "Turnaround";
  return qualityScore >= 65 ? "Quality value" : "Cheap but risky";
}

function average(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function round(value) { return Math.round(value * 10) / 10; }

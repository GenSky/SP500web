import type { ScoredStock, TradeIdea } from "../types";

export function pickTrade(stock: ScoredStock): TradeIdea {
  const isSp500 = stock.indexMembership.includes("SP500");
  const highQuality = stock.qualityScore >= 72 && stock.balanceSheetScore >= 65;
  const undervalued = stock.valueScore >= 68 || stock.finalRiskAdjustedValueScore >= 64;
  const lowTrapRisk = stock.valueTrapRiskScore < 38;
  const highTrapRisk = stock.valueTrapRiskScore >= 70;
  const marketUncertain = stock.momentumSetupScore < 52 || stock.oneYearDrawdownPercent > 22;
  const goodUpside = stock.analystUpsidePercent >= 14;
  const extremelyCheap = stock.valueScore >= 82;
  const weakDebtGrowth = stock.debtRisk > 58 || stock.growthScore < 42;

  let action: TradeIdea["action"];
  if (highTrapRisk) {
    action = "Avoid";
  } else if (isSp500 && highQuality && undervalued && lowTrapRisk) {
    action = "Long shares / LEAPS";
  } else if (undervalued && marketUncertain && stock.valueTrapRiskScore < 62) {
    action = "Cash-secured put";
  } else if (goodUpside && !extremelyCheap && stock.valueTrapRiskScore < 55) {
    action = "Bull call spread";
  } else if (weakDebtGrowth) {
    action = "Watchlist only";
  } else if (undervalued && highQuality) {
    action = "Long shares / LEAPS";
  } else {
    action = "Watchlist only";
  }

  return {
    action,
    why: buildWhy(stock, action)
  };
}

function buildWhy(stock: ScoredStock, action: TradeIdea["action"]): string {
  const scoreLine = `Final ${score(stock.finalRiskAdjustedValueScore)}/100 | value ${score(stock.valueScore)}/100 | trap risk ${score(stock.valueTrapRiskScore)}/100.`;
  const reasonLine = [
    actionRead(action),
    valueRead(stock),
    balanceRead(stock),
    cashFlowRead(stock),
    growthMomentumRead(stock)
  ].join(" ");
  return `${scoreLine}\n${reasonLine}`;
}

function actionRead(action: TradeIdea["action"]): string {
  const reads: Record<TradeIdea["action"], string> = {
    "Long shares / LEAPS": "Strong enough to study as a long-term buy idea.",
    "Cash-secured put": "Interesting, but a lower entry price would be better.",
    "Bull call spread": "Upside is possible, but keep risk defined.",
    "Watchlist only": "Not a buy signal yet.",
    Avoid: "Skip it for now.",
    "Needs data": "Needs fresh data before ranking."
  };
  return reads[action];
}

function valueRead(stock: ScoredStock): string {
  if (stock.valueScore >= 70) return `Valuation looks cheap: forward P/E ${number(stock.forwardPE)}, FCF yield ${number(stock.freeCashFlowYield)}%.`;
  if (stock.valueScore >= 45) return `Valuation is mixed: forward P/E ${number(stock.forwardPE)}, FCF yield ${number(stock.freeCashFlowYield)}%.`;
  return `Valuation is not cheap yet: forward P/E ${number(stock.forwardPE)}, FCF yield ${number(stock.freeCashFlowYield)}%.`;
}

function balanceRead(stock: ScoredStock): string {
  if (stock.debtRisk >= 65 || stock.balanceSheetScore < 45) return `Debt is the main caution: debt/equity ${number(stock.debtToEquity)}.`;
  return `Debt looks manageable: debt/equity ${number(stock.debtToEquity)}.`;
}

function cashFlowRead(stock: ScoredStock): string {
  return stock.freeCashFlowYield >= 0 ? "Cash flow is positive." : "Cash flow is negative.";
}

function growthMomentumRead(stock: ScoredStock): string {
  const growth = stock.revenueGrowthEstimate >= 0 && stock.epsGrowthEstimate >= 0
    ? `Growth is positive: revenue ${number(stock.revenueGrowthEstimate)}%, EPS ${number(stock.epsGrowthEstimate)}%.`
    : `Growth is weak: revenue ${number(stock.revenueGrowthEstimate)}%, EPS ${number(stock.epsGrowthEstimate)}%.`;
  const momentum = stock.momentumSetupScore >= 55 ? "Momentum is okay." : "Momentum still needs work.";
  return `${growth} ${momentum}`;
}

function score(value: number): string {
  return Math.round(value).toString();
}

function number(value: number): string {
  if (!Number.isFinite(value)) return "n/a";
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

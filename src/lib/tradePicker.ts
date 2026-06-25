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
  return `${action}: valuation score ${stock.valueScore}/100 with forward P/E ${stock.forwardPE} and FCF yield ${stock.freeCashFlowYield}%. Balance sheet score ${stock.balanceSheetScore}/100 reflects debt/equity ${stock.debtToEquity} and net debt/EBITDA ${stock.netDebtToEbitda}. Growth score ${stock.growthScore}/100 uses revenue growth ${stock.revenueGrowthEstimate}% and EPS growth ${stock.epsGrowthEstimate}%. Free cash flow is ${stock.freeCashFlowYield >= 0 ? "positive" : "negative"}. Momentum setup is ${stock.momentumSetupScore}/100 after a ${stock.oneYearDrawdownPercent}% one-year drawdown, while downside and value trap risk are captured by trap score ${stock.valueTrapRiskScore}/100.`;
}
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
  return [
    actionSummary(action),
    valueRead(stock),
    balanceRead(stock),
    growthRead(stock),
    cashFlowRead(stock),
    riskRead(stock)
  ].join("\n");
}

function actionSummary(action: TradeIdea["action"]): string {
  const summaries: Record<TradeIdea["action"], string> = {
    "Long shares / LEAPS": "The setup looks strong enough to consider owning shares or a longer-term call option, after you verify the current data.",
    "Cash-secured put": "This may be better as a patient entry idea: only sell a put if you would be happy owning the stock at a lower price.",
    "Bull call spread": "There may be upside, but the stock is not screaming cheap, so a defined-risk bullish option idea fits better than chasing.",
    "Watchlist only": "Not a buy signal yet. Keep it on the list and wait for a cleaner setup.",
    Avoid: "Skip it for now. The cheap-looking price may be hiding bigger problems.",
    "Needs data": "No trade idea yet because this ticker needs fresh valuation, growth, debt, cash-flow, and momentum data."
  };
  return summaries[action];
}

function valueRead(stock: ScoredStock): string {
  if (stock.valueScore >= 70) return "Valuation: Looks cheap versus its earnings or cash flow.";
  if (stock.valueScore >= 45) return "Valuation: Looks mixed, not clearly cheap or expensive.";
  return "Valuation: Does not look cheap enough yet.";
}

function balanceRead(stock: ScoredStock): string {
  if (stock.debtRisk >= 65 || stock.balanceSheetScore < 45) return "Debt: Balance-sheet risk is high, so be careful.";
  if (stock.balanceSheetScore >= 70) return "Debt: Balance sheet looks manageable.";
  return "Debt: Balance sheet is okay, but not a major strength.";
}

function growthRead(stock: ScoredStock): string {
  if (stock.revenueGrowthEstimate < 0 || stock.epsGrowthEstimate < 0) return "Growth: Sales or earnings are shrinking, which can turn a cheap stock into a trap.";
  if (stock.growthScore >= 65) return "Growth: Sales and earnings are still moving in the right direction.";
  return "Growth: Growth looks slow, so the stock needs another reason to work.";
}

function cashFlowRead(stock: ScoredStock): string {
  if (stock.freeCashFlowYield < 0) return "Cash flow: Free cash flow is negative, which is a warning sign.";
  if (stock.freeCashFlowYield >= 4) return "Cash flow: The business is producing useful free cash flow.";
  return "Cash flow: Free cash flow is positive but not especially strong.";
}

function riskRead(stock: ScoredStock): string {
  if (stock.valueTrapRiskScore >= 70) return "Risk: Trap risk is high. Do more homework before touching it.";
  if (stock.valueTrapRiskScore >= 40) return "Risk: Some warning signs remain, so size any idea carefully.";
  if (stock.momentumSetupScore >= 60) return "Risk: Trap risk is low and the price trend is not fighting the idea too much.";
  return "Risk: Trap risk is low, but the price trend still needs to improve.";
}

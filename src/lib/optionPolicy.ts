import type { OptionContext, OptionRecommendation, ScoredStock } from "../types";

export function recommendOptionStructure(stock: ScoredStock, context: OptionContext): OptionRecommendation {
  const ivRank = finite(context.ivRank);
  const daysToEarnings = finite(context.daysToEarnings);
  const expectedMove = finite(context.expectedMovePercent);
  const skew = finite(context.putSkewPercent);
  const termRatio = finite(context.frontBackIvRatio);
  const nearEarnings = daysToEarnings !== undefined && daysToEarnings <= 10;

  if (stock.dataConfidenceScore < 80 || stock.valueTrapRiskScore >= 65) {
    return {
      structure: "Wait / watch", conviction: "Low",
      why: "The fundamental evidence or trap-risk filter is not strong enough to justify adding option leverage.",
      guardrail: "Improve the data or resolve the value-trap flags before selecting a contract."
    };
  }
  if (nearEarnings || (termRatio !== undefined && termRatio >= 1.15)) {
    return {
      structure: "Defined-risk only", conviction: "Low",
      why: `Near-term event volatility is elevated${expectedMove !== undefined ? ` with a ${expectedMove.toFixed(1)}% expected move` : ""}.`,
      guardrail: "Avoid naked short premium; cap loss and assume volatility can collapse after the event."
    };
  }
  if (ivRank === undefined) {
    return {
      structure: "Wait / watch", conviction: "Low",
      why: "IV rank is missing, so the scanner cannot compare option premium with the stock's own history.",
      guardrail: "Enter current IV rank, expected move, earnings timing, skew and term structure; use shares if you must act without them."
    };
  }
  if (ivRank < 25) {
    return {
      structure: "Shares / LEAPS", conviction: stock.finalRiskAdjustedValueScore >= 75 ? "High" : "Medium",
      why: "Relative volatility is inexpensive, favoring long delta over selling cheap premium.",
      guardrail: "Prefer liquid expiries and keep total premium at risk within the portfolio-size limit."
    };
  }
  if (ivRank >= 65 && (skew ?? 0) >= 4 && stock.tradeIdea.action !== "Avoid") {
    return {
      structure: "Cash-secured put", conviction: "Medium",
      why: "Rich IV and put skew may pay for a lower entry while preserving a defined cash obligation.",
      guardrail: "Only sell a strike where assignment fits the max position size; do not use this through an unresolved catalyst."
    };
  }
  return {
    structure: "Bull call spread", conviction: "Medium",
    why: "Moderate-to-rich volatility favors defined-risk upside with less vega exposure than a naked call.",
    guardrail: "Use a realistic target near the upper strike and treat the debit as fully at risk."
  };
}

function finite(value: number | undefined): number | undefined {
  return Number.isFinite(value) ? Number(value) : undefined;
}

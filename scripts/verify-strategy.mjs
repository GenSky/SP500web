import assert from "node:assert/strict";
import fs from "node:fs";
import { scoreStock } from "../src/lib/scoringCore.js";

const fixture = {
  ticker: "TEST", companyName: "Test Co", indexMembership: ["SP500"], sector: "Technology", industry: "Software",
  marketCap: 10_000_000_000, price: 100, forwardPE: 12, trailingPE: 15, evToEbitda: 10,
  priceToFreeCashFlow: 14, freeCashFlowYield: 7.1, pegRatio: 1.2, revenueGrowthEstimate: 9,
  epsGrowthEstimate: 12, debtToEquity: 0.4, netDebtToEbitda: 0.8, analystUpsidePercent: 20,
  oneYearDrawdownPercent: 25, momentumScore: 58, qualityScore: 82, notes: "Complete fixture", hasMetrics: true
};

const complete = scoreStock(fixture);
assert.equal(complete.dataConfidenceScore, 100);
assert.equal(complete.penalties.dataQualityPenalty, 0);

const incomplete = scoreStock({
  ...fixture,
  notes: `Defaults used for: ${["forwardPE", "trailingPE", "evToEbitda", "priceToFreeCashFlow", "freeCashFlowYield", "pegRatio", "revenueGrowthEstimate", "epsGrowthEstimate", "debtToEquity", "netDebtToEbitda", "analystUpsidePercent", "oneYearDrawdownPercent"].join(", ")}.`
});
assert.equal(incomplete.dataConfidenceScore, 0);
assert.ok(incomplete.finalRiskAdjustedValueScore <= 64.9);
assert.ok(incomplete.penalties.dataQualityPenalty > 0);

const partial = scoreStock({ ...fixture, dataConfidence: 75 });
assert.equal(partial.dataConfidenceScore, 75);
assert.ok(partial.finalRiskAdjustedValueScore <= 74.9);

const history = JSON.parse(fs.readFileSync(new URL("../src/data/strategyHistory.json", import.meta.url), "utf8"));
assert.ok(history.snapshots.length >= 2, "Strategy history needs at least two snapshots");
assert.deepEqual([...history.snapshots.map((item) => item.date)].sort(), history.snapshots.map((item) => item.date), "Snapshots must be chronological");
assert.equal(new Set(history.snapshots.map((item) => item.date)).size, history.snapshots.length, "Snapshots must be unique by day");
assert.ok(history.backtests.every((item) => item.eventCount >= 0 && item.winRate >= 0 && item.winRate <= 100));
assert.ok(history.snapshots.some((snapshot) => snapshot.rows.some((row) => row[0] === "WDAY")), "WDAY history should be preserved");

console.log("Scoring confidence, caps, history ordering and backtest bounds verified.");

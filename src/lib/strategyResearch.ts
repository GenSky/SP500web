import historyJson from "../data/strategyHistory.json";
import type { ScoredStock } from "../types";

export type HistoryRow = [string, string, number, number, number, number, number, number, number];
export interface BacktestSummary {
  threshold: number;
  horizon: number;
  eventCount: number;
  medianReturn: number;
  meanReturn: number;
  winRate: number;
  medianSectorExcess: number;
  holdoutEventCount: number;
  holdoutMedianReturn: number;
  holdoutWinRate: number;
  sampleEvents: Array<{ ticker: string; date: string; return: number }>;
}

const history = historyJson as unknown as {
  generatedAt: string;
  snapshots: Array<{ date: string; generatedAt: string; rows: HistoryRow[] }>;
  backtests: BacktestSummary[];
};

export function backtestsForThreshold(threshold: number): BacktestSummary[] {
  return history.backtests.filter((item) => item.threshold === threshold).sort((a, b) => a.horizon - b.horizon);
}

export function tickerScoreHistory(ticker: string): Array<{ date: string; price: number; score: number; trap: number; confidence: number }> {
  return history.snapshots.flatMap((snapshot) => {
    const row = snapshot.rows.find((item) => item[0] === ticker);
    return row ? [{ date: snapshot.date, price: row[2], score: row[3], trap: row[5], confidence: row[6] }] : [];
  });
}

export function historyCoverage(): { first: string; last: string; snapshots: number } {
  return {
    first: history.snapshots.at(0)?.date ?? "n/a",
    last: history.snapshots.at(-1)?.date ?? "n/a",
    snapshots: history.snapshots.length
  };
}

export function marketRegime(stocks: ScoredStock[]): { label: string; detail: string; breadth: number } {
  const usable = stocks.filter((stock) => stock.hasMetrics !== false && stock.dataConfidenceScore >= 80);
  if (!usable.length) return { label: "Unknown", detail: "Not enough reliable rows", breadth: 0 };
  const breadth = Math.round(usable.filter((stock) => stock.momentumSetupScore >= 55).length / usable.length * 100);
  const medianDrawdown = median(usable.map((stock) => stock.oneYearDrawdownPercent));
  if (breadth >= 58 && medianDrawdown < 14) return { label: "Risk-on", detail: `${breadth}% positive setup breadth`, breadth };
  if (breadth <= 36 || medianDrawdown > 24) return { label: "Stressed", detail: `${breadth}% positive breadth / ${Math.round(medianDrawdown)}% median drawdown`, breadth };
  return { label: "Selective", detail: `${breadth}% positive setup breadth`, breadth };
}

export function sectorRelative(stock: ScoredStock, stocks: ScoredStock[]): { scorePercentile: number; drawdownGap: number; label: string } {
  const peers = stocks.filter((peer) => peer.sector === stock.sector && peer.hasMetrics !== false && peer.dataConfidenceScore >= 80);
  const below = peers.filter((peer) => peer.finalRiskAdjustedValueScore <= stock.finalRiskAdjustedValueScore).length;
  const scorePercentile = peers.length ? Math.round(below / peers.length * 100) : 0;
  const drawdownGap = stock.oneYearDrawdownPercent - median(peers.map((peer) => peer.oneYearDrawdownPercent));
  const label = scorePercentile >= 75 ? "Sector leader" : scorePercentile >= 50 ? "Above sector median" : "Below sector median";
  return { scorePercentile, drawdownGap: round(drawdownGap), label };
}

export function riskSizing(stock: ScoredStock): { starterPercent: number; maxPercent: number; stopRule: string } {
  const conviction = Math.max(0, stock.finalRiskAdjustedValueScore - 50);
  const confidenceFactor = stock.dataConfidenceScore / 100;
  const trapFactor = Math.max(0.2, 1 - stock.valueTrapRiskScore / 100);
  const starterPercent = Math.min(2, Math.max(0.25, conviction / 20 * confidenceFactor * trapFactor));
  const maxPercent = Math.min(5, starterPercent * (stock.qualityScore >= 72 ? 2.2 : 1.6));
  return {
    starterPercent: round(starterPercent),
    maxPercent: round(maxPercent),
    stopRule: "Size by thesis risk; exit or re-underwrite after a score break, guidance cut, or invalidated catalyst—not a fixed price alone."
  };
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function round(value: number): number { return Math.round(value * 10) / 10; }

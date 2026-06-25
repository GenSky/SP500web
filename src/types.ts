export type IndexMembership = "NASDAQ_100" | "SP500";
export type TradeUniverse = "NASDAQ_100" | "SP500" | "CUSTOM";
export type StockUniverse = TradeUniverse | "ALL";

export interface StockMetric {
  ticker: string;
  companyName: string;
  indexMembership: IndexMembership[];
  sector: string;
  industry: string;
  marketCap: number;
  price: number;
  forwardPE: number;
  trailingPE: number;
  evToEbitda: number;
  priceToFreeCashFlow: number;
  freeCashFlowYield: number;
  pegRatio: number;
  revenueGrowthEstimate: number;
  epsGrowthEstimate: number;
  debtToEquity: number;
  netDebtToEbitda: number;
  analystUpsidePercent: number;
  oneYearDrawdownPercent: number;
  momentumScore: number;
  qualityScore: number;
  notes: string;
}

export interface ScoreBreakdown {
  valueScore: number;
  qualityScore: number;
  balanceSheetScore: number;
  growthScore: number;
  momentumSetupScore: number;
  valueTrapRiskScore: number;
  finalRiskAdjustedValueScore: number;
  debtRisk: number;
  category: ValueCategory;
  penalties: {
    highDebtPenalty: number;
    negativeFreeCashFlowPenalty: number;
    decliningRevenuePenalty: number;
    weakEarningsGrowthPenalty: number;
    valueTrapPenalty: number;
    cyclicalBusinessPenalty: number;
  };
}

export type ValueCategory =
  | "Cheap but risky"
  | "Quality value"
  | "Deep value"
  | "Turnaround"
  | "Avoid / possible trap";

export interface ScoredStock extends StockMetric, ScoreBreakdown {
  tradeIdea: TradeIdea;
}

export interface TradeIdea {
  action: "Long shares / LEAPS" | "Cash-secured put" | "Bull call spread" | "Watchlist only" | "Avoid";
  why: string;
}

export interface TrackerEntry {
  id: string;
  ticker: string;
  companyName: string;
  universe: TradeUniverse;
  action: TradeIdea["action"];
  openedAt: string;
  finalRiskAdjustedValueScore: number;
  valueTrapRiskScore: number;
  notes: string;
  status: "Watching" | "Paper open" | "Closed";
}

export interface FilterState {
  universe: StockUniverse;
  sector: string;
  minValueScore: number;
  maxDebtRisk: number;
  positiveFcfOnly: boolean;
  minAnalystUpside: number;
  minDrawdown: number;
  avoidValueTraps: boolean;
}

export type CsvImportResult = {
  stocks: StockMetric[];
  errors: string[];
};
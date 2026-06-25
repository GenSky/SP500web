import type { CsvImportResult, StockMetric } from "../types";

const HEADER_ALIASES: Record<string, keyof StockMetric> = {
  ticker: "ticker",
  symbol: "ticker",
  company: "companyName",
  companyname: "companyName",
  name: "companyName",
  sector: "sector",
  industry: "industry",
  marketcap: "marketCap",
  price: "price",
  forwardpe: "forwardPE",
  trailingpe: "trailingPE",
  evtoebitda: "evToEbitda",
  pricetofreecashflow: "priceToFreeCashFlow",
  fcfyield: "freeCashFlowYield",
  freecashflowyield: "freeCashFlowYield",
  pegratio: "pegRatio",
  revenuegrowth: "revenueGrowthEstimate",
  revenuegrowthestimate: "revenueGrowthEstimate",
  epsgrowth: "epsGrowthEstimate",
  epsgrowthestimate: "epsGrowthEstimate",
  debttoequity: "debtToEquity",
  netdebttoebitda: "netDebtToEbitda",
  analystupside: "analystUpsidePercent",
  analystupsidepercent: "analystUpsidePercent",
  drawdown: "oneYearDrawdownPercent",
  oneyeardrawdownpercent: "oneYearDrawdownPercent",
  momentum: "momentumScore",
  momentumscore: "momentumScore",
  quality: "qualityScore",
  qualityscore: "qualityScore",
  notes: "notes"
};

export function parseCsvWatchlist(text: string): CsvImportResult {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    return { stocks: [], errors: ["Paste a header row and at least one stock row."] };
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const mappedHeaders = headers.map((header) => HEADER_ALIASES[header]);
  const errors: string[] = [];
  const stocks: StockMetric[] = [];

  lines.slice(1).forEach((line, rowIndex) => {
    const values = splitCsvLine(line);
    const row: Partial<Record<keyof StockMetric, string>> = {};
    mappedHeaders.forEach((header, index) => {
      if (header) row[header] = values[index] ?? "";
    });

    const ticker = String(row.ticker || "").trim().toUpperCase();
    if (!ticker) {
      errors.push(`Row ${rowIndex + 2}: missing ticker.`);
      return;
    }

    stocks.push({
      ticker,
      companyName: stringValue(row.companyName, ticker),
      indexMembership: [],
      sector: stringValue(row.sector, "Custom"),
      industry: stringValue(row.industry, "Imported"),
      marketCap: numberValue(row.marketCap, 0),
      price: numberValue(row.price, 0),
      forwardPE: numberValue(row.forwardPE, 18),
      trailingPE: numberValue(row.trailingPE, 22),
      evToEbitda: numberValue(row.evToEbitda, 12),
      priceToFreeCashFlow: numberValue(row.priceToFreeCashFlow, 18),
      freeCashFlowYield: numberValue(row.freeCashFlowYield, 4),
      pegRatio: numberValue(row.pegRatio, 1.8),
      revenueGrowthEstimate: numberValue(row.revenueGrowthEstimate, 4),
      epsGrowthEstimate: numberValue(row.epsGrowthEstimate, 6),
      debtToEquity: numberValue(row.debtToEquity, 1),
      netDebtToEbitda: numberValue(row.netDebtToEbitda, 2),
      analystUpsidePercent: numberValue(row.analystUpsidePercent, 8),
      oneYearDrawdownPercent: numberValue(row.oneYearDrawdownPercent, 12),
      momentumScore: numberValue(row.momentumScore, 50),
      qualityScore: numberValue(row.qualityScore, 55),
      notes: stringValue(row.notes, "Imported CSV watchlist stock")
    });
  });

  return { stocks, errors };
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function numberValue(value: unknown, fallback: number): number {
  const parsed = Number(String(value ?? "").replace(/[$,%]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}
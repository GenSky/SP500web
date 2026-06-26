import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import YahooFinance from "yahoo-finance2";

const ROOT = process.cwd();
const CONSTITUENTS_FILE = path.join(ROOT, "src", "data", "indexConstituents.ts");
const OUTPUT_FILE = path.join(ROOT, "src", "data", "freeMarketData.ts");
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const rawArgs = process.argv.slice(2);
const args = parseArgs(rawArgs);
const limit = numberArg(args.limit, Number.POSITIVE_INFINITY);
const delayMs = numberArg(args.delay, 250);
const symbols = args.symbols ? new Set(String(args.symbols).split(",").map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)) : null;

const constituents = readConstituents(CONSTITUENTS_FILE)
  .filter((stock) => !symbols || symbols.has(stock.ticker))
  .slice(0, limit);

if (constituents.length === 0) {
  throw new Error("No constituents matched the requested refresh scope.");
}

console.log(`Fetching free Yahoo Finance data for ${constituents.length} ticker(s)...`);
const startedAt = new Date();
const rows = [];
const failures = [];

for (const [index, stock] of constituents.entries()) {
  const symbol = toYahooSymbol(stock.ticker);
  try {
    const quote = await yahooFinance.quoteSummary(symbol, {
      modules: ["price", "summaryDetail", "defaultKeyStatistics", "financialData", "assetProfile"]
    });
    const mapped = mapQuote(stock, quote);
    rows.push(mapped);
    console.log(`${index + 1}/${constituents.length} ${stock.ticker} ok`);
  } catch (error) {
    failures.push({ ticker: stock.ticker, message: error instanceof Error ? error.message : String(error) });
    console.warn(`${index + 1}/${constituents.length} ${stock.ticker} failed: ${failures.at(-1).message}`);
  }
  if (index < constituents.length - 1 && delayMs > 0) {
    await sleep(delayMs);
  }
}

writeDataFile(rows, failures, startedAt);
console.log(`Wrote ${rows.length} rows to ${path.relative(ROOT, OUTPUT_FILE)}.`);
if (failures.length > 0) {
  console.warn(`${failures.length} ticker(s) failed. They will remain Needs data until another refresh/import succeeds.`);
}

function mapQuote(stock, quote) {
  const price = finite(quote.price?.regularMarketPrice, NaN);
  const marketCap = finite(quote.price?.marketCap, NaN);
  const sector = normalizeSector(text(quote.assetProfile?.sector, stock.sector));
  const industry = text(quote.assetProfile?.industry, stock.industry);
  const forwardPE = finite(quote.summaryDetail?.forwardPE, NaN);
  const trailingPE = finite(quote.summaryDetail?.trailingPE, NaN);
  const evToEbitda = finite(quote.defaultKeyStatistics?.enterpriseToEbitda, NaN);
  const freeCashflow = finite(quote.financialData?.freeCashflow, NaN);
  const fcfYield = Number.isFinite(freeCashflow) && Number.isFinite(marketCap) && marketCap > 0 ? (freeCashflow / marketCap) * 100 : NaN;
  const priceToFreeCashFlow = Number.isFinite(fcfYield) && fcfYield !== 0 ? 100 / fcfYield : NaN;
  const pegRatio = finite(quote.defaultKeyStatistics?.pegRatio, NaN);
  const revenueGrowthEstimate = percentField(quote.financialData?.revenueGrowth);
  const epsGrowthEstimate = percentField(quote.financialData?.earningsGrowth);
  const debtToEquity = debtToEquityRatio(quote.financialData?.debtToEquity);
  const totalDebt = finite(quote.financialData?.totalDebt, NaN);
  const totalCash = finite(quote.financialData?.totalCash, NaN);
  const ebitda = finite(quote.financialData?.ebitda, NaN);
  const netDebtToEbitda = Number.isFinite(totalDebt) && Number.isFinite(totalCash) && Number.isFinite(ebitda) && ebitda !== 0
    ? (totalDebt - totalCash) / ebitda
    : NaN;
  const targetMeanPrice = finite(quote.financialData?.targetMeanPrice, NaN);
  const analystUpsidePercent = Number.isFinite(targetMeanPrice) && Number.isFinite(price) && price > 0 ? ((targetMeanPrice - price) / price) * 100 : NaN;
  const high52 = finite(quote.summaryDetail?.fiftyTwoWeekHigh, NaN);
  const low52 = finite(quote.summaryDetail?.fiftyTwoWeekLow, NaN);
  const oneYearDrawdownPercent = Number.isFinite(high52) && Number.isFinite(price) && high52 > 0 ? Math.max(0, ((high52 - price) / high52) * 100) : NaN;

  const normalized = {
    ticker: stock.ticker,
    companyName: text(quote.price?.shortName || quote.price?.longName, stock.companyName),
    indexMembership: stock.indexMembership,
    sector,
    industry,
    hasMetrics: true,
    marketCap: valueOrDefault(marketCap, 0),
    price: valueOrDefault(price, 0),
    forwardPE: valueOrDefault(forwardPE, 18),
    trailingPE: valueOrDefault(trailingPE, 22),
    evToEbitda: valueOrDefault(evToEbitda, 12),
    priceToFreeCashFlow: valueOrDefault(priceToFreeCashFlow, 18),
    freeCashFlowYield: valueOrDefault(fcfYield, 4),
    pegRatio: valueOrDefault(pegRatio, 1.8),
    revenueGrowthEstimate: valueOrDefault(revenueGrowthEstimate, 4),
    epsGrowthEstimate: valueOrDefault(epsGrowthEstimate, 6),
    debtToEquity: valueOrDefault(debtToEquity, 1),
    netDebtToEbitda: valueOrDefault(netDebtToEbitda, 2),
    analystUpsidePercent: valueOrDefault(analystUpsidePercent, 0),
    oneYearDrawdownPercent: valueOrDefault(oneYearDrawdownPercent, 0),
    momentumScore: 50,
    qualityScore: 55,
    notes: "Free Yahoo Finance refresh. Review missing/defaulted fields before making decisions."
  };

  normalized.momentumScore = momentumScore(normalized, low52, high52);
  normalized.qualityScore = qualityScore(normalized);
  normalized.notes = buildNotes(stock.ticker, quote, normalized);
  return normalized;
}

function buildNotes(ticker, quote, stock) {
  const missing = [];
  const checks = [
    ["marketCap", quote.price?.marketCap],
    ["price", quote.price?.regularMarketPrice],
    ["forwardPE", quote.summaryDetail?.forwardPE],
    ["trailingPE", quote.summaryDetail?.trailingPE],
    ["evToEbitda", quote.defaultKeyStatistics?.enterpriseToEbitda],
    ["freeCashflow", quote.financialData?.freeCashflow],
    ["pegRatio", quote.defaultKeyStatistics?.pegRatio],
    ["revenueGrowth", quote.financialData?.revenueGrowth],
    ["earningsGrowth", quote.financialData?.earningsGrowth],
    ["debtToEquity", quote.financialData?.debtToEquity],
    ["targetMeanPrice", quote.financialData?.targetMeanPrice],
    ["52WeekHigh", quote.summaryDetail?.fiftyTwoWeekHigh]
  ];
  for (const [name, value] of checks) {
    if (!Number.isFinite(Number(value))) missing.push(name);
  }
  const missingText = missing.length > 0 ? ` Defaults used for: ${missing.join(", ")}.` : "";
  return `${ticker} metrics from a free Yahoo Finance refresh.${missingText} Research only; verify with primary filings and current quotes.`;
}

function momentumScore(stock, low52, high52) {
  let score = 50;
  if (Number.isFinite(low52) && Number.isFinite(high52) && high52 > low52 && stock.price > 0) {
    const rangePosition = (stock.price - low52) / (high52 - low52);
    score = 35 + rangePosition * 45;
  }
  score += stock.revenueGrowthEstimate * 0.18 + stock.epsGrowthEstimate * 0.12;
  score -= Math.max(0, stock.oneYearDrawdownPercent - 20) * 0.35;
  return round(clamp(score, 10, 95));
}

function qualityScore(stock) {
  const score = 66 + stock.freeCashFlowYield * 1.2 - stock.debtToEquity * 7 - Math.max(0, stock.netDebtToEbitda - 2) * 5 + stock.revenueGrowthEstimate * 0.25 + stock.epsGrowthEstimate * 0.18;
  return round(clamp(score, 15, 96));
}

function readConstituents(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const blocks = source.match(/\{\n\s+ticker:[\s\S]*?\n\s+\}/g) ?? [];
  return blocks.map((block) => ({
    ticker: capture(block, /ticker: "([^"]+)"/),
    companyName: capture(block, /companyName: "([^"]+)"/),
    indexMembership: [...block.matchAll(/"(NASDAQ_100|SP500)"/g)].map((match) => match[1]),
    sector: capture(block, /sector: "([^"]+)"/),
    industry: capture(block, /industry: "([^"]+)"/)
  })).filter((stock) => stock.ticker && stock.companyName);
}

function writeDataFile(rows, failures, startedAt) {
  const generatedAt = new Date().toISOString();
  const body = rows.map(formatStock).join(",\n");
  const failureComment = failures.length > 0
    ? `// Failed tickers: ${failures.map((failure) => `${failure.ticker} (${failure.message.replace(/\s+/g, " ")})`).join("; ")}\n`
    : "";
  const content = `import type { StockMetric } from "../types";\n\n// Generated by scripts/fetch-free-market-data.mjs on ${generatedAt}.\n// Free Yahoo Finance data is unofficial and may be delayed, incomplete, rate-limited, or unavailable.\n// Refresh started at ${startedAt.toISOString()} and wrote ${rows.length} scored metric rows.\n${failureComment}export const freeMarketData: StockMetric[] = [\n${body}\n];\n`;
  fs.writeFileSync(OUTPUT_FILE, content);
}

function formatStock(stock) {
  return `  {\n${[
    ["ticker", q(stock.ticker)],
    ["companyName", q(stock.companyName)],
    ["indexMembership", `[${stock.indexMembership.map(q).join(", ")}]`],
    ["sector", q(stock.sector)],
    ["industry", q(stock.industry)],
    ["hasMetrics", "true"],
    ["marketCap", n(stock.marketCap)],
    ["price", n(stock.price)],
    ["forwardPE", n(stock.forwardPE)],
    ["trailingPE", n(stock.trailingPE)],
    ["evToEbitda", n(stock.evToEbitda)],
    ["priceToFreeCashFlow", n(stock.priceToFreeCashFlow)],
    ["freeCashFlowYield", n(stock.freeCashFlowYield)],
    ["pegRatio", n(stock.pegRatio)],
    ["revenueGrowthEstimate", n(stock.revenueGrowthEstimate)],
    ["epsGrowthEstimate", n(stock.epsGrowthEstimate)],
    ["debtToEquity", n(stock.debtToEquity)],
    ["netDebtToEbitda", n(stock.netDebtToEbitda)],
    ["analystUpsidePercent", n(stock.analystUpsidePercent)],
    ["oneYearDrawdownPercent", n(stock.oneYearDrawdownPercent)],
    ["momentumScore", n(stock.momentumScore)],
    ["qualityScore", n(stock.qualityScore)],
    ["notes", q(stock.notes)]
  ].map(([key, value]) => `    ${key}: ${value}`).join(",\n")}\n  }`;
}

function parseArgs(argv) {
  const parsed = {};
  const positional = argv.filter((arg) => !String(arg).startsWith("--"));
  if (positional[0] && parsed.limit === undefined) parsed.limit = positional[0];
  if (positional[1] && parsed.delay === undefined) parsed.delay = positional[1];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const [key, inlineValue] = arg.slice(2).split("=", 2);
    parsed[key] = inlineValue ?? argv[index + 1] ?? true;
    if (inlineValue === undefined && argv[index + 1] && !argv[index + 1].startsWith("--")) index += 1;
  }
  return parsed;
}

function numberArg(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function capture(textValue, regex) {
  return textValue.match(regex)?.[1] ?? "";
}

function toYahooSymbol(ticker) {
  return ticker.replace(".", "-");
}

function normalizeSector(sector) {
  if (sector === "Information Technology") return "Technology";
  if (sector === "Health Care") return "Healthcare";
  return sector;
}

function finite(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function percentField(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed * 100 : NaN;
}

function debtToEquityRatio(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return NaN;
  return parsed > 10 ? parsed / 100 : parsed;
}

function valueOrDefault(value, fallback) {
  return Number.isFinite(value) ? round(value) : fallback;
}

function text(value, fallback) {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

function q(value) {
  return JSON.stringify(value);
}

function n(value) {
  return Number.isFinite(value) ? String(round(value)) : "0";
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

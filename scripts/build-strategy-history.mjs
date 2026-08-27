import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { scoreStock } from "../src/lib/scoringCore.js";

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "src", "data", "freeMarketData.ts");
const OUTPUT_FILE = path.join(ROOT, "src", "data", "strategyHistory.json");
const FROM_GIT = process.argv.includes("--from-git");
const HORIZONS = [5, 10, 20, 60];
const THRESHOLDS = [70, 75, 80];

const sources = [];
if (FROM_GIT) {
  const revisions = execFileSync("git", ["log", "--format=%H", "--", "src/data/freeMarketData.ts"], {
    cwd: ROOT, encoding: "utf8"
  }).trim().split(/\r?\n/).filter(Boolean);
  for (const revision of revisions.reverse()) {
    try {
      sources.push(execFileSync("git", ["show", `${revision}:src/data/freeMarketData.ts`], { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));
    } catch (error) {
      console.warn(`Skipping ${revision.slice(0, 8)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
sources.push(fs.readFileSync(DATA_FILE, "utf8"));

const byDay = new Map();
if (!FROM_GIT && fs.existsSync(OUTPUT_FILE)) {
  try {
    const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
    for (const snapshot of existing.snapshots ?? []) byDay.set(snapshot.date, snapshot);
  } catch (error) {
    console.warn(`Could not reuse existing history: ${error instanceof Error ? error.message : String(error)}`);
  }
}
for (const source of sources) {
  const generatedAt = source.match(/freeMarketDataGeneratedAt = "([^"]+)"/)?.[1];
  if (!generatedAt) continue;
  const rows = parseRows(source).filter((stock) => stock.ticker && stock.price > 0).map((stock) => {
    const score = scoreStock(stock);
    return [
      stock.ticker,
      stock.sector,
      round(stock.price),
      score.finalRiskAdjustedValueScore,
      score.valueScore,
      score.valueTrapRiskScore,
      score.dataConfidenceScore,
      round(stock.oneYearDrawdownPercent),
      round(stock.momentumScore)
    ];
  });
  const day = generatedAt.slice(0, 10);
  byDay.set(day, { date: day, generatedAt, rows });
}

const snapshots = [...byDay.values()].sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
const backtests = buildBacktests(snapshots);
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  methodology: {
    signal: "First observed close crossing above the threshold after a prior close below it",
    filters: "Data confidence >= 80 and value-trap risk < 55",
    returns: "Close-to-close forward returns at observed market snapshots; dividends, slippage, taxes and trading costs excluded",
    sectorRelative: "Stock return minus the median same-sector return over the same event window",
    walkForward: "First 70% of eligible entry dates is development history; final 30% is a chronological holdout. The score formula is fixed and not optimized on either split",
    leakageChecks: ["Signal uses only snapshot-t fields", "Forward price is read only from t+h", "First saved snapshot is excluded as left-censored", "Confidence and trap filters are applied before returns are read"],
    caveat: "The history begins when the repository started saving snapshots, so earlier signals are left-censored and excluded"
  },
  horizons: HORIZONS,
  thresholds: THRESHOLDS,
  snapshots,
  backtests
};

fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(output)}\n`);
console.log(`Wrote ${snapshots.length} dated snapshots and ${backtests.reduce((sum, item) => sum + item.eventCount, 0)} threshold/horizon observations to ${path.relative(ROOT, OUTPUT_FILE)}.`);

function parseRows(source) {
  const blocks = source.match(/  \{\r?\n[\s\S]*?\r?\n  \}/g) ?? [];
  return blocks.map((block) => {
    const object = {};
    for (const line of block.split(/\r?\n/).slice(1, -1)) {
      const match = line.match(/^\s+([A-Za-z0-9_]+):\s*(.*?)(?:,)?$/);
      if (!match) continue;
      object[match[1]] = parseValue(match[2]);
    }
    return object;
  });
}

function parseValue(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.startsWith('"') || raw.startsWith("[")) {
    try { return JSON.parse(raw); } catch { return raw.replace(/^"|"$/g, ""); }
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : raw;
}

function buildBacktests(snapshots) {
  const lookup = snapshots.map((snapshot) => new Map(snapshot.rows.map((row) => [row[0], row])));
  const sectorReturnCache = new Map();
  const summaries = [];

  for (const threshold of THRESHOLDS) {
    for (const horizon of HORIZONS) {
      const observations = [];
      for (let index = 1; index + horizon < snapshots.length; index += 1) {
        const currentRows = lookup[index];
        const priorRows = lookup[index - 1];
        const futureRows = lookup[index + horizon];
        for (const row of currentRows.values()) {
          const [ticker, sector, price, final, , trap, confidence] = row;
          const prior = priorRows.get(ticker);
          const future = futureRows.get(ticker);
          if (!prior || !future || prior[3] >= threshold || final < threshold || confidence < 80 || trap >= 55 || price <= 0 || future[2] <= 0) continue;
          const stockReturn = ((future[2] - price) / price) * 100;
          const cacheKey = `${index}:${horizon}:${sector}`;
          let sectorMedian = sectorReturnCache.get(cacheKey);
          if (sectorMedian === undefined) {
            const sectorReturns = [...currentRows.values()].filter((candidate) => candidate[1] === sector && candidate[2] > 0)
              .map((candidate) => {
                const sectorFuture = futureRows.get(candidate[0]);
                return sectorFuture && sectorFuture[2] > 0 ? ((sectorFuture[2] - candidate[2]) / candidate[2]) * 100 : NaN;
              }).filter(Number.isFinite);
            sectorMedian = median(sectorReturns);
            sectorReturnCache.set(cacheKey, sectorMedian);
          }
          observations.push({ ticker, date: snapshots[index].date, index, stockReturn, sectorExcess: stockReturn - sectorMedian });
        }
      }
      const lastEligibleIndex = Math.max(1, snapshots.length - horizon - 1);
      const holdoutStart = Math.max(1, Math.floor(lastEligibleIndex * 0.7));
      const holdout = observations.filter((item) => item.index >= holdoutStart);
      summaries.push({
        threshold,
        horizon,
        eventCount: observations.length,
        medianReturn: round(median(observations.map((item) => item.stockReturn))),
        meanReturn: round(mean(observations.map((item) => item.stockReturn))),
        winRate: round(observations.length ? observations.filter((item) => item.stockReturn > 0).length / observations.length * 100 : 0),
        medianSectorExcess: round(median(observations.map((item) => item.sectorExcess))),
        holdoutEventCount: holdout.length,
        holdoutMedianReturn: round(median(holdout.map((item) => item.stockReturn))),
        holdoutWinRate: round(holdout.length ? holdout.filter((item) => item.stockReturn > 0).length / holdout.length * 100 : 0),
        sampleEvents: observations.slice(-8).reverse().map((item) => ({ ticker: item.ticker, date: item.date, return: round(item.stockReturn) }))
      });
    }
  }
  return summaries;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function mean(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
function round(value) { return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100; }

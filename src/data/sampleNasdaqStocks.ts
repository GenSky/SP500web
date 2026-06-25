import { makeStock } from "./stockFactory";
import type { StockMetric } from "../types";

export const sampleNasdaqStocks: StockMetric[] = [
  makeStock(["AAPL", "Apple", ["NASDAQ_100", "SP500"], "Technology", "Consumer Electronics", 3100000000000, 198, 26, 30, 21, 25, 4.0, 2.1, 6, 8, 1.6, 0.7, 9, 14, "Durable ecosystem, large buyback, slower hardware cycle."]),
  makeStock(["MSFT", "Microsoft", ["NASDAQ_100", "SP500"], "Technology", "Software", 3400000000000, 455, 31, 36, 24, 32, 3.1, 2.3, 13, 14, 0.4, -0.4, 12, 8, "High-quality cloud and AI compounder, rarely optically cheap."]),
  makeStock(["NVDA", "NVIDIA", ["NASDAQ_100", "SP500"], "Technology", "Semiconductors", 2900000000000, 118, 29, 42, 27, 38, 2.6, 1.4, 32, 30, 0.3, -1.0, 18, 24, "AI leader with high expectations and cyclical semiconductor risk."]),
  makeStock(["AMZN", "Amazon", ["NASDAQ_100", "SP500"], "Consumer Discretionary", "Internet Retail", 1900000000000, 183, 34, 44, 19, 28, 3.4, 1.9, 11, 18, 0.6, 0.8, 15, 19, "AWS and advertising support improving free cash flow."]),
  makeStock(["GOOGL", "Alphabet Class A", ["NASDAQ_100", "SP500"], "Communication Services", "Interactive Media", 2100000000000, 171, 19, 24, 14, 19, 5.3, 1.2, 10, 12, 0.1, -2.2, 16, 17, "Cash-rich search and cloud leader with AI disruption debate."]),
  makeStock(["META", "Meta Platforms", ["NASDAQ_100", "SP500"], "Communication Services", "Social Media", 1300000000000, 505, 21, 25, 13, 20, 5.0, 1.3, 11, 13, 0.2, -1.3, 13, 18, "Strong ad cash flow, metaverse spending remains a watch item."]),
  makeStock(["AVGO", "Broadcom", ["NASDAQ_100", "SP500"], "Technology", "Semiconductors", 650000000000, 1420, 24, 31, 19, 24, 4.2, 1.6, 12, 11, 1.5, 2.2, 11, 16, "Semiconductor and infrastructure software cash-flow mix."]),
  makeStock(["COST", "Costco Wholesale", ["NASDAQ_100", "SP500"], "Consumer Staples", "Warehouse Retail", 380000000000, 860, 45, 50, 28, 44, 2.2, 3.1, 7, 8, 0.4, -0.2, 3, 7, "Excellent quality, valuation rarely screens cheap."]),
  makeStock(["ADBE", "Adobe", ["NASDAQ_100", "SP500"], "Technology", "Application Software", 220000000000, 505, 23, 30, 18, 24, 4.1, 1.7, 9, 11, 0.3, -0.7, 14, 28, "Creative software leader with AI monetization questions."]),
  makeStock(["PEP", "PepsiCo", ["NASDAQ_100", "SP500"], "Consumer Staples", "Beverages", 240000000000, 175, 19, 24, 16, 24, 4.1, 2.4, 4, 6, 2.0, 2.6, 8, 13, "Defensive cash flows, leverage higher than ideal."]),
  makeStock(["CSCO", "Cisco Systems", ["NASDAQ_100", "SP500"], "Technology", "Networking", 195000000000, 49, 12, 16, 9, 13, 7.7, 1.8, 2, 4, 0.4, -0.5, 12, 20, "Cheap mature networking franchise with low growth."]),
  makeStock(["NFLX", "Netflix", ["NASDAQ_100", "SP500"], "Communication Services", "Streaming", 280000000000, 650, 27, 35, 22, 29, 3.0, 1.6, 12, 17, 0.7, 1.2, 10, 15, "Scale streaming leader with improving ad tier economics."]),
  makeStock(["AMD", "Advanced Micro Devices", ["NASDAQ_100", "SP500"], "Technology", "Semiconductors", 260000000000, 160, 31, 55, 28, 42, 2.4, 1.5, 18, 24, 0.1, -0.6, 22, 34, "AI accelerator optionality, valuation depends on ramp."]),
  makeStock(["INTC", "Intel", ["NASDAQ_100", "SP500"], "Technology", "Semiconductors", 140000000000, 32, 18, 80, 12, -18, -5.5, 2.8, 3, -5, 0.5, 1.7, 20, 48, "Turnaround manufacturing story with negative FCF risk."]),
  makeStock(["QCOM", "Qualcomm", ["NASDAQ_100", "SP500"], "Technology", "Semiconductors", 190000000000, 170, 14, 19, 11, 15, 6.6, 1.2, 6, 8, 0.7, 0.3, 13, 22, "Handset exposure but strong licensing cash flow."]),
  makeStock(["TXN", "Texas Instruments", ["NASDAQ_100", "SP500"], "Technology", "Analog Semiconductors", 175000000000, 190, 25, 29, 20, 33, 3.0, 2.4, 5, 6, 0.8, 1.1, 7, 18, "High-quality analog franchise, capex cycle weighs on FCF."]),
  makeStock(["AMGN", "Amgen", ["NASDAQ_100", "SP500"], "Healthcare", "Biotechnology", 165000000000, 305, 14, 20, 12, 16, 6.2, 1.9, 4, 6, 6.5, 3.4, 10, 16, "Cheap healthcare cash flows, high leverage after deals."]),
  makeStock(["HON", "Honeywell", ["NASDAQ_100", "SP500"], "Industrials", "Industrial Conglomerates", 135000000000, 208, 18, 23, 14, 19, 5.2, 1.8, 5, 8, 1.3, 1.9, 9, 12, "Quality industrial with moderate growth."]),
  makeStock(["SBUX", "Starbucks", ["NASDAQ_100", "SP500"], "Consumer Discretionary", "Restaurants", 90000000000, 80, 19, 24, 15, 21, 4.8, 1.7, 4, 7, 3.1, 2.8, 18, 30, "Brand turnaround with China and traffic risk."]),
  makeStock(["PYPL", "PayPal", ["NASDAQ_100", "SP500"], "Financials", "Payments", 65000000000, 65, 12, 15, 9, 11, 9.1, 1.1, 6, 8, 0.5, -0.3, 24, 42, "Deep value payments name with competitive pressure."])
];
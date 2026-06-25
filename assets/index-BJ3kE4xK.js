(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const c of s.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function a(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(n){if(n.ep)return;n.ep=!0;const s=a(n);fetch(n.href,s)}})();const z={ticker:"ticker",symbol:"ticker",company:"companyName",companyname:"companyName",name:"companyName",sector:"sector",industry:"industry",marketcap:"marketCap",price:"price",forwardpe:"forwardPE",trailingpe:"trailingPE",evtoebitda:"evToEbitda",pricetofreecashflow:"priceToFreeCashFlow",fcfyield:"freeCashFlowYield",freecashflowyield:"freeCashFlowYield",pegratio:"pegRatio",revenuegrowth:"revenueGrowthEstimate",revenuegrowthestimate:"revenueGrowthEstimate",epsgrowth:"epsGrowthEstimate",epsgrowthestimate:"epsGrowthEstimate",debttoequity:"debtToEquity",netdebttoebitda:"netDebtToEbitda",analystupside:"analystUpsidePercent",analystupsidepercent:"analystUpsidePercent",drawdown:"oneYearDrawdownPercent",oneyeardrawdownpercent:"oneYearDrawdownPercent",momentum:"momentumScore",momentumscore:"momentumScore",quality:"qualityScore",qualityscore:"qualityScore",notes:"notes"};function K(e){const t=e.split(/\r?\n/).map(c=>c.trim()).filter(Boolean);if(t.length<2)return{stocks:[],errors:["Paste a header row and at least one stock row."]};const r=O(t[0]).map(X).map(c=>z[c]),n=[],s=[];return t.slice(1).forEach((c,y)=>{const f=O(c),l={};r.forEach((g,w)=>{g&&(l[g]=f[w]??"")});const d=String(l.ticker||"").trim().toUpperCase();if(!d){n.push(`Row ${y+2}: missing ticker.`);return}s.push({ticker:d,companyName:R(l.companyName,d),indexMembership:[],sector:R(l.sector,"Custom"),industry:R(l.industry,"Imported"),marketCap:u(l.marketCap,0),price:u(l.price,0),forwardPE:u(l.forwardPE,18),trailingPE:u(l.trailingPE,22),evToEbitda:u(l.evToEbitda,12),priceToFreeCashFlow:u(l.priceToFreeCashFlow,18),freeCashFlowYield:u(l.freeCashFlowYield,4),pegRatio:u(l.pegRatio,1.8),revenueGrowthEstimate:u(l.revenueGrowthEstimate,4),epsGrowthEstimate:u(l.epsGrowthEstimate,6),debtToEquity:u(l.debtToEquity,1),netDebtToEbitda:u(l.netDebtToEbitda,2),analystUpsidePercent:u(l.analystUpsidePercent,8),oneYearDrawdownPercent:u(l.oneYearDrawdownPercent,12),momentumScore:u(l.momentumScore,50),qualityScore:u(l.qualityScore,55),notes:R(l.notes,"Imported CSV watchlist stock")})}),{stocks:s,errors:n}}function X(e){return e.toLowerCase().replace(/[^a-z0-9]/g,"")}function O(e){const t=[];let a="",r=!1;for(let n=0;n<e.length;n+=1){const s=e[n],c=e[n+1];s==='"'&&c==='"'?(a+='"',n+=1):s==='"'?r=!r:s===","&&!r?(t.push(a.trim()),a=""):a+=s}return t.push(a.trim()),t}function u(e,t){const a=Number(String(e??"").replace(/[$,%]/g,""));return Number.isFinite(a)?a:t}function R(e,t){return String(e??"").trim()||t}const Z=["Legacy Telecom","Broadcasting","Department Stores","Office REITs","Commodity Chemicals"],ee=new Set(["Energy","Materials","Industrials","Consumer Discretionary","Real Estate"]),p=(e,t=0,a=100)=>Math.min(a,Math.max(t,e)),A=(e,t,a)=>Number.isFinite(e)?p((a-e)/(a-t)*100):45,b=(e,t,a)=>Number.isFinite(e)?p((e-t)/(a-t)*100):45;function te(e){const t=I([A(e.forwardPE,7,30),A(e.trailingPE,8,38),A(e.evToEbitda,5,24),A(e.priceToFreeCashFlow,5,36),b(e.freeCashFlowYield,-4,10),A(e.pegRatio,.5,3.2),b(e.analystUpsidePercent,-10,35),b(e.oneYearDrawdownPercent,0,45)]),a=p((e.debtToEquity-1.2)*12+(e.netDebtToEbitda-2.5)*8,0,22),r=e.freeCashFlowYield<0?p(Math.abs(e.freeCashFlowYield)*3+12,12,28):0,n=e.revenueGrowthEstimate<0?p(Math.abs(e.revenueGrowthEstimate)*2.2+8,8,24):0,s=e.epsGrowthEstimate<0?p(Math.abs(e.epsGrowthEstimate)*1.8+7,7,22):e.epsGrowthEstimate<4?6:0,c=ee.has(e.sector)?4:0,y=ae(e,t),f=p(y*.22,0,24),l=p(t-a-r-n-s-c-f),d=p(100-(e.debtToEquity*18+e.netDebtToEbitda*14)),g=I([b(e.revenueGrowthEstimate,-8,22),b(e.epsGrowthEstimate,-10,28),A(e.pegRatio,.5,3)]),w=I([p(e.momentumScore),b(e.oneYearDrawdownPercent,0,40),b(e.analystUpsidePercent,-5,35)]),T=p(e.qualityScore),E=p(l*.36+T*.18+d*.16+g*.14+w*.16-y*.28);return{valueScore:m(l),qualityScore:m(T),balanceSheetScore:m(d),growthScore:m(g),momentumSetupScore:m(w),valueTrapRiskScore:m(y),finalRiskAdjustedValueScore:m(E),debtRisk:m(p(100-d)),category:re(l,T,g,w,y,e),penalties:{highDebtPenalty:m(a),negativeFreeCashFlowPenalty:m(r),decliningRevenuePenalty:m(n),weakEarningsGrowthPenalty:m(s),valueTrapPenalty:m(f),cyclicalBusinessPenalty:m(c)}}}function ae(e,t){let a=8;const r=t>68||e.forwardPE<13||e.priceToFreeCashFlow<12;return r&&e.revenueGrowthEstimate<0&&(a+=20),e.freeCashFlowYield<0?a+=22:e.freeCashFlowYield<2.5&&(a+=10),e.debtToEquity>1.6&&(a+=12),e.netDebtToEbitda>3&&(a+=14),e.epsGrowthEstimate<0&&(a+=16),e.oneYearDrawdownPercent>35&&e.momentumScore<45&&(a+=16),Z.some(n=>e.industry.includes(n))&&(a+=14),r&&e.qualityScore<55&&(a+=8),p(a)}function re(e,t,a,r,n,s){return n>=72?"Avoid / possible trap":n>=52||s.debtToEquity>2.2||s.netDebtToEbitda>4?"Cheap but risky":e>=78&&t>=72&&n<38?"Quality value":e>=84&&s.oneYearDrawdownPercent>=18?"Deep value":e>=62&&a<48&&r>=48?"Turnaround":t>=65?"Quality value":"Cheap but risky"}function I(e){return e.reduce((t,a)=>t+a,0)/e.length}function m(e){return Math.round(e*10)/10}const B="gensky.valuePicker.customStocks.v1",H="gensky.valuePicker.trackedTrades.v2";function ie(){return Y(B,[])}function G(e){localStorage.setItem(B,JSON.stringify(e))}function ne(){return Y(H,[])}function U(e){localStorage.setItem(H,JSON.stringify(e))}function Y(e,t){try{const a=localStorage.getItem(e);return a?JSON.parse(a):t}catch{return t}}function se(e){const t=e.indexMembership.includes("SP500"),a=e.qualityScore>=72&&e.balanceSheetScore>=65,r=e.valueScore>=68||e.finalRiskAdjustedValueScore>=64,n=e.valueTrapRiskScore<38,s=e.valueTrapRiskScore>=70,c=e.momentumSetupScore<52||e.oneYearDrawdownPercent>22,y=e.analystUpsidePercent>=14,f=e.valueScore>=82,l=e.debtRisk>58||e.growthScore<42;let d;return s?d="Avoid":t&&a&&r&&n?d="Long shares / LEAPS":r&&c&&e.valueTrapRiskScore<62?d="Cash-secured put":y&&!f&&e.valueTrapRiskScore<55?d="Bull call spread":l?d="Watchlist only":r&&a?d="Long shares / LEAPS":d="Watchlist only",{action:d,why:oe(e,d)}}function oe(e,t){return`${t}: valuation score ${e.valueScore}/100 with forward P/E ${e.forwardPE} and FCF yield ${e.freeCashFlowYield}%. Balance sheet score ${e.balanceSheetScore}/100 reflects debt/equity ${e.debtToEquity} and net debt/EBITDA ${e.netDebtToEbitda}. Growth score ${e.growthScore}/100 uses revenue growth ${e.revenueGrowthEstimate}% and EPS growth ${e.epsGrowthEstimate}%. Free cash flow is ${e.freeCashFlowYield>=0?"positive":"negative"}. Momentum setup is ${e.momentumSetupScore}/100 after a ${e.oneYearDrawdownPercent}% one-year drawdown, while downside and value trap risk are captured by trap score ${e.valueTrapRiskScore}/100.`}function i(e){const[t,a,r,n,s,c,y,f,l,d,g,w,T,E,F,x,L,W,q,J]=e;return{ticker:t,companyName:a,indexMembership:r,sector:n,industry:s,marketCap:c,price:y,forwardPE:f,trailingPE:l,evToEbitda:d,priceToFreeCashFlow:g,freeCashFlowYield:w,pegRatio:T,revenueGrowthEstimate:E,epsGrowthEstimate:F,debtToEquity:x,netDebtToEbitda:L,analystUpsidePercent:W,oneYearDrawdownPercent:q,momentumScore:Math.max(15,Math.min(92,66-q*.55+E*.8+F*.35)),qualityScore:Math.max(22,Math.min(96,76+w*1.2-x*5-Math.max(0,L-1.5)*4+E*.35)),notes:J}}const le=[i(["AAPL","Apple",["NASDAQ_100","SP500"],"Technology","Consumer Electronics",31e11,198,26,30,21,25,4,2.1,6,8,1.6,.7,9,14,"Durable ecosystem, large buyback, slower hardware cycle."]),i(["MSFT","Microsoft",["NASDAQ_100","SP500"],"Technology","Software",34e11,455,31,36,24,32,3.1,2.3,13,14,.4,-.4,12,8,"High-quality cloud and AI compounder, rarely optically cheap."]),i(["NVDA","NVIDIA",["NASDAQ_100","SP500"],"Technology","Semiconductors",29e11,118,29,42,27,38,2.6,1.4,32,30,.3,-1,18,24,"AI leader with high expectations and cyclical semiconductor risk."]),i(["AMZN","Amazon",["NASDAQ_100","SP500"],"Consumer Discretionary","Internet Retail",19e11,183,34,44,19,28,3.4,1.9,11,18,.6,.8,15,19,"AWS and advertising support improving free cash flow."]),i(["GOOGL","Alphabet Class A",["NASDAQ_100","SP500"],"Communication Services","Interactive Media",21e11,171,19,24,14,19,5.3,1.2,10,12,.1,-2.2,16,17,"Cash-rich search and cloud leader with AI disruption debate."]),i(["META","Meta Platforms",["NASDAQ_100","SP500"],"Communication Services","Social Media",13e11,505,21,25,13,20,5,1.3,11,13,.2,-1.3,13,18,"Strong ad cash flow, metaverse spending remains a watch item."]),i(["AVGO","Broadcom",["NASDAQ_100","SP500"],"Technology","Semiconductors",65e10,1420,24,31,19,24,4.2,1.6,12,11,1.5,2.2,11,16,"Semiconductor and infrastructure software cash-flow mix."]),i(["COST","Costco Wholesale",["NASDAQ_100","SP500"],"Consumer Staples","Warehouse Retail",38e10,860,45,50,28,44,2.2,3.1,7,8,.4,-.2,3,7,"Excellent quality, valuation rarely screens cheap."]),i(["ADBE","Adobe",["NASDAQ_100","SP500"],"Technology","Application Software",22e10,505,23,30,18,24,4.1,1.7,9,11,.3,-.7,14,28,"Creative software leader with AI monetization questions."]),i(["PEP","PepsiCo",["NASDAQ_100","SP500"],"Consumer Staples","Beverages",24e10,175,19,24,16,24,4.1,2.4,4,6,2,2.6,8,13,"Defensive cash flows, leverage higher than ideal."]),i(["CSCO","Cisco Systems",["NASDAQ_100","SP500"],"Technology","Networking",195e9,49,12,16,9,13,7.7,1.8,2,4,.4,-.5,12,20,"Cheap mature networking franchise with low growth."]),i(["NFLX","Netflix",["NASDAQ_100","SP500"],"Communication Services","Streaming",28e10,650,27,35,22,29,3,1.6,12,17,.7,1.2,10,15,"Scale streaming leader with improving ad tier economics."]),i(["AMD","Advanced Micro Devices",["NASDAQ_100","SP500"],"Technology","Semiconductors",26e10,160,31,55,28,42,2.4,1.5,18,24,.1,-.6,22,34,"AI accelerator optionality, valuation depends on ramp."]),i(["INTC","Intel",["NASDAQ_100","SP500"],"Technology","Semiconductors",14e10,32,18,80,12,-18,-5.5,2.8,3,-5,.5,1.7,20,48,"Turnaround manufacturing story with negative FCF risk."]),i(["QCOM","Qualcomm",["NASDAQ_100","SP500"],"Technology","Semiconductors",19e10,170,14,19,11,15,6.6,1.2,6,8,.7,.3,13,22,"Handset exposure but strong licensing cash flow."]),i(["TXN","Texas Instruments",["NASDAQ_100","SP500"],"Technology","Analog Semiconductors",175e9,190,25,29,20,33,3,2.4,5,6,.8,1.1,7,18,"High-quality analog franchise, capex cycle weighs on FCF."]),i(["AMGN","Amgen",["NASDAQ_100","SP500"],"Healthcare","Biotechnology",165e9,305,14,20,12,16,6.2,1.9,4,6,6.5,3.4,10,16,"Cheap healthcare cash flows, high leverage after deals."]),i(["HON","Honeywell",["NASDAQ_100","SP500"],"Industrials","Industrial Conglomerates",135e9,208,18,23,14,19,5.2,1.8,5,8,1.3,1.9,9,12,"Quality industrial with moderate growth."]),i(["SBUX","Starbucks",["NASDAQ_100","SP500"],"Consumer Discretionary","Restaurants",9e10,80,19,24,15,21,4.8,1.7,4,7,3.1,2.8,18,30,"Brand turnaround with China and traffic risk."]),i(["PYPL","PayPal",["NASDAQ_100","SP500"],"Financials","Payments",65e9,65,12,15,9,11,9.1,1.1,6,8,.5,-.3,24,42,"Deep value payments name with competitive pressure."])],ce=[i(["AAPL","Apple",["NASDAQ_100","SP500"],"Technology","Consumer Electronics",31e11,198,26,30,21,25,4,2.1,6,8,1.6,.7,9,14,"SP500 mega-cap technology sample."]),i(["MSFT","Microsoft",["NASDAQ_100","SP500"],"Technology","Software",34e11,455,31,36,24,32,3.1,2.3,13,14,.4,-.4,12,8,"High-quality enterprise software sample."]),i(["NVDA","NVIDIA",["NASDAQ_100","SP500"],"Technology","Semiconductors",29e11,118,29,42,27,38,2.6,1.4,32,30,.3,-1,18,24,"AI semiconductor leader sample."]),i(["ORCL","Oracle",["SP500"],"Technology","Software",36e10,138,20,26,16,22,4.6,1.5,8,10,5.4,3.6,8,13,"Cloud transition with elevated leverage."]),i(["CRM","Salesforce",["SP500"],"Technology","Application Software",255e9,262,24,32,18,23,4.3,1.6,9,12,.2,-1.8,16,27,"Margins improving, growth normalized."]),i(["IBM","IBM",["SP500"],"Technology","IT Consulting",17e10,185,16,22,12,18,5.5,1.8,4,6,2.3,2.7,6,9,"Defensive tech value with consulting cyclicality."]),i(["GOOGL","Alphabet Class A",["NASDAQ_100","SP500"],"Communication Services","Interactive Media",21e11,171,19,24,14,19,5.3,1.2,10,12,.1,-2.2,16,17,"Search and cloud cash-flow leader."]),i(["META","Meta Platforms",["NASDAQ_100","SP500"],"Communication Services","Social Media",13e11,505,21,25,13,20,5,1.3,11,13,.2,-1.3,13,18,"Advertising platform with strong free cash flow."]),i(["DIS","Walt Disney",["SP500"],"Communication Services","Entertainment",185e9,102,18,28,12,18,5.4,1.5,5,9,.6,1.1,19,25,"Media turnaround and parks resilience."]),i(["VZ","Verizon",["SP500"],"Communication Services","Legacy Telecom",165e9,39,9,13,7,9,11.1,2.5,-1,1,1.7,2.8,10,20,"Cheap dividend telecom with structural growth pressure."]),i(["CMCSA","Comcast",["SP500"],"Communication Services","Cable & Media",15e10,38,10,12,7,8,12.5,1.6,-2,1,1,2.1,15,28,"Cheap cable media name, broadband growth challenged."]),i(["AMZN","Amazon",["NASDAQ_100","SP500"],"Consumer Discretionary","Internet Retail",19e11,183,34,44,19,28,3.4,1.9,11,18,.6,.8,15,19,"AWS and advertising support margins."]),i(["TSLA","Tesla",["NASDAQ_100","SP500"],"Consumer Discretionary","Automobiles",72e10,230,55,70,36,58,1.7,3.4,9,12,.2,-.6,11,45,"High optionality, valuation and cyclicality risk."]),i(["HD","Home Depot",["SP500"],"Consumer Discretionary","Home Improvement Retail",33e10,335,20,22,15,23,4.4,2.1,3,6,8.8,2.3,12,18,"Quality retailer, housing cycle sensitivity."]),i(["MCD","McDonald's",["SP500"],"Consumer Discretionary","Restaurants",21e10,292,22,25,18,25,4,2.3,5,7,5.1,2.9,6,10,"Defensive restaurant compounder, leveraged balance sheet."]),i(["LOW","Lowe's",["SP500"],"Consumer Discretionary","Home Improvement Retail",135e9,238,17,20,13,18,5.6,1.8,2,6,12,2.4,14,21,"Housing-linked value candidate with high accounting leverage."]),i(["NKE","Nike",["SP500"],"Consumer Discretionary","Apparel",115e9,78,21,27,16,24,4.1,2.2,1,4,.8,.6,20,38,"Brand turnaround with growth reset."]),i(["PG","Procter & Gamble",["SP500"],"Consumer Staples","Household Products",39e10,165,23,26,18,27,3.7,2.7,4,6,.7,.9,5,8,"Defensive staples quality, limited upside."]),i(["KO","Coca-Cola",["SP500"],"Consumer Staples","Beverages",27e10,62,21,25,18,25,4,2.5,4,6,1.6,2,7,9,"Global beverage compounder with moderate leverage."]),i(["WMT","Walmart",["SP500"],"Consumer Staples","Discount Retail",52e10,65,25,30,15,28,3.6,2.1,5,7,.7,.8,6,6,"Scale retailer with steady traffic."]),i(["COST","Costco Wholesale",["NASDAQ_100","SP500"],"Consumer Staples","Warehouse Retail",38e10,860,45,50,28,44,2.2,3.1,7,8,.4,-.2,3,7,"Excellent quality, expensive valuation."]),i(["MO","Altria",["SP500"],"Consumer Staples","Tobacco",72e9,43,9,10,8,9,11.4,1.5,-1,2,8.5,2.6,5,16,"Cheap but structurally challenged tobacco cash flow."]),i(["JPM","JPMorgan Chase",["SP500"],"Financials","Diversified Banks",56e10,198,12,13,0,0,0,1.2,4,5,1.4,0,10,10,"High-quality bank, valuation metrics differ from industrials."]),i(["BAC","Bank of America",["SP500"],"Financials","Diversified Banks",305e9,39,11,12,0,0,0,1.3,3,4,1.8,0,14,17,"Rate-sensitive bank value candidate."]),i(["BRK-B","Berkshire Hathaway Class B",["SP500"],"Financials","Insurance & Holding Company",88e10,410,18,21,12,18,5.5,1.6,5,6,.2,-5,6,6,"Cash-rich quality value benchmark."]),i(["V","Visa",["SP500"],"Financials","Payments",56e10,280,25,30,22,28,3.5,1.8,9,11,.6,-.8,9,9,"High-quality payments, premium valuation."]),i(["AXP","American Express",["SP500"],"Financials","Consumer Finance",18e10,252,16,18,0,0,0,1.4,7,9,1.9,0,8,11,"Premium card network with credit-cycle exposure."]),i(["JNJ","Johnson & Johnson",["SP500"],"Healthcare","Pharmaceuticals",37e10,154,15,18,12,17,5.9,2,3,5,.6,.4,11,16,"Defensive healthcare with litigation overhang."]),i(["UNH","UnitedHealth Group",["SP500"],"Healthcare","Managed Care",47e10,510,17,20,13,18,5.6,1.5,7,10,.8,.9,18,22,"Managed care leader with policy risk."]),i(["LLY","Eli Lilly",["SP500"],"Healthcare","Pharmaceuticals",82e10,860,46,62,38,60,1.7,2,22,28,1.8,1.5,7,10,"GLP-1 growth leader with premium valuation."]),i(["PFE","Pfizer",["SP500"],"Healthcare","Pharmaceuticals",155e9,27,10,16,8,12,8.3,1.2,-2,3,.9,1.8,22,36,"Post-COVID reset creates value/turnaround setup."]),i(["ABT","Abbott Laboratories",["SP500"],"Healthcare","Medical Devices",19e10,110,21,25,17,24,4.1,2,5,8,.4,.2,10,15,"Quality healthcare devices and diagnostics."]),i(["GE","GE Aerospace",["SP500"],"Industrials","Aerospace",175e9,160,28,36,20,30,3.3,1.8,9,15,.9,.4,7,11,"Aerospace quality with cyclical aftermarket exposure."]),i(["CAT","Caterpillar",["SP500"],"Industrials","Machinery",165e9,340,15,17,12,15,6.7,1.2,2,5,1.9,1.5,6,18,"Cyclical machinery value with high margins."]),i(["UPS","UPS",["SP500"],"Industrials","Air Freight & Logistics",12e10,140,15,19,11,17,5.8,1.7,1,5,1.5,2,16,30,"Logistics downturn recovery candidate."]),i(["DE","Deere",["SP500"],"Industrials","Agricultural Machinery",115e9,410,13,15,10,13,7.8,1.1,0,3,2.2,2.8,10,22,"Cyclical agriculture equipment franchise."]),i(["LMT","Lockheed Martin",["SP500"],"Industrials","Defense",11e10,465,17,19,13,18,5.4,1.9,4,5,1.8,1.6,9,12,"Defense cash flows with budget visibility."]),i(["XOM","Exxon Mobil",["SP500"],"Energy","Integrated Oil & Gas",46e10,115,12,14,7,10,10,1.1,2,3,.2,-.8,12,19,"Commodity cash flow, strong balance sheet."]),i(["CVX","Chevron",["SP500"],"Energy","Integrated Oil & Gas",29e10,155,11,13,7,10,10.2,1.2,1,3,.2,-.5,10,18,"Integrated energy value with commodity sensitivity."]),i(["COP","ConocoPhillips",["SP500"],"Energy","Exploration & Production",14e10,118,10,12,6,9,11.1,1,2,4,.4,.2,13,24,"Upstream cash flow leverage to oil prices."]),i(["SLB","SLB",["SP500"],"Energy","Oilfield Services",65e9,44,13,16,9,14,7.1,1.1,5,8,.7,.6,18,32,"Oilfield services recovery with cyclicality."]),i(["NEE","NextEra Energy",["SP500"],"Utilities","Electric Utilities",15e10,73,20,24,14,28,3.6,2.1,6,7,1.4,4,12,28,"Renewables utility, rate sensitivity and leverage."]),i(["DUK","Duke Energy",["SP500"],"Utilities","Electric Utilities",76e9,98,16,19,12,20,5,2.6,4,5,1.6,5,8,11,"Regulated utility with high debt load."]),i(["SO","Southern Company",["SP500"],"Utilities","Electric Utilities",85e9,78,18,21,13,22,4.5,2.4,4,5,1.7,5.1,6,9,"Defensive utility, leverage constrains score."]),i(["AMT","American Tower",["SP500"],"Real Estate","Telecom REITs",95e9,205,31,45,19,26,3.8,2.3,4,5,3.2,5.6,15,34,"Tower REIT with rate and leverage pressure."]),i(["PLD","Prologis",["SP500"],"Real Estate","Industrial REITs",105e9,114,32,48,22,30,3.3,2.5,5,6,.8,4.2,18,26,"High-quality logistics real estate, rate-sensitive."]),i(["O","Realty Income",["SP500"],"Real Estate","Retail REITs",46e9,55,28,42,17,24,4.2,2.2,3,4,.7,5,12,20,"Monthly dividend REIT, debt and rates matter."]),i(["BXP","BXP",["SP500"],"Real Estate","Office REITs",12e9,66,20,34,13,16,6.2,1.6,-3,-1,1.9,6.4,24,44,"Office REIT value trap risk sample."]),i(["LIN","Linde",["SP500"],"Materials","Industrial Gases",21e10,430,27,32,20,29,3.4,2.2,6,8,.5,.7,6,8,"High-quality materials compounder, not cheap."]),i(["SHW","Sherwin-Williams",["SP500"],"Materials","Specialty Chemicals",8e10,305,24,30,18,28,3.6,2.1,5,8,2.9,2.6,9,15,"Paint leader with housing cycle exposure."]),i(["FCX","Freeport-McMoRan",["SP500"],"Materials","Copper Mining",7e10,48,17,22,9,13,7.7,1.3,4,9,.5,.7,19,29,"Copper cycle upside with commodity volatility."]),i(["NEM","Newmont",["SP500"],"Materials","Gold Mining",42e9,38,15,24,8,14,7.1,1.4,1,6,.4,1,17,35,"Gold miner value with execution and commodity risk."]),i(["DOW","Dow",["SP500"],"Materials","Commodity Chemicals",36e9,54,13,18,8,11,9.1,1.6,-2,2,.9,2.4,16,31,"Cheap cyclical chemicals with structural pressure."])];function de(e){const t=new Map;for(const a of[...le,...ce,...e]){const r=t.get(a.ticker);if(!r){t.set(a.ticker,a);continue}t.set(a.ticker,{...r,...a,indexMembership:Array.from(new Set([...r.indexMembership,...a.indexMembership]))})}return Array.from(t.values())}function M(e,t){return t==="ALL"?e:t==="CUSTOM"?e.filter(a=>a.indexMembership.length===0):e.filter(a=>a.indexMembership.includes(t))}function ue(e){return e.indexMembership.length===0?"CUSTOM":e.indexMembership.join(" + ")}const j=document.querySelector("#app");if(!j)throw new Error("#app root not found");const me=j;let P=ie(),v=ne(),o={universe:"NASDAQ_100",sector:"All",minValueScore:0,maxDebtRisk:100,positiveFcfOnly:!1,minAnalystUpside:0,minDrawdown:0,avoidValueTraps:!0};h();function h(){var n;const e=de(P),t=pe(e),a=he(t,o).sort((s,c)=>c.finalRiskAdjustedValueScore-s.finalRiskAdjustedValueScore),r=["All",...Array.from(new Set(t.map(s=>s.sector))).sort()];me.innerHTML=`
    <header class="app-shell">
      <nav class="topbar" aria-label="Primary navigation">
        <a class="brand" href="#top" aria-label="Gensky Value Picker home">
          <span class="brand-mark">GV</span>
          <span><strong>Gensky Value Picker</strong><small>Research and paper tracking only</small></span>
        </a>
        <div class="top-actions">
          <a href="#best-ideas">Best Ideas</a>
          <a href="#tracker">Tracker</a>
          <a href="#csv-import">CSV Import</a>
        </div>
      </nav>
      <section class="hero" id="top">
        <div>
          <p class="eyebrow">Stock universe</p>
          <h1>Rank value ideas across Nasdaq-100, S&P 500, custom watchlists, and the combined market list.</h1>
          <p class="warning">Sample data only. Replace with fresh market data before making real decisions.</p>
        </div>
        <div class="universe-panel">
          <label for="universe-select">Universe</label>
          <select id="universe-select">
            ${D("NASDAQ_100","Nasdaq-100",o.universe)}
            ${D("SP500","S&P 500",o.universe)}
            ${D("CUSTOM","Custom Watchlist",o.universe)}
            ${D("ALL","All Stocks Combined",o.universe)}
          </select>
          <div class="universe-stats">
            <span>${M(t,"NASDAQ_100").length}<small>Nasdaq-100</small></span>
            <span>${M(t,"SP500").length}<small>S&P 500</small></span>
            <span>${M(t,"CUSTOM").length}<small>Custom</small></span>
            <span>${t.length}<small>Combined</small></span>
          </div>
        </div>
      </section>
    </header>

    <main>
      <section class="section filters" aria-label="Filters">
        <label>Sector<select id="sector-filter">${r.map(s=>D(s,s,o.sector)).join("")}</select></label>
        <label>Minimum value score<input id="min-value-score" type="number" min="0" max="100" value="${o.minValueScore}"></label>
        <label>Maximum debt risk<input id="max-debt-risk" type="number" min="0" max="100" value="${o.maxDebtRisk}"></label>
        <label>Analyst upside greater than<input id="min-upside" type="number" min="0" max="100" value="${o.minAnalystUpside}"></label>
        <label>Drawdown greater than<input id="min-drawdown" type="number" min="0" max="100" value="${o.minDrawdown}"></label>
        <label class="checkbox"><input id="positive-fcf" type="checkbox" ${o.positiveFcfOnly?"checked":""}> Positive FCF only</label>
        <label class="checkbox"><input id="avoid-traps" type="checkbox" ${o.avoidValueTraps?"checked":""}> Avoid value traps</label>
      </section>

      <section class="section score-summary" aria-label="Score outputs">
        ${N("Visible ideas",a.length.toString(),"After universe and filter rules")}
        ${N("Top final score",S((n=a[0])==null?void 0:n.finalRiskAdjustedValueScore),"Ranked by risk-adjusted value")}
        ${N("Median trap risk",S(Pe(a.map(s=>s.valueTrapRiskScore))),"0 is lower risk, 100 is highest")}
        ${N("Tracked trades",v.length.toString(),"Stored in localStorage with universe")}
      </section>

      <section class="section" id="rankings">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Rankings</p>
            <h2>${be(o.universe)}</h2>
          </div>
          <p>Default sort: Final Risk-Adjusted Value Score.</p>
        </div>
        <div class="score-key">
          <span>Value Score</span>
          <span>Quality Score</span>
          <span>Balance Sheet Score</span>
          <span>Growth Score</span>
          <span>Momentum Setup Score</span>
          <span>Value Trap Risk Score</span>
          <span>Final Risk-Adjusted Value Score</span>
        </div>
        ${ye(a)}
      </section>

      <section class="section best-ideas" id="best-ideas">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Best Ideas</p>
            <h2>Shortlists by universe, safety, upside, and trap risk.</h2>
          </div>
        </div>
        <div class="idea-grid">
          ${C("Best Nasdaq-100 ideas",V(t,"NASDAQ_100"))}
          ${C("Best S&P 500 ideas",V(t,"SP500"))}
          ${C("Best overall ideas",t.slice().sort($).slice(0,5))}
          ${C("Safest value ideas",t.filter(s=>s.valueScore>=60&&s.valueTrapRiskScore<35).sort($).slice(0,5))}
          ${C("Highest upside risky ideas",t.filter(s=>s.analystUpsidePercent>=15).sort((s,c)=>c.analystUpsidePercent-s.analystUpsidePercent).slice(0,5))}
          ${C("Avoid list / value traps",t.filter(s=>s.valueTrapRiskScore>=65).sort((s,c)=>c.valueTrapRiskScore-s.valueTrapRiskScore).slice(0,5))}
        </div>
      </section>

      <section class="section sector-rankings">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">By sector</p>
            <h2>Top undervalued stocks by sector.</h2>
          </div>
        </div>
        <div class="sector-grid">${fe(t)}</div>
      </section>

      <section class="section" id="tracker">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Paper tracker</p>
            <h2>Tracked trades store their source universe.</h2>
          </div>
        </div>
        ${ve()}
      </section>

      <section class="section csv-section" id="csv-import">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">CSV import</p>
            <h2>Paste a custom watchlist.</h2>
          </div>
          <p>Accepted headers include ticker, company, sector, price, forwardPE, freeCashFlowYield, revenueGrowth, epsGrowth, debtToEquity, analystUpside, drawdown, notes.</p>
        </div>
        <textarea id="csv-text" rows="8" spellcheck="false" placeholder="ticker,company,sector,price,forwardPE,freeCashFlowYield,revenueGrowth,epsGrowth,debtToEquity,analystUpside,drawdown,notes"></textarea>
        <div class="csv-actions">
          <button id="import-csv" type="button">Import to Custom Watchlist</button>
          <button id="clear-custom" type="button">Clear Custom Watchlist</button>
          <span id="csv-status">${P.length} custom stocks saved</span>
        </div>
      </section>
    </main>
  `,Se(t)}function pe(e){return e.map(t=>{const a=te(t),r={...t,...a,tradeIdea:{action:"Watchlist only",why:""}};return{...r,tradeIdea:se(r)}})}function he(e,t){return M(e,t.universe).filter(a=>t.sector==="All"||a.sector===t.sector).filter(a=>a.valueScore>=t.minValueScore).filter(a=>a.debtRisk<=t.maxDebtRisk).filter(a=>!t.positiveFcfOnly||a.freeCashFlowYield>0).filter(a=>a.analystUpsidePercent>=t.minAnalystUpside).filter(a=>a.oneYearDrawdownPercent>=t.minDrawdown).filter(a=>!t.avoidValueTraps||a.valueTrapRiskScore<70)}function Se(e){var t,a;Q("universe-select",r=>{o={...o,universe:r},h()}),Q("sector-filter",r=>{o={...o,sector:r},h()}),k("min-value-score",r=>{o={...o,minValueScore:r},h()}),k("max-debt-risk",r=>{o={...o,maxDebtRisk:r},h()}),k("min-upside",r=>{o={...o,minAnalystUpside:r},h()}),k("min-drawdown",r=>{o={...o,minDrawdown:r},h()}),_("positive-fcf",r=>{o={...o,positiveFcfOnly:r},h()}),_("avoid-traps",r=>{o={...o,avoidValueTraps:r},h()}),document.querySelectorAll("[data-track]").forEach(r=>{r.addEventListener("click",()=>{const n=e.find(c=>c.ticker===r.dataset.track);if(!n)return;const s=ge(n,o.universe);v=[{id:`${n.ticker}-${Date.now()}`,ticker:n.ticker,companyName:n.companyName,universe:s,action:n.tradeIdea.action,openedAt:new Date().toISOString(),finalRiskAdjustedValueScore:n.finalRiskAdjustedValueScore,valueTrapRiskScore:n.valueTrapRiskScore,notes:n.tradeIdea.why,status:"Watching"},...v],U(v),h()})}),document.querySelectorAll("[data-remove-trade]").forEach(r=>{r.addEventListener("click",()=>{v=v.filter(n=>n.id!==r.dataset.removeTrade),U(v),h()})}),(t=document.querySelector("#import-csv"))==null||t.addEventListener("click",()=>{const r=document.querySelector("#csv-text"),n=document.querySelector("#csv-status"),s=K((r==null?void 0:r.value)??"");s.stocks.length>0?(P=we(P,s.stocks),G(P),o={...o,universe:"CUSTOM"},h()):n&&(n.textContent=s.errors.join(" "))}),(a=document.querySelector("#clear-custom"))==null||a.addEventListener("click",()=>{P=[],G(P),h()})}function ye(e){return e.length===0?'<div class="empty-state">No stocks match the current filters.</div>':`
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ticker</th><th>Universe</th><th>Sector</th><th>Price</th><th>Final Risk-Adjusted Value Score</th><th>Value Score</th><th>Quality Score</th><th>Balance Sheet Score</th><th>Growth Score</th><th>Momentum Setup Score</th><th>Value Trap Risk Score</th><th>Category</th><th>AI Trade Picker</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${e.map(t=>`
            <tr>
              <td><strong>${t.ticker}</strong><small>${t.companyName}</small></td>
              <td>${ue(t)}</td>
              <td>${t.sector}<small>${t.industry}</small></td>
              <td>${Te(t.price)}</td>
              <td><span class="score-pill ${Ae(t.finalRiskAdjustedValueScore)}">${S(t.finalRiskAdjustedValueScore)}</span></td>
              <td>${S(t.valueScore)}</td>
              <td>${S(t.qualityScore)}</td>
              <td>${S(t.balanceSheetScore)}</td>
              <td>${S(t.growthScore)}</td>
              <td>${S(t.momentumSetupScore)}</td>
              <td><span class="risk ${Ce(t.valueTrapRiskScore)}">${S(t.valueTrapRiskScore)}</span></td>
              <td>${t.category}</td>
              <td><strong>${t.tradeIdea.action}</strong><details><summary>Why this trade?</summary><p>${t.tradeIdea.why}</p></details></td>
              <td><button type="button" data-track="${t.ticker}">Track</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>`}function ve(){return v.length===0?'<div class="empty-state">No paper trades tracked yet.</div>':`<div class="tracker-list">
    ${v.map(e=>`
      <article class="tracker-card">
        <div><strong>${e.ticker}</strong><span>${e.companyName}</span></div>
        <div><small>Universe</small><span>${e.universe}</span></div>
        <div><small>Idea</small><span>${e.action}</span></div>
        <div><small>Final / Trap</small><span>${S(e.finalRiskAdjustedValueScore)} / ${S(e.valueTrapRiskScore)}</span></div>
        <button type="button" data-remove-trade="${e.id}">Remove</button>
      </article>
    `).join("")}
  </div>`}function fe(e){const t=new Map;return e.forEach(a=>{const r=t.get(a.sector)??[];r.push(a),t.set(a.sector,r)}),Array.from(t.entries()).sort(([a],[r])=>a.localeCompare(r)).map(([a,r])=>{const n=r.sort($)[0];return`<article><small>${a}</small><strong>${n.ticker}</strong><span>${n.companyName}</span><b>${S(n.finalRiskAdjustedValueScore)}</b></article>`}).join("")}function C(e,t){return`<article class="idea-card"><h3>${e}</h3>${t.length?`<ol>${t.map(a=>`<li><span>${a.ticker}</span><strong>${S(a.finalRiskAdjustedValueScore)}</strong><small>${a.category}</small></li>`).join("")}</ol>`:"<p>No ideas match.</p>"}</article>`}function V(e,t){return M(e,t).sort($).slice(0,5)}function $(e,t){return t.finalRiskAdjustedValueScore-e.finalRiskAdjustedValueScore}function ge(e,t){return t==="CUSTOM"?"CUSTOM":t==="SP500"&&e.indexMembership.includes("SP500")?"SP500":t==="NASDAQ_100"&&e.indexMembership.includes("NASDAQ_100")||e.indexMembership.includes("NASDAQ_100")?"NASDAQ_100":e.indexMembership.includes("SP500")?"SP500":"CUSTOM"}function we(e,t){const a=new Map(e.map(r=>[r.ticker,r]));return t.forEach(r=>a.set(r.ticker,r)),Array.from(a.values())}function Q(e,t){var a;(a=document.querySelector(`#${e}`))==null||a.addEventListener("change",r=>t(r.target.value))}function k(e,t){var a;(a=document.querySelector(`#${e}`))==null||a.addEventListener("change",r=>t(Number(r.target.value)||0))}function _(e,t){var a;(a=document.querySelector(`#${e}`))==null||a.addEventListener("change",r=>t(r.target.checked))}function be(e){return{NASDAQ_100:"Top undervalued Nasdaq-100 stocks.",SP500:"Top undervalued S&P 500 stocks.",CUSTOM:"Top undervalued custom watchlist stocks.",ALL:"Top undervalued stocks overall."}[e]}function D(e,t,a){return`<option value="${e}" ${e===a?"selected":""}>${t}</option>`}function N(e,t,a){return`<article><span>${e}</span><strong>${t}</strong><small>${a}</small></article>`}function Pe(e){if(e.length===0)return 0;const t=e.slice().sort((a,r)=>a-r);return t[Math.floor(t.length/2)]??0}function Ae(e){return e>=72?"good":e>=52?"ok":"bad"}function Ce(e){return e>=70?"bad":e>=45?"ok":"good"}function S(e){return Number.isFinite(e)?String(Math.round(Number(e))):"--"}function Te(e){return new Intl.NumberFormat(void 0,{style:"currency",currency:"USD",maximumFractionDigits:2}).format(e)}
//# sourceMappingURL=index-BJ3kE4xK.js.map

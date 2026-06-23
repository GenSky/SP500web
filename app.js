(function () {
  "use strict";

  const DATA_URL = "data/market.json";
  const RANGE_DAYS = { "1m": 23, "3m": 66, "6m": 132, "1y": 252 };
  let marketData = null;
  let activeRange = "1y";

  const priceEl = document.getElementById("index-price");
  const changeEl = document.getElementById("index-change");
  const updatedEl = document.getElementById("updated-at");
  const sourceEl = document.getElementById("data-source");
  const metricGrid = document.getElementById("metric-grid");
  const chartCanvas = document.getElementById("price-chart");
  const chartCaption = document.getElementById("chart-caption");
  const moverList = document.getElementById("mover-list");
  const watchlistBody = document.getElementById("watchlist-body");
  const statusPill = document.getElementById("status-pill");
  const rangeFill = document.getElementById("range-fill");
  const rangeLow = document.getElementById("range-low");
  const rangeHigh = document.getElementById("range-high");
  const rangeCurrent = document.getElementById("range-current");

  const money = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

  document.querySelectorAll(".range-button").forEach((button) => {
    button.addEventListener("click", () => {
      activeRange = button.dataset.range;
      document.querySelectorAll(".range-button").forEach((item) => item.classList.toggle("active", item === button));
      if (marketData) {
        renderChart(marketData.index.history);
      }
    });
  });

  fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Data request failed: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      marketData = data;
      render(data);
    })
    .catch((error) => {
      console.error(error);
      priceEl.textContent = "Unavailable";
      changeEl.textContent = "Market snapshot could not be loaded.";
      changeEl.className = "quote-change neutral";
      statusPill.textContent = "Data unavailable";
    });

  function render(data) {
    const index = data.index;
    const tracked = data.symbols || [];

    priceEl.textContent = formatPrice(index.last);
    changeEl.textContent = `${formatSigned(index.change)} (${formatPercent(index.changePercent)}) today`;
    changeEl.className = `quote-change ${tone(index.changePercent)}`;
    updatedEl.textContent = formatDateTime(data.generatedAt);
    sourceEl.textContent = data.sourceName || "Free market data";
    statusPill.textContent = `${tracked.length} symbols tracked`;

    renderMetrics(index, tracked);
    renderChart(index.history);
    renderMovers(tracked);
    renderRange(index);
    renderTable(tracked);
  }

  function renderMetrics(index, tracked) {
    const metrics = [
      { label: "1 month", value: formatPercent(index.oneMonthPercent), note: "Closing-price change" },
      { label: "YTD", value: formatPercent(index.ytdPercent), note: `${new Date().getFullYear()} performance` },
      { label: "52W high", value: formatPrice(index.fiftyTwoWeekHigh), note: `${formatPrice(index.fiftyTwoWeekLow)} low` },
      { label: "Tracked value", value: `${tracked.length} tickers`, note: "Index, ETFs, and leaders" }
    ];

    metricGrid.innerHTML = metrics.map((metric) => `
      <article class="metric-card">
        <span>${metric.label}</span>
        <strong class="${tone(parsePercent(metric.value))}">${metric.value}</strong>
        <small>${metric.note}</small>
      </article>
    `).join("");
  }

  function renderChart(history) {
    const ctx = chartCanvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = chartCanvas.getBoundingClientRect();
    chartCanvas.width = Math.max(640, Math.floor(rect.width * dpr));
    chartCanvas.height = Math.max(320, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 28, right: 28, bottom: 42, left: 70 };
    const points = trimHistory(history, activeRange);
    const values = points.map((point) => point.close);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    drawGrid(ctx, width, height, padding, min, max);

    ctx.beginPath();
    points.forEach((point, index) => {
      const x = padding.left + (plotWidth * index) / Math.max(points.length - 1, 1);
      const y = padding.top + plotHeight - ((point.close - min) / span) * plotHeight;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    const lineGradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
    lineGradient.addColorStop(0, "#1d4ed8");
    lineGradient.addColorStop(1, "#0f766e");
    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 3;
    ctx.stroke();

    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    const lastX = width - padding.right;
    const lastY = padding.top + plotHeight - ((lastPoint.close - min) / span) * plotHeight;
    const areaGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    areaGradient.addColorStop(0, "rgba(15, 118, 110, 0.24)");
    areaGradient.addColorStop(1, "rgba(29, 78, 216, 0.02)");

    ctx.lineTo(lastX, height - padding.bottom);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = areaGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#0f766e";
    ctx.fill();

    chartCaption.textContent = `${formatDate(firstPoint.date)} to ${formatDate(lastPoint.date)}. Range: ${formatPrice(min)} to ${formatPrice(max)}.`;
  }

  function drawGrid(ctx, width, height, padding, min, max) {
    ctx.strokeStyle = "#e6edf5";
    ctx.fillStyle = "#5a6574";
    ctx.lineWidth = 1;
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= 4; i += 1) {
      const y = padding.top + ((height - padding.top - padding.bottom) * i) / 4;
      const value = max - ((max - min) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(formatPrice(value), padding.left - 12, y);
    }
  }

  function renderMovers(symbols) {
    const movers = [...symbols]
      .filter((item) => Number.isFinite(item.changePercent))
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 5);

    moverList.innerHTML = movers.map((item) => `
      <article class="mover-row">
        <strong>${escapeHtml(item.symbol)}</strong>
        <span>${escapeHtml(item.name)}</span>
        <strong class="change ${tone(item.changePercent)}">${formatPercent(item.changePercent)}</strong>
      </article>
    `).join("");
  }

  function renderRange(index) {
    const low = index.fiftyTwoWeekLow;
    const high = index.fiftyTwoWeekHigh;
    const current = index.last;
    const pct = Math.max(0, Math.min(100, ((current - low) / ((high - low) || 1)) * 100));
    rangeFill.style.width = `${pct}%`;
    rangeLow.textContent = formatPrice(low);
    rangeHigh.textContent = formatPrice(high);
    rangeCurrent.textContent = `${formatPrice(current)} (${pct.toFixed(0)}%)`;
  }

  function renderTable(symbols) {
    watchlistBody.innerHTML = symbols.map((item) => {
      const rangePercent = Math.max(0, Math.min(100, ((item.last - item.fiftyTwoWeekLow) / ((item.fiftyTwoWeekHigh - item.fiftyTwoWeekLow) || 1)) * 100));
      return `
        <tr>
          <td class="symbol-cell"><strong>${escapeHtml(item.symbol)}</strong><small>${escapeHtml(item.type)}</small></td>
          <td>${escapeHtml(item.name)}</td>
          <td>${formatPrice(item.last)}</td>
          <td class="${tone(item.changePercent)}">${formatSigned(item.change)} (${formatPercent(item.changePercent)})</td>
          <td class="${tone(item.ytdPercent)}">${formatPercent(item.ytdPercent)}</td>
          <td>
            <div class="range-mini">
              <span>${formatPrice(item.fiftyTwoWeekLow)} - ${formatPrice(item.fiftyTwoWeekHigh)}</span>
              <span class="range-mini-track"><span style="width:${rangePercent}%"></span></span>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function trimHistory(history, range) {
    const count = RANGE_DAYS[range] || RANGE_DAYS["1y"];
    return history.slice(Math.max(0, history.length - count));
  }

  function formatPrice(value) {
    return Number.isFinite(value) ? money.format(value) : "--";
  }

  function formatSigned(value) {
    if (!Number.isFinite(value)) {
      return "--";
    }
    return `${value >= 0 ? "+" : ""}${money.format(value)}`;
  }

  function formatPercent(value) {
    if (!Number.isFinite(value)) {
      return "--";
    }
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  }

  function parsePercent(value) {
    const parsed = Number(String(value).replace("%", ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function formatDateTime(value) {
    return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function tone(value) {
    if (value > 0) {
      return "positive";
    }
    if (value < 0) {
      return "negative";
    }
    return "neutral";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[char]));
  }

  window.addEventListener("resize", () => {
    if (marketData) {
      renderChart(marketData.index.history);
    }
  });
}());
(function () {
  "use strict";

  const STORAGE_KEY = "project50.progress.v1";
  const CHECKLIST_KEY = "project50.checklists.v1";
  const START_WEIGHT = 213.6;
  const START_BODY_FAT = 29.1;

  const state = loadState();
  let progressChart = null;

  const form = document.getElementById("progress-form");
  const monthInput = document.getElementById("entry-month");
  const entriesBody = document.getElementById("entries-body");
  const chartCanvas = document.getElementById("progress-chart");
  const chartStatus = document.getElementById("chart-status");

  function loadState() {
    const fallback = { entries: [], workouts: 0 };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.entries)) {
        return fallback;
      }
      return {
        entries: saved.entries,
        workouts: Number(saved.workouts) || 0
      };
    } catch (error) {
      return fallback;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function formatMonth(value) {
    if (!value) {
      return "";
    }
    const [year, month] = value.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function sortEntries() {
    state.entries.sort((a, b) => a.month.localeCompare(b.month));
  }

  function getLatestEntry() {
    sortEntries();
    return state.entries[state.entries.length - 1] || null;
  }

  function setDefaultMonth() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    monthInput.value = `${now.getFullYear()}-${month}`;
  }

  function readForm() {
    return {
      month: form.month.value,
      weight: toNumber(form.weight.value),
      bodyFat: toNumber(form.bodyFat.value),
      waist: toNumber(form.waist.value),
      squat: toNumber(form.squat.value),
      deadlift: toNumber(form.deadlift.value),
      notes: form.notes.value.trim()
    };
  }

  function fillForm(entry) {
    form.month.value = entry.month || "";
    form.weight.value = entry.weight ?? "";
    form.bodyFat.value = entry.bodyFat ?? "";
    form.waist.value = entry.waist ?? "";
    form.squat.value = entry.squat ?? "";
    form.deadlift.value = entry.deadlift ?? "";
    form.notes.value = entry.notes || "";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetForm() {
    form.reset();
    setDefaultMonth();
  }

  function renderEntries() {
    sortEntries();
    entriesBody.innerHTML = "";

    if (state.entries.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = '<td colspan="8">No saved entries yet.</td>';
      entriesBody.appendChild(row);
      return;
    }

    state.entries.forEach((entry) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${formatMonth(entry.month)}</td>
        <td>${entry.weight ?? ""}</td>
        <td>${entry.bodyFat ?? ""}</td>
        <td>${entry.waist ?? ""}</td>
        <td>${entry.squat ?? ""}</td>
        <td>${entry.deadlift ?? ""}</td>
        <td class="notes-cell"></td>
        <td>
          <div class="row-actions">
            <button type="button" class="secondary" data-edit="${entry.month}">Edit</button>
            <button type="button" class="danger" data-delete="${entry.month}">Delete</button>
          </div>
        </td>
      `;
      row.querySelector(".notes-cell").textContent = entry.notes || "";
      entriesBody.appendChild(row);
    });
  }

  function updateSummary() {
    const latest = getLatestEntry();
    const latestWeight = latest?.weight ?? START_WEIGHT;
    const latestBodyFat = latest?.bodyFat ?? START_BODY_FAT;
    const lost = START_WEIGHT - latestWeight;

    document.getElementById("latest-weight").textContent = `${latestWeight.toFixed(1)} lbs`;
    document.getElementById("lost-weight").textContent = `${lost.toFixed(1)} lbs`;
    document.getElementById("latest-body-fat").textContent = `${latestBodyFat.toFixed(1)}%`;
    document.getElementById("logged-months").textContent = String(state.entries.length);
    document.getElementById("workout-count").textContent = String(state.workouts);
  }

  function chartData() {
    sortEntries();
    const source = state.entries.length > 0 ? state.entries : [{
      month: "Start",
      weight: START_WEIGHT,
      bodyFat: START_BODY_FAT,
      squat: 100,
      deadlift: 135
    }];

    return {
      labels: source.map((entry) => entry.month === "Start" ? "Start" : formatMonth(entry.month)),
      weight: source.map((entry) => entry.weight),
      bodyFat: source.map((entry) => entry.bodyFat),
      squat: source.map((entry) => entry.squat),
      deadlift: source.map((entry) => entry.deadlift)
    };
  }

  function renderChart() {
    const data = chartData();

    if (window.Chart) {
      renderChartJs(data);
      chartStatus.textContent = "";
      return;
    }

    renderFallbackChart(data);
    chartStatus.textContent = "Offline chart mode is active. Data is still saved locally in this browser.";
  }

  function renderChartJs(data) {
    if (progressChart) {
      progressChart.destroy();
    }

    progressChart = new Chart(chartCanvas, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          dataset("Weight", data.weight, "#00f5a0", "y"),
          dataset("Body Fat", data.bodyFat, "#ffd60a", "y1"),
          dataset("Squat", data.squat, "#4cc9f0", "y"),
          dataset("Deadlift", data.deadlift, "#ff4d6d", "y")
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: {
            labels: {
              color: "#f4f7fb",
              boxWidth: 12,
              boxHeight: 12
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "#9aa8b6" },
            grid: { color: "rgba(255,255,255,0.08)" }
          },
          y: {
            position: "left",
            ticks: { color: "#9aa8b6" },
            grid: { color: "rgba(255,255,255,0.08)" }
          },
          y1: {
            position: "right",
            ticks: { color: "#ffd60a" },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  function dataset(label, values, color, axis) {
    return {
      label,
      data: values,
      borderColor: color,
      backgroundColor: color,
      yAxisID: axis,
      tension: 0.25,
      borderWidth: 3,
      pointRadius: 4,
      spanGaps: true
    };
  }

  function renderFallbackChart(data) {
    const canvas = chartCanvas;
    const context = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 900;
    const height = 360;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const padding = { top: 28, right: 28, bottom: 58, left: 54 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const series = [
      { label: "Weight", values: data.weight, color: "#00f5a0" },
      { label: "Body Fat", values: data.bodyFat, color: "#ffd60a" },
      { label: "Squat", values: data.squat, color: "#4cc9f0" },
      { label: "Deadlift", values: data.deadlift, color: "#ff4d6d" }
    ];
    const allValues = series.flatMap((item) => item.values).filter((value) => Number.isFinite(value));
    const min = Math.min(...allValues, 0);
    const max = Math.max(...allValues, 250);
    const range = Math.max(max - min, 1);

    context.strokeStyle = "rgba(255,255,255,0.12)";
    context.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = padding.top + (plotHeight / 4) * i;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
    }

    series.forEach((item) => {
      context.strokeStyle = item.color;
      context.fillStyle = item.color;
      context.lineWidth = 3;
      context.beginPath();

      item.values.forEach((value, index) => {
        if (!Number.isFinite(value)) {
          return;
        }
        const x = padding.left + (data.labels.length === 1 ? plotWidth / 2 : (plotWidth / (data.labels.length - 1)) * index);
        const y = padding.top + plotHeight - ((value - min) / range) * plotHeight;
        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      });
      context.stroke();
    });

    context.font = "13px IBM Plex Sans, Segoe UI, Arial";
    context.fillStyle = "#9aa8b6";
    data.labels.forEach((label, index) => {
      const x = padding.left + (data.labels.length === 1 ? plotWidth / 2 : (plotWidth / (data.labels.length - 1)) * index);
      context.fillText(label, Math.max(8, x - 24), height - 24);
    });

    series.forEach((item, index) => {
      const x = padding.left + index * 110;
      context.fillStyle = item.color;
      context.fillRect(x, 8, 12, 12);
      context.fillText(item.label, x + 18, 19);
    });
  }

  function updateBadges() {
    const latest = getLatestEntry();
    const weight = latest?.weight ?? START_WEIGHT;
    const bodyFatValues = state.entries.map((entry) => entry.bodyFat).filter((value) => Number.isFinite(value));
    const lowestBodyFat = bodyFatValues.length ? Math.min(...bodyFatValues) : START_BODY_FAT;

    toggleBadge("first-five", weight <= START_WEIGHT - 5);
    toggleBadge("workouts-100", state.workouts >= 100);
    toggleBadge("workouts-200", state.workouts >= 200);
    toggleBadge("bf-25", lowestBodyFat < 25);
    toggleBadge("bf-20", lowestBodyFat < 20);
  }

  function toggleBadge(name, unlocked) {
    const badge = document.querySelector(`[data-badge="${name}"]`);
    if (!badge) {
      return;
    }
    badge.classList.toggle("unlocked", unlocked);
  }

  function loadChecklist() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY)) || {};
    } catch (error) {
      saved = {};
    }

    document.querySelectorAll("[data-check]").forEach((input) => {
      input.checked = Boolean(saved[input.dataset.check]);
      input.addEventListener("change", () => {
        saved[input.dataset.check] = input.checked;
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(saved));
      });
    });
  }

  function refresh() {
    renderEntries();
    updateSummary();
    renderChart();
    updateBadges();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const entry = readForm();

    const existingIndex = state.entries.findIndex((item) => item.month === entry.month);
    if (existingIndex >= 0) {
      state.entries[existingIndex] = entry;
    } else {
      state.entries.push(entry);
    }

    saveState();
    resetForm();
    refresh();
  });

  entriesBody.addEventListener("click", (event) => {
    const editMonth = event.target.dataset.edit;
    const deleteMonth = event.target.dataset.delete;

    if (editMonth) {
      const entry = state.entries.find((item) => item.month === editMonth);
      if (entry) {
        fillForm(entry);
      }
    }

    if (deleteMonth && confirm("Delete this progress entry?")) {
      state.entries = state.entries.filter((item) => item.month !== deleteMonth);
      saveState();
      refresh();
    }
  });

  document.getElementById("clear-form").addEventListener("click", resetForm);

  document.getElementById("reset-data").addEventListener("click", () => {
    if (!confirm("Reset all saved progress data and workout count?")) {
      return;
    }
    state.entries = [];
    state.workouts = 0;
    saveState();
    resetForm();
    refresh();
  });

  document.getElementById("add-workout").addEventListener("click", () => {
    state.workouts += 1;
    saveState();
    updateSummary();
    updateBadges();
  });

  window.addEventListener("resize", () => {
    if (!window.Chart) {
      renderFallbackChart(chartData());
    }
  });

  setDefaultMonth();
  loadChecklist();
  refresh();
}());

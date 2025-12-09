// ----- Electron IPC (for auto-resize) -----
let ipcRenderer = null;
try {
  ipcRenderer = require('electron').ipcRenderer;
} catch (e) {
  // Not running in Electron (safe to ignore)
}

function resizeToContent() {
  if (!ipcRenderer) return;

  const rootEl = document.getElementById("prodBar") || document.body;
  const rect = rootEl.getBoundingClientRect();

  const paddingForShadow = 12; // extra px for right/bottom shadows

  ipcRenderer.send('resize-window', {
    width: Math.ceil(rect.width) + paddingForShadow,
    height: Math.ceil(rect.height) + paddingForShadow
  });
}


// ----- Data definitions -----

const ALL_QUEUES = [
  "Support",
  "Sales",
  "Service",
  "VIP",
  "Overflow",
  "Billing",
  "Technical",
  "Spanish Support",
  "After Hours",
  "New Accounts"
];

// Metric catalog – modeled on Genesys queue stats concepts
const ALL_METRICS = [
  // Real-time (Queue Observations)
  {
    id: "waiting",
    label: "Waiting (oWaiting)",
    header: "WAITING",
    group: "Real-time: Queue Observations",
    apiMetric: "oWaiting",
    formatter: v => (v ?? 0).toString()
  },
  {
    id: "interacting",
    label: "Interacting (oInteracting)",
    header: "INTERACT",
    group: "Real-time: Queue Observations",
    apiMetric: "oInteracting",
    formatter: v => (v ?? 0).toString()
  },
  {
    id: "onQueueUsers",
    label: "On-Queue Agents (oOnQueueUsers)",
    header: "ON Q AGENTS",
    group: "Real-time: Queue Observations",
    apiMetric: "oOnQueueUsers",
    formatter: v => (v ?? 0).toString()
  },
  {
    id: "offQueueUsers",
    label: "Off-Queue Agents (oOffQueueUsers)",
    header: "OFF Q AGENTS",
    group: "Real-time: Queue Observations",
    apiMetric: "oOffQueueUsers",
    formatter: v => (v ?? 0).toString()
  },
  {
    id: "longestWaiting",
    label: "Longest Waiting (oLongestWaiting)",
    header: "LONGEST",
    group: "Real-time: Queue Observations",
    apiMetric: "oLongestWaiting",
    formatter: sec => formatTime(sec ?? 0)
  },

  // Aggregated / performance – like Queue Performance view
  {
    id: "asa",
    label: "Avg Speed of Answer (ASA)",
    header: "ASA",
    group: "Performance: Aggregated",
    apiMetric: "asa",
    formatter: sec => formatTime(sec ?? 0)
  },
  {
    id: "aht",
    label: "Avg Handle Time (AHT)",
    header: "AHT",
    group: "Performance: Aggregated",
    apiMetric: "aht",
    formatter: sec => formatTime(sec ?? 0)
  },
  {
    id: "avgWait",
    label: "Avg Wait",
    header: "AVG WAIT",
    group: "Performance: Aggregated",
    apiMetric: "avgWait",
    formatter: sec => formatTime(sec ?? 0)
  },
  {
    id: "answerPct",
    label: "Answer %",
    header: "ANSWER %",
    group: "Performance: Aggregated",
    apiMetric: "answerPercent",
    formatter: v => `${v ?? 0}%`
  },
  {
    id: "abandonPct",
    label: "Abandon %",
    header: "ABANDON %",
    group: "Performance: Aggregated",
    apiMetric: "abandonPercent",
    formatter: v => `${v ?? 0}%`
  },
  {
    id: "serviceLevelPct",
    label: "Service Level %",
    header: "SL %",
    group: "Performance: Aggregated",
    apiMetric: "serviceLevelPercent",
    formatter: v => `${v ?? 0}%`
  }
];

const SELECTED_QUEUES_KEY   = "prodBarSelectedQueues";
const SELECTED_METRICS_KEY  = "prodBarSelectedMetrics_v2";
const THEME_KEY             = "prodBarTheme";
const FONT_SIZE_KEY         = "prodBarFontSize";

const MAX_QUEUES  = 5;
const MAX_METRICS = 4;
const DEFAULT_METRICS = ["waiting", "avgWait", "aht", "abandonPct"];

// ----- Persistence helpers -----
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// ----- Selected queues & metrics -----
let selectedQueues  = loadJSON(SELECTED_QUEUES_KEY, null);
if (!Array.isArray(selectedQueues) || selectedQueues.length === 0) {
  selectedQueues = ALL_QUEUES.slice(0, MAX_QUEUES);
} else {
  selectedQueues = selectedQueues.slice(0, MAX_QUEUES);
}

let selectedMetrics = loadJSON(SELECTED_METRICS_KEY, null);
if (!Array.isArray(selectedMetrics) ||
    selectedMetrics.length < 1 ||
    selectedMetrics.length > MAX_METRICS) {
  selectedMetrics = DEFAULT_METRICS.slice(0, MAX_METRICS);
} else {
  selectedMetrics = selectedMetrics.slice(0, MAX_METRICS);
}

// ----- Fake metrics data generator (POC only) -----
function getFakeQueueMetrics() {
  return selectedQueues.map(q => ({
    queue: q,
    waiting:        Math.floor(Math.random() * 15),
    interacting:    Math.floor(Math.random() * 10),
    onQueueUsers:   3 + Math.floor(Math.random() * 15),
    offQueueUsers:  Math.floor(Math.random() * 5),
    longestWaiting: Math.floor(Math.random() * 600),

    asa:              10 + Math.floor(Math.random() * 80),
    aht:             180 + Math.floor(Math.random() * 300),
    avgWait:          10 + Math.floor(Math.random() * 120),
    answerPct:        80 + Math.floor(Math.random() * 20),
    abandonPct:       Math.floor(Math.random() * 16),
    serviceLevelPct:  70 + Math.floor(Math.random() * 25)
  }));
}

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const r = (s % 60).toString().padStart(2, "0");
  return `${m}:${r}`;
}

// ----- DOM refs -----
const closeBtnEl          = document.getElementById("closeBtn");
const collapseBtnEl       = document.getElementById("collapseBtn");
const settingsBtnEl       = document.getElementById("settingsBtn");
const settingsModalEl     = document.getElementById("settingsModal");
const settingsCloseEl     = document.getElementById("settingsClose");
const queueBodyEl         = document.getElementById("queueBody");
const headerRowEl         = document.getElementById("headerRow");
const themeDarkEl         = document.getElementById("themeDark");
const themeLightEl        = document.getElementById("themeLight");
const fontNormalEl        = document.getElementById("fontNormal");
const fontLargeEl         = document.getElementById("fontLarge");
const settingsTabsEl      = document.getElementById("settingsTabs");
const queueTabEl          = document.getElementById("queuesTab");
const metricsTabEl        = document.getElementById("metricsTab");
const selectedQueuesPills = document.getElementById("selectedQueuesPills");
const queueSearchEl       = document.getElementById("queueSearch");
const queueListEl         = document.getElementById("queueList");
const selectedMetricsPills= document.getElementById("selectedMetricsPills");
const metricsGroupsEl     = document.getElementById("metricsGroups");

// ----- Theme handling (dark / light) -----
let currentTheme = localStorage.getItem(THEME_KEY) || "dark";

function applyTheme(theme) {
  const normalized = theme === "light" ? "light" : "dark";
  document.body.classList.remove("light-mode", "dark-mode");
  document.body.classList.add(`${normalized}-mode`);
  currentTheme = normalized;
  localStorage.setItem(THEME_KEY, normalized);
  resizeToContent();
}

// ----- Font size handling -----
let currentFontSize = localStorage.getItem(FONT_SIZE_KEY) || "normal";

function applyFontSize(size) {
  const normalized = size === "large" ? "large" : "normal";
  document.body.classList.remove("font-normal", "font-large");
  document.body.classList.add(`font-${normalized}`);
  currentFontSize = normalized;
  localStorage.setItem(FONT_SIZE_KEY, normalized);
  resizeToContent();
}

// Initialize theme + font size
applyTheme(currentTheme);
applyFontSize(currentFontSize);

// ----- Table rendering -----
function getMetricDefById(id) {
  return ALL_METRICS.find(m => m.id === id);
}

function renderTableHeaders() {
  if (!headerRowEl) return;
  headerRowEl.innerHTML = "";

  const thQueue = document.createElement("th");
  thQueue.textContent = "QUEUE";
  headerRowEl.appendChild(thQueue);

  selectedMetrics.forEach(id => {
    const def = getMetricDefById(id);
    if (!def) return;
    const th = document.createElement("th");
    th.classList.add("metric-col");
    th.textContent = def.header || def.label;
    headerRowEl.appendChild(th);
  });
}

function renderTableRows() {
  if (!queueBodyEl) return;
  queueBodyEl.innerHTML = "";

  selectedQueues.forEach(q => {
    const tr = document.createElement("tr");
    tr.dataset.queue = q;

    const tdName = document.createElement("td");
    tdName.textContent = q;
    tr.appendChild(tdName);

    selectedMetrics.forEach(id => {
      const td = document.createElement("td");
      td.classList.add("metric-col");
      td.dataset.metric = id;
      td.textContent = "";
      tr.appendChild(td);
    });

    queueBodyEl.appendChild(tr);
  });

  resizeToContent();
}

function updateTable() {
  const metrics = getFakeQueueMetrics();

  metrics.forEach(row => {
    const tr = document.querySelector(`tr[data-queue="${row.queue}"]`);
    if (!tr) return;

    selectedMetrics.forEach(id => {
      const def = getMetricDefById(id);
      if (!def) return;

      const td = tr.querySelector(`td[data-metric="${id}"]`);
      if (!td) return;

      const rawVal = row[id];
      const formatted = def.formatter ? def.formatter(rawVal) : (rawVal ?? "");
      td.textContent = formatted;
    });
  });

  resizeToContent();
}

// Initialize table + updates
renderTableHeaders();
renderTableRows();
updateTable();
setInterval(updateTable, 3000);

// ----- Settings: Queues UI -----
function renderSelectedQueuesPills() {
  if (!selectedQueuesPills) return;
  selectedQueuesPills.innerHTML = "";

  selectedQueues.forEach(q => {
    const pill = document.createElement("div");
    pill.className = "pill";
    pill.dataset.queue = q;
    pill.innerHTML = `
      <span>${q}</span>
      <button type="button" aria-label="Remove queue">✕</button>
    `;
    selectedQueuesPills.appendChild(pill);
  });
}

function renderQueueList() {
  if (!queueListEl) return;
  queueListEl.innerHTML = "";

  const filter = (queueSearchEl?.value || "").trim().toLowerCase();

  ALL_QUEUES.forEach(q => {
    if (filter && !q.toLowerCase().includes(filter)) return;

    const row = document.createElement("div");
    row.className = "queue-row";

    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = q;
    input.checked = selectedQueues.includes(q);

    if (!input.checked && selectedQueues.length >= MAX_QUEUES) {
      input.disabled = true;
    }

    label.appendChild(input);
    label.appendChild(document.createTextNode(q));
    row.appendChild(label);

    queueListEl.appendChild(row);
  });
}

function addQueue(name) {
  if (selectedQueues.includes(name)) return;
  if (selectedQueues.length >= MAX_QUEUES) {
    alert(`You can select up to ${MAX_QUEUES} queues.`);
    return;
  }
  selectedQueues.push(name);
  saveJSON(SELECTED_QUEUES_KEY, selectedQueues);
  renderSelectedQueuesPills();
  renderQueueList();
  renderTableRows();
  updateTable();
}

function removeQueue(name) {
  if (selectedQueues.length <= 1) {
    alert("Please keep at least one queue selected.");
    return;
  }
  selectedQueues = selectedQueues.filter(q => q !== name);
  saveJSON(SELECTED_QUEUES_KEY, selectedQueues);
  renderSelectedQueuesPills();
  renderQueueList();
  renderTableRows();
  updateTable();
}

if (queueSearchEl) {
  queueSearchEl.addEventListener("input", () => {
    renderQueueList();
  });
}

if (queueListEl) {
  queueListEl.addEventListener("change", e => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.type !== "checkbox") return;

    const q = input.value;
    if (input.checked) {
      addQueue(q);
    } else {
      removeQueue(q);
    }
  });
}

if (selectedQueuesPills) {
  selectedQueuesPills.addEventListener("click", e => {
    const btn = e.target;
    if (!(btn instanceof HTMLButtonElement)) return;
    const pill = btn.closest(".pill");
    if (!pill) return;
    const q = pill.dataset.queue;
    if (!q) return;
    removeQueue(q);
  });
}

// ----- Settings: Metrics UI -----
function renderSelectedMetricsPills() {
  if (!selectedMetricsPills) return;
  selectedMetricsPills.innerHTML = "";

  selectedMetrics.forEach(id => {
    const def = getMetricDefById(id);
    if (!def) return;

    const pill = document.createElement("div");
    pill.className = "pill";
    pill.dataset.metric = id;
    pill.innerHTML = `
      <span>${def.header || def.label}</span>
      <button type="button" aria-label="Remove metric">✕</button>
    `;
    selectedMetricsPills.appendChild(pill);
  });
}

function renderMetricsGroups() {
  if (!metricsGroupsEl) return;
  metricsGroupsEl.innerHTML = "";

  const groups = {};
  ALL_METRICS.forEach(m => {
    if (!groups[m.group]) groups[m.group] = [];
    groups[m.group].push(m);
  });

  Object.keys(groups).forEach(groupName => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "metric-group";

    const header = document.createElement("div");
    header.className = "metric-group-header";
    header.textContent = groupName;
    groupDiv.appendChild(header);

    groups[groupName].forEach(m => {
      const row = document.createElement("label");
      row.className = "metric-option";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = m.id;
      const isSelected = selectedMetrics.includes(m.id);
      input.checked = isSelected;
      input.disabled = !isSelected && selectedMetrics.length >= MAX_METRICS;

      row.appendChild(input);
      row.appendChild(document.createTextNode(m.label));
      groupDiv.appendChild(row);
    });

    metricsGroupsEl.appendChild(groupDiv);
  });
}

function addMetric(id) {
  if (selectedMetrics.includes(id)) return;
  if (selectedMetrics.length >= MAX_METRICS) {
    alert(`You can select up to ${MAX_METRICS} metrics.`);
    return;
  }
  selectedMetrics.push(id);
  saveJSON(SELECTED_METRICS_KEY, selectedMetrics);
  renderSelectedMetricsPills();
  renderMetricsGroups();
  renderTableHeaders();
  renderTableRows();
  updateTable();
}

function removeMetric(id) {
  if (selectedMetrics.length <= 1) {
    alert("Please keep at least one metric selected.");
    return;
  }
  selectedMetrics = selectedMetrics.filter(m => m !== id);
  saveJSON(SELECTED_METRICS_KEY, selectedMetrics);
  renderSelectedMetricsPills();
  renderMetricsGroups();
  renderTableHeaders();
  renderTableRows();
  updateTable();
}

if (metricsGroupsEl) {
  metricsGroupsEl.addEventListener("change", e => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.type !== "checkbox") return;

    const id = input.value;
    if (input.checked) {
      addMetric(id);
    } else {
      removeMetric(id);
    }
  });
}

if (selectedMetricsPills) {
  selectedMetricsPills.addEventListener("click", e => {
    const btn = e.target;
    if (!(btn instanceof HTMLButtonElement)) return;
    const pill = btn.closest(".pill");
    if (!pill) return;
    const id = pill.dataset.metric;
    if (!id) return;
    removeMetric(id);
  });
}

// ----- Settings open/close & tabs -----
function buildSettingsUI() {
  // theme radios
  if (currentTheme === "dark") {
    if (themeDarkEl) themeDarkEl.checked = true;
  } else {
    if (themeLightEl) themeLightEl.checked = true;
  }

  // font size radios
  if (currentFontSize === "large") {
    if (fontLargeEl) fontLargeEl.checked = true;
  } else {
    if (fontNormalEl) fontNormalEl.checked = true;
  }

  renderSelectedQueuesPills();
  renderQueueList();
  renderSelectedMetricsPills();
  renderMetricsGroups();
}

function openSettings() {
  buildSettingsUI();
  settingsModalEl.classList.add("visible");
  resizeToContent();
}

function closeSettings() {
  settingsModalEl.classList.remove("visible");
  resizeToContent();
}

function toggleSettings() {
  if (settingsModalEl.classList.contains("visible")) {
    closeSettings();
  } else {
    openSettings();
  }
}

// Tabs switching
if (settingsTabsEl) {
  settingsTabsEl.addEventListener("click", e => {
    const btn = e.target;
    if (!(btn instanceof HTMLButtonElement)) return;

    const tabName = btn.dataset.tab;
    if (!tabName) return;

    Array.from(settingsTabsEl.querySelectorAll(".settings-tab")).forEach(b => {
      b.classList.toggle("active", b === btn);
    });

    const panes = {
      queuesTab: queueTabEl,
      metricsTab: metricsTabEl
    };
    Object.entries(panes).forEach(([name, el]) => {
      if (!el) return;
      el.classList.toggle("active", name === tabName);
    });

    resizeToContent();
  });
}

// Theme
if (themeDarkEl) {
  themeDarkEl.addEventListener("change", e => {
    if (e.target.checked) applyTheme("dark");
  });
}
if (themeLightEl) {
  themeLightEl.addEventListener("change", e => {
    if (e.target.checked) applyTheme("light");
  });
}

// Font size
if (fontNormalEl) {
  fontNormalEl.addEventListener("change", e => {
    if (e.target.checked) applyFontSize("normal");
  });
}
if (fontLargeEl) {
  fontLargeEl.addEventListener("change", e => {
    if (e.target.checked) applyFontSize("large");
  });
}

// Open/close settings
if (settingsBtnEl) {
  settingsBtnEl.addEventListener("click", toggleSettings);
}
if (settingsCloseEl) {
  settingsCloseEl.addEventListener("click", closeSettings);
}

// Close on Escape
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && settingsModalEl.classList.contains("visible")) {
    closeSettings();
  }
});

// Close button: exits the app
if (closeBtnEl) {
  closeBtnEl.addEventListener("click", () => {
    window.close();
  });
}

// Collapse button: placeholder for future pill-mode
if (collapseBtnEl) {
  collapseBtnEl.addEventListener("click", () => {
    console.log("Collapse clicked (to be implemented)");
  });
}

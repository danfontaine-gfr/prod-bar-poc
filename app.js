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


// ----- Queue data -----

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

const SELECTED_QUEUES_KEY = "prodBarSelectedQueues";
let selectedQueues = [];
try {
  const saved = localStorage.getItem(SELECTED_QUEUES_KEY);
  if (saved) selectedQueues = JSON.parse(saved);
} catch {
  selectedQueues = [];
}
if (!Array.isArray(selectedQueues) || selectedQueues.length === 0) {
  selectedQueues = ALL_QUEUES.slice(0, 5);
}

function getFakeQueueMetrics() {
  return selectedQueues.map(q => ({
    name: q,
    waiting: Math.floor(Math.random() * 12),
    longest: Math.floor(Math.random() * 240),
    aht: Math.floor(60 + Math.random() * 240),
    abdn: Math.floor(Math.random() * 21)
  }));
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ----- DOM refs -----
const closeBtnEl       = document.getElementById("closeBtn");
const collapseBtnEl    = document.getElementById("collapseBtn");
const settingsBtnEl    = document.getElementById("settingsBtn");
const settingsModalEl  = document.getElementById("settingsModal");
const settingsCloseEl  = document.getElementById("settingsClose");
const queueBodyEl      = document.getElementById("queueBody");
const queueOptionsEl   = document.getElementById("queueOptions");
const themeDarkEl      = document.getElementById("themeDark");
const themeLightEl     = document.getElementById("themeLight");

// ----- Theme handling (dark / light) -----
const THEME_KEY = "prodBarTheme";
let currentTheme = localStorage.getItem(THEME_KEY) || "dark";

function applyTheme(theme) {
  const normalized = theme === "light" ? "light" : "dark";
  document.body.classList.remove("light-mode", "dark-mode");
  document.body.classList.add(`${normalized}-mode`);
  currentTheme = normalized;
  localStorage.setItem(THEME_KEY, normalized);
  resizeToContent();
}

// Initialize theme on load
applyTheme(currentTheme);

// ----- Table row rendering -----
function renderTableRows() {
  queueBodyEl.innerHTML = "";

  selectedQueues.forEach(q => {
    const tr = document.createElement("tr");
    tr.dataset.queue = q;
    tr.innerHTML = `
      <td>${q}</td>
      <td class="waiting">0</td>
      <td class="longest">00:00</td>
      <td class="aht">00:00</td>
      <td class="abdn">0%</td>
    `;
    queueBodyEl.appendChild(tr);
  });

  resizeToContent();
}

// ----- Table update loop -----
function updateTable() {
  const metrics = getFakeQueueMetrics();

  metrics.forEach(row => {
    const tr = document.querySelector(`tr[data-queue="${row.name}"]`);
    if (!tr) return;

    tr.querySelector(".waiting").textContent = row.waiting;
    tr.querySelector(".longest").textContent = formatTime(row.longest);
    tr.querySelector(".aht").textContent     = formatTime(row.aht);
    tr.querySelector(".abdn").textContent    = `${row.abdn}%`;
  });

  resizeToContent();
}

// Initial render and updates
renderTableRows();
updateTable();
setInterval(updateTable, 3000);

// ----- Settings panel -----
function buildQueueOptions() {
  if (!queueOptionsEl) return;
  queueOptionsEl.innerHTML = "";

  ALL_QUEUES.forEach(q => {
    const label = document.createElement("label");
    label.className = "settings-option";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "queueOption";
    input.value = q;
    if (selectedQueues.includes(q)) input.checked = true;

    label.appendChild(input);
    label.appendChild(document.createTextNode(q));
    queueOptionsEl.appendChild(label);
  });
}

function openSettings() {
  // Theme radios
  if (currentTheme === "dark") {
    if (themeDarkEl) themeDarkEl.checked = true;
  } else {
    if (themeLightEl) themeLightEl.checked = true;
  }

  buildQueueOptions();
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

// Theme auto-save on change
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

// Queue auto-save on change (max 5, min 1)
if (queueOptionsEl) {
  queueOptionsEl.addEventListener("change", e => {
    const target = e.target;
    if (!target || target.name !== "queueOption") return;

    const checked = Array.from(
      queueOptionsEl.querySelectorAll('input[name="queueOption"]:checked')
    ).map(i => i.value);

    if (checked.length === 0) {
      alert("Please keep at least one queue selected.");
      target.checked = true;
      return;
    }
    if (checked.length > 5) {
      alert("You can select up to 5 queues.");
      target.checked = false;
      return;
    }

    selectedQueues = checked;
    localStorage.setItem(SELECTED_QUEUES_KEY, JSON.stringify(selectedQueues));

    renderTableRows();
    updateTable();
  });
}

// Open/close behavior
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

// ----- Electron IPC (for auto-resize) -----
let ipcRenderer = null;
try {
  ipcRenderer = require('electron').ipcRenderer;
} catch (e) {
  // Not running in Electron (safe to ignore)
}

function resizeToContent() {
  if (!ipcRenderer) return;
  const rect = document.body.getBoundingClientRect();
  ipcRenderer.send('resize-window', {
    width: Math.ceil(rect.width),
    height: Math.ceil(rect.height)
  });
}

// ----- Queues & fake metrics -----
const QUEUES = ["Support", "Sales", "Service", "VIP", "Overflow"];

function getFakeQueueMetrics() {
  return QUEUES.map(q => {
    return {
      name: q,
      waiting: Math.floor(Math.random() * 12),         // 0–11 waiting
      longest: Math.floor(Math.random() * 240),         // 0–4 minutes
      aht: Math.floor(60 + Math.random() * 240),        // 1–5 minutes
      abdn: Math.floor(Math.random() * 21)              // 0–20%
    };
  });
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ----- DOM refs -----
const closeBtnEl    = document.getElementById("closeBtn");
const collapseBtnEl = document.getElementById("collapseBtn");
const settingsBtnEl = document.getElementById("settingsBtn");

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

// Initial + recurring updates
updateTable();
setInterval(updateTable, 3000);

// ----- Buttons -----

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

// Settings button: toggle dark/light theme
if (settingsBtnEl) {
  settingsBtnEl.addEventListener("click", () => {
    const next = currentTheme === "dark" ? "light" : "dark";
    applyTheme(next);
  });
}

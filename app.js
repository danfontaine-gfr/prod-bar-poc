// ----- Simulated queue metrics -----
function getFakeMetrics() {
  const waiting = Math.floor(Math.random() * 12);        // 0–11
  const longestWait = Math.floor(Math.random() * 180);   // seconds
  const statusOptions = ["On Queue", "Idle", "Busy", "Offline"];
  const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];

  return {
    queueName: "Support",
    waiting,
    longestWait,
    status
  };
}

// ----- Helpers -----
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Cache DOM refs once
const barEl          = document.getElementById("prodBar");
const queueNameEl    = document.getElementById("queueName");
const waitingEl      = document.getElementById("waiting");
const longestWaitEl  = document.getElementById("longestWait");
const agentStatusEl  = document.getElementById("agentStatus");
const closeBtnEl     = document.getElementById("closeBtn");
const collapseBtnEl  = document.getElementById("collapseBtn");
const settingsBtnEl  = document.getElementById("settingsBtn");

// ----- Main update loop -----
function updateBar() {
  const m = getFakeMetrics();

  queueNameEl.textContent   = `Queue: ${m.queueName}`;
  waitingEl.textContent     = `Waiting: ${m.waiting}`;
  longestWaitEl.textContent = `Longest Wait: ${formatTime(m.longestWait)}`;
  agentStatusEl.textContent = `Status: ${m.status}`;

  // Color state
  barEl.classList.remove("green", "yellow", "red");
  if (m.waiting <= 3)       barEl.classList.add("green");
  else if (m.waiting <= 7)  barEl.classList.add("yellow");
  else                      barEl.classList.add("red");
}

// Run updates every 3 seconds
updateBar();
setInterval(updateBar, 3000);

// ----- Basic button wiring -----

// Close button: closes the window
if (closeBtnEl) {
  closeBtnEl.addEventListener("click", () => {
    window.close(); // Electron will close this BrowserWindow
  });
}

// Collapse button: placeholder for now
if (collapseBtnEl) {
  collapseBtnEl.addEventListener("click", () => {
    console.log("Collapse clicked (behavior to be implemented)");
  });
}

// Settings button: placeholder for now
if (settingsBtnEl) {
  settingsBtnEl.addEventListener("click", () => {
    console.log("Settings clicked (behavior to be implemented)");
  });
}

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const BROKER_BASE_URL = process.env.BROKER_BASE_URL || "http://localhost:8787";

let mainWindow;

// ---- stats cache + polling state ----
let latestStats = null;
let latestStatsAt = 0;

let pollTimer = null;
let pollIntervalMs = 3000; // keep current behavior
let pollConfig = {
  queues: [],
  metrics: []
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 70,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true//,
      //sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

mainWindow.webContents.on("did-finish-load", () => {
  console.log("[renderer] did-finish-load");
});

mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
  console.log("[renderer] did-fail-load", { code, desc, url });
});

// pipe renderer console to terminal
mainWindow.webContents.on("console-message", (_e, level, message, line, sourceId) => {
  console.log(`[renderer console:${level}] ${message} (${sourceId}:${line})`);
});

// open devtools so you can see Network/Sources/Console
mainWindow.webContents.openDevTools({ mode: "detach" });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---- window resize from renderer ----
ipcMain.on("resize-window", (_event, size) => {
  if (!mainWindow || !size) return;

  const minWidth = 320;
  const minHeight = 48;

  const width = Math.max(minWidth, Math.round(size.width));
  const height = Math.max(minHeight, Math.round(size.height));

  mainWindow.setContentSize(width, height);
});

// ---- app lifecycle ----
ipcMain.handle("app:quit", () => {
  app.quit();
});

// ---- stats IPC contract ----
ipcMain.handle("stats:getLatest", async () => {
  return { data: latestStats, updatedAt: latestStatsAt };
});

ipcMain.handle("stats:setConfig", async (_event, cfg) => {
  pollConfig = {
    queues: Array.isArray(cfg?.queues) ? cfg.queues : [],
    metrics: Array.isArray(cfg?.metrics) ? cfg.metrics : []
  };

  // restart polling immediately on config change
  startPolling();
  return { ok: true };
});

function toQueueId(queueName) {
  return String(queueName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fetchQueueMetrics(queueId) {
  const url = `${BROKER_BASE_URL}/v1/queues/${encodeURIComponent(queueId)}/stats`;
  const res = await fetch(url);

  if (!res.ok) throw new Error(`Broker ${res.status} for ${queueId}`);
  const json = await res.json();
  return json.metrics || {};
}

function metricsToRow(queueName, m) {
  return {
    queue: queueName,

    // map broker keys -> renderer row keys
    waiting: m.oWaiting ?? 0,
    interacting: m.oInteracting ?? 0,
    onQueueUsers: m.oOnQueueUsers ?? 0,
    offQueueUsers: m.oOffQueueUsers ?? 0,
    longestWaiting: m.oLongestWaiting ?? 0,

    asa: m.asa ?? 0,
    aht: m.aht ?? 0,
    avgWait: m.avgWait ?? 0,
    answerPct: m.answerPercent ?? 0,
    abandonPct: m.abandonPercent ?? 0,
    serviceLevelPct: m.serviceLevelPercent ?? 0
  };
}

async function buildPayloadFromBroker() {
  const queues = pollConfig.queues || [];

  const rows = await Promise.all(
    queues.map(async (qName) => {
      const queueId = toQueueId(qName);
      try {
        const metrics = await fetchQueueMetrics(queueId);
        return metricsToRow(qName, metrics);
      } catch (e) {
        // safe fallback row so UI never breaks
        return metricsToRow(qName, {});
      }
    })
  );

  return {
    queues: pollConfig.queues,
    metrics: pollConfig.metrics,
    rows,
    updatedAt: Date.now()
  };
}

/*
// ---- mock polling (replace with Genesys provider later) ----
function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}

function generateMockRows(queues) {
  return queues.map((q) => ({
    queue: q,
    waiting: Math.floor(Math.random() * 15),
    interacting: Math.floor(Math.random() * 10),
    onQueueUsers: 3 + Math.floor(Math.random() * 15),
    offQueueUsers: Math.floor(Math.random() * 5),
    longestWaiting: Math.floor(Math.random() * 600),

    asa: 10 + Math.floor(Math.random() * 80),
    aht: 180 + Math.floor(Math.random() * 300),
    avgWait: 10 + Math.floor(Math.random() * 120),
    answerPct: 80 + Math.floor(Math.random() * 20),
    abandonPct: Math.floor(Math.random() * 16),
    serviceLevelPct: 70 + Math.floor(Math.random() * 25)
  }));
}

function buildPayload() {
  // keep the payload aligned with your renderer’s expectations
  return {
    queues: pollConfig.queues,
    metrics: pollConfig.metrics,
    rows: generateMockRows(pollConfig.queues),
    // optional convenience fields (not required by renderer)
    updatedAt: Date.now()
  };
}
*/

function broadcast(payload) {
  latestStats = payload;
  latestStatsAt = Date.now();
  if (mainWindow) {
    mainWindow.webContents.send("stats:updated", {
      data: latestStats,
      updatedAt: latestStatsAt
    });
  }
}

/*function startPolling() {
  if (pollTimer) clearInterval(pollTimer);

  // don’t poll if we don’t have queues selected yet
  if (!pollConfig.queues || pollConfig.queues.length === 0) return;

  // run immediately, then interval
  broadcast(buildPayload());
  pollTimer = setInterval(() => {
    broadcast(buildPayload());
  }, pollIntervalMs);
}
*/
let pollInFlight = false;

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);

  if (!pollConfig.queues || pollConfig.queues.length === 0) return;

  const tick = async () => {
    if (pollInFlight) return;
    pollInFlight = true;
    try {
      const payload = await buildPayloadFromBroker();
      broadcast(payload);
    } finally {
      pollInFlight = false;
    }
  };

  tick(); // run immediately
  pollTimer = setInterval(tick, pollIntervalMs);
}

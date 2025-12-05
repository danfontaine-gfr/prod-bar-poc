// Simulated queue metrics
function getFakeMetrics() {
    const waiting = Math.floor(Math.random() * 12);       // 0–11
    const longestWait = Math.floor(Math.random() * 180);  // seconds
    const statusOptions = ["On Queue", "Idle", "Busy", "Offline"];
    const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];

    return {
        queueName: "Support",
        waiting,
        longestWait,
        status
    };
}

// Format seconds -> mm:ss
function formatTime(sec) {
    let m = Math.floor(sec / 60).toString().padStart(2, "0");
    let s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

// Update the UI
function updateBar() {
    const m = getFakeMetrics();
    document.getElementById("queueName").textContent = `Queue: ${m.queueName}`;
    document.getElementById("waiting").textContent = `Waiting: ${m.waiting}`;
    document.getElementById("longestWait").textContent = `Longest Wait: ${formatTime(m.longestWait)}`;
    document.getElementById("agentStatus").textContent = `Status: ${m.status}`;

    const bar = document.getElementById("prodBar");

    // Remove previous color classes
    bar.classList.remove("green", "yellow", "red");

    // Simple load-based color logic
    if (m.waiting <= 3) bar.classList.add("green");
    else if (m.waiting <= 7) bar.classList.add("yellow");
    else bar.classList.add("red");
}

// Run updates every 3 seconds
setInterval(updateBar, 3000);
updateBar();

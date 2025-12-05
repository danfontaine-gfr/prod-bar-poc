const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
  width: 600,
  height: 70,
  minWidth: 500,
  maxWidth: 1400,
  alwaysOnTop: true,
  frame: false,
  transparent: true,
  resizable: true,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false
  }
});

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

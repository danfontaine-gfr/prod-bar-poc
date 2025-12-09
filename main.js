const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,                 // initial guess; will be auto-resized
    height: 70,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,           // we control size programmatically
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Receive size hints from renderer and adjust window size
ipcMain.on('resize-window', (event, size) => {
  if (!mainWindow || !size) return;

  const minWidth = 320;
  const minHeight = 48;

  const width = Math.max(minWidth, Math.round(size.width));
  const height = Math.max(minHeight, Math.round(size.height));

  mainWindow.setContentSize(width, height);
});

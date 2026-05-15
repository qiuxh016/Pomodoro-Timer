const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } = require('electron');
const path = require('path');

// Single instance lock - prevent multiple cats
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow = null;
let tray = null;
let isPanelExpanded = false;

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 140,
    height: 180,
    x: screenWidth - 190,
    y: screenHeight - 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // macOS-specific: show on all workspaces
  if (process.platform === 'darwin') {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
}

function createTray() {
  // Generate a simple cat icon as a 16x16 PNG data URL
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABkklEQVQ4T42Ty0tUYRjGf993zj1zZhxHZ5xCL9OMhIRFhAi5iBaBi6BFiyCIVkH9A0EQ7dq0i6BFmyhoE7QpgtpEEK1ChAilRRqoqYGZlkg5jqPjXGacmXPOOeft8n1eHniX74eHj+d9X+A/I0cUSc6eUS0BSJ5+zQBSIAlycgHEURJUIhkLqIr8KwFxCNA8fCaotAkkAHUSeFBRwAQ4W5XAVARwP4AExOT7jG6OG4wG5FIFePYcjEUDKtsB2WwIIAvMD8BkK3DBq8GmB4DP9ib06VVIP6T1vX3wWIAjBJADdutgWwGV38DvABHfhEZUqIVoBiN7Dv2LUA4Sh6pg2AiZqoR+AIQCsFEFml24q4HeCJImhLQZGNiHo1VgOuCzBm0VwgBcWDt8B1SfYHnv4cF7F05u5AtZkFcW/tAODI5AGMh8AHPbcN8BBmFoAQYicLQCyROg+mXaIV+AkS2wb4DpSVA0E2S1ndqkC6uH8DsHFgGrOnIqwKkUXGpKB0AzZIsABW5WQbKAJAAK6zr4dP/wPMlADLAQkZ4m5G5S8Bd+3HU/EL5icAAAAABJRU5ErkJggg=='
  );
  tray = new Tray(icon);
  tray.setToolTip('猫咪番茄钟');

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示/隐藏猫咪', click: () => {
      if (mainWindow) {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      }
    }},
    { label: '重置位置', click: () => {
      if (mainWindow) {
        const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
        mainWindow.setPosition(sw - 190, sh - 300);
      }
    }},
    { type: 'separator' },
    { label: '退出', click: () => { app.quit(); }}
  ]);
  tray.setContextMenu(contextMenu);
}

// IPC handlers
ipcMain.handle('resize-window', (event, { width, height }) => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    const currentHeight = mainWindow.getSize()[1];
    const centerY = y + currentHeight / 2;
    const newY = Math.round(centerY - height / 2);

    // Use setBounds for atomic resize + reposition
    mainWindow.setBounds({
      x, y: Math.max(0, newY),
      width, height
    });
    isPanelExpanded = width > 200;
  }
  return isPanelExpanded;
});

ipcMain.handle('get-window-position', () => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    return { x, y };
  }
  return { x: 0, y: 0 };
});

ipcMain.handle('set-window-position', (event, { x, y }) => {
  if (mainWindow) {
    mainWindow.setPosition(Math.round(x), Math.round(y));
  }
});

ipcMain.handle('get-is-expanded', () => {
  return isPanelExpanded;
});

ipcMain.handle('set-skip-taskbar', (event, skip) => {
  if (mainWindow) {
    mainWindow.setSkipTaskbar(skip);
  }
});

// If second instance launched, focus existing window
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // Don't quit on window close for macOS
});

app.on('before-quit', () => {
  if (tray) tray.destroy();
});

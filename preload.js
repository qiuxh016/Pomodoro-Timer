const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  resizeWindow: (size) => ipcRenderer.invoke('resize-window', size),
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
  setWindowPosition: (pos) => ipcRenderer.invoke('set-window-position', pos),
  getIsExpanded: () => ipcRenderer.invoke('get-is-expanded'),
  setSkipTaskbar: (skip) => ipcRenderer.invoke('set-skip-taskbar', skip),
  quitApp: () => ipcRenderer.invoke('quit-app')
});

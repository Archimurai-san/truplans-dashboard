const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFile:       ()         => ipcRenderer.invoke('dialog:openFile'),
  openPath:       (filePath) => ipcRenderer.invoke('shell-open-path',     filePath),
  openExternal:   (url)      => ipcRenderer.invoke('shell-open-external', url),
  readFileBase64: (filePath) => ipcRenderer.invoke('read-file-base64',    filePath),
  focusWindow:    ()         => ipcRenderer.invoke('focus-window'),
  getFilePath:    (filePath) => {
    if (!filePath) return ''
    const clean = filePath.replace(/\\/g, '/')
    return clean.startsWith('file:///') ? clean : 'file:///' + clean
  }
})

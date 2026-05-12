const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFile:       ()         => ipcRenderer.invoke('dialog:openFile'),
  openPath:       (filePath) => ipcRenderer.invoke('shell-open-path',     filePath),
  openExternal:   (url)      => ipcRenderer.invoke('open-external', url),
  readFileBase64: (filePath) => ipcRenderer.invoke('read-file-base64',    filePath),
  focusWindow:           ()       => ipcRenderer.invoke('focus-window'),
  generateWeeklyReport:  (data)  => ipcRenderer.invoke('generate-weekly-report', data),
  showNotification:      (opts)  => ipcRenderer.invoke('show-notification', opts),
  analyseContract:       (payload) => ipcRenderer.invoke('analyse-contract', payload),
  onOpenProject:         (cb)    => {
    const handler = (_e, id) => cb(id)
    ipcRenderer.on('open-project', handler)
    return () => ipcRenderer.removeListener('open-project', handler)
  },
  getFilePath:    (filePath) => {
    if (!filePath) return ''
    const clean = filePath.replace(/\\/g, '/')
    return clean.startsWith('file:///') ? clean : 'file:///' + clean
  }
})

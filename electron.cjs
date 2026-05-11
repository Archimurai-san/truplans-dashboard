const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'TruPlans Dashboard',
    icon: path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
    autoHideMenuBar: true,
  })
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
  mainWindow.on('closed', () => { mainWindow = null })
}

ipcMain.handle('shell-open-path', async (_event, filePath) => {
  return await shell.openPath(filePath)
})

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('shell-open-external', async (_event, url) => {
  return await shell.openExternal(url)
})

ipcMain.handle('read-file-base64', async (_event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath)
    return buffer.toString('base64')
  } catch (err) {
    return null
  }
})

ipcMain.handle('focus-window', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
})

app.disableHardwareAcceleration()
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

const { app, BrowserWindow, ipcMain, shell, dialog, Notification } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

let mainWindow
let serverProcess = null

function startServer() {
  const { execSync } = require('child_process')
  try {
    execSync('npx kill-port 3001', { stdio: 'ignore' })
  } catch {}

  setTimeout(() => {
    const serverPath = path.join(__dirname, 'server.js')
    serverProcess = spawn(process.execPath, [serverPath], {
      cwd: __dirname,
      stdio: 'ignore',
      detached: false
    })
    serverProcess.on('error', (err) => console.error('Server error:', err))
  }, 1000)
}

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

ipcMain.handle('open-external', async (_event, url) => {
  const { shell } = require('electron')
  await shell.openExternal(url)
  return true
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

ipcMain.handle('show-notification', (_event, { title, body, projectId }) => {
  if (!Notification.isSupported()) return
  const n = new Notification({ title, body, silent: false })
  n.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      if (projectId) mainWindow.webContents.send('open-project', projectId)
    }
  })
  n.show()
})

function buildReportHTML(data) {
  const fmt$ = n => '$' + Number(n || 0).toLocaleString('en-US')
  const slaBadge = p => {
    if (p.slaIsExternal) return `<span class="badge badge-ext">⏸ External</span>`
    if (p.slaZone === 'red')   return `<span class="badge badge-red">🔴 RED W${p.slaWeek}</span>`
    if (p.slaZone === 'amber') return `<span class="badge badge-amber">🟡 W${p.slaWeek}</span>`
    if (p.slaZone === 'green') return `<span class="badge badge-green">W${p.slaWeek}✓</span>`
    return `<span class="badge badge-ext">—</span>`
  }
  const redZone = data.projects.filter(p => p.slaZone === 'red')
  const totalContract  = data.projects.reduce((a, p) => a + (p.contract  || 0), 0)
  const totalCollected = data.projects.reduce((a, p) => a + (p.collected || 0), 0)
  const totalInvoiced  = data.projects.reduce((a, p) => a + (p.invoiced  || 0), 0)
  const totalOutstanding = data.projects.reduce((a, p) => a + (p.outstanding || 0), 0)

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Georgia,serif;color:#1a1a2e;background:#fff;padding:40px;font-size:12px;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:14px;border-bottom:3px solid #e94560;}
    .logo{font-size:22px;font-weight:700;color:#e94560;font-family:monospace;letter-spacing:3px;}
    .logo-sub{font-size:10px;color:#888;margin-top:3px;font-family:monospace;}
    .report-title{font-size:15px;font-weight:700;color:#1a1a2e;text-align:right;}
    .report-date{font-size:10px;color:#888;margin-top:3px;font-family:monospace;text-align:right;}
    .kpi-row{display:flex;gap:10px;margin-bottom:24px;}
    .kpi{flex:1;background:#f8f8f8;border-radius:6px;padding:12px 14px;border-top:3px solid #e94560;}
    .kpi-label{font-size:8px;color:#888;letter-spacing:2px;text-transform:uppercase;font-family:monospace;margin-bottom:5px;}
    .kpi-value{font-size:17px;font-weight:700;font-family:monospace;}
    .section{margin-bottom:24px;}
    .section-title{font-size:10px;font-weight:700;color:#e94560;letter-spacing:2px;text-transform:uppercase;font-family:monospace;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #e9456033;}
    table{width:100%;border-collapse:collapse;font-size:10.5px;}
    th{text-align:left;padding:6px 8px;font-size:8.5px;color:#888;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1.5px solid #ddd;background:#f8f8f8;font-family:monospace;white-space:nowrap;}
    td{padding:7px 8px;border-bottom:1px solid #eee;vertical-align:middle;}
    tr:last-child td{border-bottom:none;}
    tr:nth-child(even) td{background:#fafafa;}
    .badge{display:inline-block;padding:2px 7px;border-radius:99px;font-size:8.5px;font-weight:700;font-family:monospace;white-space:nowrap;}
    .badge-red{background:#fde8e8;color:#c0392b;}
    .badge-amber{background:#fff8e1;color:#d68910;}
    .badge-green{background:#e8f5e9;color:#27ae60;}
    .badge-ext{background:#f5f5f5;color:#888;}
    .alert-box{background:#fde8e8;border-left:4px solid #e74c3c;border-radius:4px;padding:9px 13px;margin-bottom:8px;}
    .alert-title{font-size:11px;font-weight:700;color:#c0392b;font-family:monospace;}
    .alert-body{font-size:10px;color:#666;margin-top:2px;}
    .prog-wrap{height:5px;background:#eee;border-radius:99px;overflow:hidden;width:68px;display:inline-block;vertical-align:middle;margin-right:4px;}
    .prog-fill{height:100%;border-radius:99px;}
    .wl-row{display:flex;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid #eee;}
    .wl-row:last-child{border-bottom:none;}
    .wl-name{font-family:monospace;font-size:11px;font-weight:700;min-width:80px;}
    .wl-bar{flex:1;height:8px;background:#eee;border-radius:4px;overflow:hidden;}
    .wl-fill{height:100%;border-radius:4px;}
    .wl-count{font-family:monospace;font-size:10px;color:#888;min-width:100px;text-align:right;}
    .total-row td{border-top:2px solid #ccc;font-weight:700;background:#f0f0f0!important;}
    .footer{margin-top:28px;padding-top:10px;border-top:1px solid #eee;font-size:9px;color:#bbb;font-family:monospace;display:flex;justify-content:space-between;}
    @page{margin:0.5in;}
    .no-break{page-break-inside:avoid;}
  </style></head><body>

  <div class="header">
    <div><div class="logo">TRUPLANS</div><div class="logo-sub">Project Management Dashboard</div></div>
    <div><div class="report-title">Weekly Status Report</div><div class="report-date">Generated: ${data.generatedAt}</div><div class="report-date">${data.projects.length} active projects</div></div>
  </div>

  <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">Active Projects</div><div class="kpi-value" style="color:#1565c0">${data.projects.length}</div></div>
    <div class="kpi"><div class="kpi-label">🔴 Red Zone</div><div class="kpi-value" style="color:#c0392b">${redZone.length}</div></div>
    <div class="kpi"><div class="kpi-label">Total Contract</div><div class="kpi-value">${fmt$(totalContract)}</div></div>
    <div class="kpi"><div class="kpi-label">Collected</div><div class="kpi-value" style="color:#27ae60">${fmt$(totalCollected)}</div></div>
    <div class="kpi"><div class="kpi-label">Outstanding</div><div class="kpi-value" style="color:#e67e22">${fmt$(totalOutstanding)}</div></div>
  </div>

  ${redZone.length > 0 ? `<div class="section no-break">
    <div class="section-title">🔴 Red Zone — Immediate Action Required</div>
    ${redZone.map(p => `<div class="alert-box">
      <div class="alert-title">${p.id} — ${p.name}${p.client ? ' · ' + p.client : ''}</div>
      <div class="alert-body">Designer: ${p.designer} &nbsp;·&nbsp; Week ${p.slaWeek} of SLA &nbsp;·&nbsp; ${p.slaDaysRemaining < 0 ? Math.abs(p.slaDaysRemaining) + ' days OVER deadline' : p.slaDaysRemaining + ' days remaining'} &nbsp;·&nbsp; Phase: ${p.phase || '—'}</div>
    </div>`).join('')}
  </div>` : ''}

  <div class="section">
    <div class="section-title">All Project Status</div>
    <table><thead><tr><th>Job #</th><th>Project</th><th>Client</th><th>Designer</th><th>Phase</th><th>SLA</th><th>Progress</th><th>Contract</th></tr></thead>
    <tbody>${data.projects.map(p => `<tr>
      <td style="font-family:monospace;font-weight:700;color:#e94560;font-size:9.5px">${p.id}</td>
      <td style="font-weight:600">${p.name}</td>
      <td style="color:#555;font-size:10px">${p.client || '—'}</td>
      <td style="font-family:monospace;font-size:10px">${p.designer}</td>
      <td style="color:#555;font-size:10px">${p.phase || '—'}</td>
      <td>${slaBadge(p)}</td>
      <td><span class="prog-wrap"><span class="prog-fill" style="width:${p.pct}%;background:${p.pct===100?'#27ae60':'#e94560'}"></span></span><span style="font-family:monospace;font-size:9.5px">${p.pct}%</span></td>
      <td style="font-family:monospace;font-weight:700;font-size:10px">${p.contract > 0 ? fmt$(p.contract) : '—'}</td>
    </tr>`).join('')}</tbody></table>
  </div>

  <div class="section">
    <div class="section-title">Payment Summary</div>
    <table><thead><tr><th>Job #</th><th>Project</th><th>Designer</th><th>Contract</th><th>Collected</th><th>Invoiced</th><th>Outstanding</th></tr></thead>
    <tbody>${data.projects.filter(p => p.contract > 0).map(p => `<tr>
      <td style="font-family:monospace;font-weight:700;color:#e94560;font-size:9.5px">${p.id}</td>
      <td style="font-weight:600">${p.name}</td>
      <td style="font-family:monospace;font-size:10px">${p.designer}</td>
      <td style="font-family:monospace;font-size:10px">${fmt$(p.contract)}</td>
      <td style="font-family:monospace;color:#27ae60;font-weight:700;font-size:10px">${fmt$(p.collected)}</td>
      <td style="font-family:monospace;color:#d68910;font-size:10px">${fmt$(p.invoiced)}</td>
      <td style="font-family:monospace;color:${(p.outstanding||0)>0?'#e67e22':'#27ae60'};font-weight:700;font-size:10px">${fmt$(p.outstanding)}</td>
    </tr>`).join('')}
    <tr class="total-row"><td colspan="3">TOTAL</td><td style="font-family:monospace;font-size:10px">${fmt$(totalContract)}</td><td style="font-family:monospace;color:#27ae60;font-size:10px">${fmt$(totalCollected)}</td><td style="font-family:monospace;color:#d68910;font-size:10px">${fmt$(totalInvoiced)}</td><td style="font-family:monospace;color:#e67e22;font-size:10px">${fmt$(totalOutstanding)}</td></tr>
    </tbody></table>
  </div>

  <div class="section no-break">
    <div class="section-title">Designer Workload</div>
    <div style="padding:4px 0">${data.designers.map(d => `<div class="wl-row">
      <div class="wl-name">${d.name}</div>
      <div class="wl-bar"><div class="wl-fill" style="width:${Math.min(d.active/6*100,100)}%;background:${d.active>=5?'#e74c3c':d.active>=3?'#f39c12':'#27ae60'}"></div></div>
      <div class="wl-count">${d.active} active &nbsp;·&nbsp; ${d.asLead} as lead</div>
    </div>`).join('')}</div>
  </div>

  <div class="footer"><span>TruPlans Dashboard — Weekly Status Report</span><span>Generated ${data.generatedAt} · CONFIDENTIAL</span></div>
  </body></html>`
}

ipcMain.handle('generate-weekly-report', async (_event, data) => {
  const tmpFile = path.join(app.getPath('temp'), 'truplans_report_tmp.html')
  const html = buildReportHTML(data)
  fs.writeFileSync(tmpFile, html, 'utf8')

  const win = new BrowserWindow({
    width: 1200, height: 900, show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  })

  try {
    await win.loadFile(tmpFile)
    const pdfBuffer = await win.webContents.printToPDF({
      pageSize: 'Letter',
      printBackground: true,
    })
    const desktopPath = app.getPath('desktop')
    const filename = `TruPlans_Weekly_Report_${data.date}.pdf`
    const filepath = path.join(desktopPath, filename)
    fs.writeFileSync(filepath, pdfBuffer)
    return { ok: true, filepath }
  } finally {
    win.close()
    try { fs.unlinkSync(tmpFile) } catch {}
  }
})

app.disableHardwareAcceleration()
app.whenReady().then(() => {
  startServer()
  setTimeout(createWindow, 3000)
})

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

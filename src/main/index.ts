import { app, shell, BrowserWindow, nativeTheme, Notification } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './db'
import { registerAllIpcHandlers } from './ipc'
import { SchedulerService } from './services/scheduler.service'

let mainWindow: BrowserWindow | null = null

function checkLowStockNotification(): void {
  if (!Notification.isSupported()) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ProductModel } = require('./db/models/product.model') as typeof import('./db/models/product.model')
    const items = ProductModel.getLowStockItems() as { name: string; stock_qty: number }[]
    if (items.length === 0) return
    const outOfStock = items.filter((i) => i.stock_qty === 0).length
    const body =
      outOfStock > 0
        ? `${items.length} 項低庫存，其中 ${outOfStock} 項已售完`
        : `${items.length} 項商品庫存低於補貨點，請盡快補貨`
    new Notification({ title: 'SkillCraft IMS — 庫存警示', body, silent: false }).show()
  } catch {
    // Ignore notification errors silently
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    checkLowStockNotification()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  app.setAboutPanelOptions({
    applicationName: 'SkillCraft IMS',
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
    copyright: '進銷存管理系統 — 高等程式語言與軟體設計期末專案'
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.skillcraft.ims')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Force dark mode
  nativeTheme.themeSource = 'dark'

  // Set dock icon (dev mode uses default Electron icon)
  if (process.platform === 'darwin' && app.dock) {
    const { nativeImage } = await import('electron')
    const iconPath = join(__dirname, '../../resources/icon.png')
    const icon = nativeImage.createFromPath(iconPath)
    if (!icon.isEmpty()) app.dock.setIcon(icon)
  }

  // Initialize SQLite database
  await initDatabase()

  // Register all IPC handlers
  registerAllIpcHandlers()

  // Start scheduled sync (if configured)
  SchedulerService.getInstance().start()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  SchedulerService.getInstance().stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

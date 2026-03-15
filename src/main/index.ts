import { app, shell, BrowserWindow, nativeTheme, Notification, ipcMain } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './db'
import { registerAllIpcHandlers } from './ipc'
import { SchedulerService } from './services/scheduler.service'

// Set app name before ready so macOS menu bar shows correct name in dev mode
app.name = 'SkillCraft IMS'

// Pin userData path to a stable location independent of app.name.
// Without this, changing app.name to include spaces ('SkillCraft IMS') would
// move the userData directory from 'skillcraft-ims/' to 'SkillCraft IMS/',
// causing the app to lose access to the user's existing settings and database.
app.setPath('userData', join(app.getPath('appData'), 'SkillCraft IMS'))

let mainWindow: BrowserWindow | null = null

interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  maximized: boolean
}

const DEFAULT_WINDOW_STATE: WindowState = { width: 1280, height: 800, maximized: false }

function getWindowStatePath(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

function loadWindowState(): WindowState {
  try {
    const raw = readFileSync(getWindowStatePath(), 'utf-8')
    return { ...DEFAULT_WINDOW_STATE, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_WINDOW_STATE }
  }
}

function saveWindowState(win: BrowserWindow): void {
  try {
    const maximized = win.isMaximized()
    const bounds = win.getBounds()
    const state: WindowState = maximized
      ? { width: bounds.width, height: bounds.height, x: bounds.x, y: bounds.y, maximized: true }
      : { ...bounds, maximized: false }
    writeFileSync(getWindowStatePath(), JSON.stringify(state), 'utf-8')
  } catch {
    // Ignore save errors silently
  }
}

function checkPaymentDueNotifications(): void {
  try {
    const { getDb } = require('./db') as typeof import('./db')
    const { insertNotification } = require('./ipc/notifications.ipc') as typeof import('./ipc/notifications.ipc')
    const db = getDb()
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

    type DueRow = { order_no: string; payment_due_date: string; total_amount: number }

    const purchaseDue = db.prepare(
      `SELECT order_no, payment_due_date, total_amount
       FROM purchase_orders
       WHERE payment_status = 'unpaid' AND payment_due_date IS NOT NULL
         AND payment_due_date <= ? AND status = 'received'`
    ).all(tomorrow) as DueRow[]

    const salesDue = db.prepare(
      `SELECT order_no, payment_due_date, total_amount
       FROM sales_orders
       WHERE payment_status = 'unpaid' AND payment_due_date IS NOT NULL
         AND payment_due_date <= ? AND status = 'completed'`
    ).all(tomorrow) as DueRow[]

    const allDue = [
      ...purchaseDue.map(r => ({ ...r, kind: 'purchase' as const })),
      ...salesDue.map(r => ({ ...r, kind: 'sales' as const }))
    ]

    if (allDue.length === 0) return

    const overdue = allDue.filter(r => r.payment_due_date < today)
    const dueToday = allDue.filter(r => r.payment_due_date === today)
    const dueTomorrow = allDue.filter(r => r.payment_due_date === tomorrow)

    // OS notifications
    if (Notification.isSupported()) {
      if (overdue.length > 0) {
        const preview = overdue.slice(0, 3).map(r => r.order_no).join('、')
        const extra = overdue.length > 3 ? `…等共 ${overdue.length} 筆` : ''
        new Notification({ title: '⚠️ 帳款逾期提醒', body: preview + extra, silent: false }).show()
      }
      if (dueToday.length > 0) {
        new Notification({
          title: '🔔 帳款今日到期',
          body: `${dueToday.length} 筆帳款今日到期，請盡快處理`,
          silent: false
        }).show()
      }
      if (dueTomorrow.length > 0) {
        new Notification({
          title: '📅 帳款明日到期',
          body: `${dueTomorrow.length} 筆帳款明日到期`,
          silent: true
        }).show()
      }
    }

    // In-app notifications (max 10, overdue first)
    const toInsert = [...overdue, ...dueToday, ...dueTomorrow].slice(0, 10)
    for (const r of toInsert) {
      // De-dup: skip if same order_no already notified today
      const existing = db.prepare(
        `SELECT id FROM app_notifications WHERE body LIKE ? AND created_at >= date('now')`
      ).get(`%${r.order_no}%`)
      if (existing) continue

      const isOverdue = r.payment_due_date < today
      const isToday = r.payment_due_date === today
      const label = isOverdue ? '逾期' : isToday ? '今日到期' : '明日到期'
      const type = isOverdue ? 'payment_overdue' : isToday ? 'payment_due_today' : 'payment_due_soon'
      const link = r.kind === 'purchase' ? '/purchases' : '/sales'
      insertNotification(type, `💳 帳款${label}`, `${r.order_no} 帳款${label}，金額 $${r.total_amount.toLocaleString()}`, link)
    }
  } catch {
    // Silent fail
  }
}

function checkLowStockNotification(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ProductModel } = require('./db/models/product.model') as typeof import('./db/models/product.model')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { insertNotification } = require('./ipc/notifications.ipc') as typeof import('./ipc/notifications.ipc')
    const { getDb } = require('./db') as typeof import('./db')

    const items = ProductModel.getLowStockItems() as { name: string; stock_qty: number }[]
    if (items.length === 0) return

    const outOfStock = items.filter((i) => i.stock_qty === 0).length
    const body =
      outOfStock > 0
        ? `${items.length} 項低庫存，其中 ${outOfStock} 項已售完`
        : `${items.length} 項商品庫存低於補貨點，請盡快補貨`

    // 寫入 app_notifications（每天最多一筆，避免重複）
    const db = getDb()
    const alreadyToday = db
      .prepare(`SELECT id FROM app_notifications WHERE type = 'low_stock' AND date(created_at) = date('now') LIMIT 1`)
      .get()
    if (!alreadyToday) {
      insertNotification('low_stock', '庫存警示', body, '/products')
    }

    // OS 系統通知
    if (Notification.isSupported()) {
      new Notification({ title: 'SkillCraft IMS — 庫存警示', body, silent: false }).show()
    }
  } catch {
    // Ignore notification errors silently
  }
}

function createWindow(): void {
  const winState = loadWindowState()

  mainWindow = new BrowserWindow({
    width: winState.width,
    height: winState.height,
    x: winState.x,
    y: winState.y,
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

  if (winState.maximized) {
    mainWindow.maximize()
  }

  mainWindow.on('close', () => {
    saveWindowState(mainWindow!)
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    checkLowStockNotification()
    checkPaymentDueNotifications()
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
    copyright: '進銷存管理系統 — 高等程式語言與軟體設計期末專案',
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.skillcraft.ims')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // A11y Rule 80: IPC handlers for nativeTheme system preference
  ipcMain.handle('app:getNativeTheme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
  ipcMain.handle('app:setNativeTheme', (_e, source: 'light' | 'dark' | 'system') => {
    nativeTheme.themeSource = source
  })

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

import { contextBridge, ipcRenderer } from 'electron'

// Type-safe IPC bridge exposed to renderer
const electronAPI = {
  // Products
  products: {
    getAll: (filters?: { category?: string; search?: string; lowStock?: boolean }) =>
      ipcRenderer.invoke('products:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('products:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('products:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('products:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('products:delete', id),
    getCategories: () => ipcRenderer.invoke('products:getCategories'),
    getLowStock: () => ipcRenderer.invoke('products:getLowStock'),
    adjust: (productId: number, delta: number, reason: string, note?: string) =>
      ipcRenderer.invoke('products:adjust', productId, delta, reason, note),
    getAdjustmentHistory: (productId: number) =>
      ipcRenderer.invoke('products:getAdjustmentHistory', productId)
  },

  // Suppliers
  suppliers: {
    getAll: (search?: string) => ipcRenderer.invoke('suppliers:getAll', search),
    getById: (id: number) => ipcRenderer.invoke('suppliers:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('suppliers:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('suppliers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('suppliers:delete', id)
  },

  // Customers
  customers: {
    getAll: (search?: string) => ipcRenderer.invoke('customers:getAll', search),
    getById: (id: number) => ipcRenderer.invoke('customers:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('customers:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('customers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('customers:delete', id)
  },

  // Purchases
  purchases: {
    getAll: (filters?: { status?: string; search?: string }) =>
      ipcRenderer.invoke('purchases:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('purchases:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('purchases:create', data),
    receive: (id: number) => ipcRenderer.invoke('purchases:receive', id),
    cancel: (id: number) => ipcRenderer.invoke('purchases:cancel', id),
    delete: (id: number) => ipcRenderer.invoke('purchases:delete', id)
  },

  // Sales
  sales: {
    getAll: (filters?: { status?: string; search?: string }) =>
      ipcRenderer.invoke('sales:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('sales:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('sales:create', data),
    complete: (id: number) => ipcRenderer.invoke('sales:complete', id),
    cancel: (id: number) => ipcRenderer.invoke('sales:cancel', id),
    delete: (id: number) => ipcRenderer.invoke('sales:delete', id)
  },

  // Reports
  reports: {
    kpis: () => ipcRenderer.invoke('reports:kpis'),
    salesTrend: (days?: number) => ipcRenderer.invoke('reports:salesTrend', days),
    inventoryByCategory: () => ipcRenderer.invoke('reports:inventoryByCategory'),
    topProducts: (days?: number) => ipcRenderer.invoke('reports:topProducts', days),
    lowStock: () => ipcRenderer.invoke('reports:lowStock')
  },

  // Sync
  sync: {
    trigger: (direction: 'push' | 'pull' | 'bidirectional') =>
      ipcRenderer.invoke('sync:trigger', direction),
    status: () => ipcRenderer.invoke('sync:status'),
    testConnection: () => ipcRenderer.invoke('sync:testConnection'),
    initSheetStructure: () => ipcRenderer.invoke('sync:initSheetStructure'),
    onProgress: (cb: (data: { message: string }) => void) =>
      ipcRenderer.on('sync:progress', (_e, data) => cb(data)),
    onCompleted: (cb: (data: { recordsSynced: number }) => void) =>
      ipcRenderer.on('sync:completed', (_e, data) => cb(data)),
    onError: (cb: (data: { error: string }) => void) =>
      ipcRenderer.on('sync:error', (_e, data) => cb(data)),
    removeListeners: () => {
      ipcRenderer.removeAllListeners('sync:progress')
      ipcRenderer.removeAllListeners('sync:completed')
      ipcRenderer.removeAllListeners('sync:error')
    }
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    setAll: (data: Record<string, string>) => ipcRenderer.invoke('settings:setAll', data)
  },

  // Global search
  search: {
    global: (query: string) => ipcRenderer.invoke('search:global', query)
  },

  // Shell
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type declaration for renderer TypeScript
export type ElectronAPI = typeof electronAPI

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
      ipcRenderer.invoke('products:getAdjustmentHistory', productId),
    getAllAdjustments: (filters?: { search?: string; reason?: string; dateFrom?: string; dateTo?: string; limit?: number }) =>
      ipcRenderer.invoke('products:getAllAdjustments', filters),
    batchDelete: (ids: number[]) => ipcRenderer.invoke('products:batchDelete', ids),
    batchUpdate: (ids: number[], data: { category?: string }) => ipcRenderer.invoke('products:batchUpdate', ids, data),
    batchUpdatePrice: (ids: number[], mode: 'set' | 'increase' | 'decrease', target: 'sell_price' | 'buy_price' | 'both', amount: number, amountType: 'fixed' | 'percent') =>
      ipcRenderer.invoke('products:batchUpdatePrice', ids, mode, target, amount, amountType),
    getPriceHistory: (productId: number) => ipcRenderer.invoke('products:getPriceHistory', productId),
    nextSku: (category: string) => ipcRenderer.invoke('products:nextSku', category),
    getImage: (id: number) => ipcRenderer.invoke('products:getImage', id),
    setImage: (id: number, base64: string | null) => ipcRenderer.invoke('products:setImage', id, base64)
  },

  // Suppliers
  suppliers: {
    getAll: (search?: string) => ipcRenderer.invoke('suppliers:getAll', search),
    getById: (id: number) => ipcRenderer.invoke('suppliers:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('suppliers:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('suppliers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('suppliers:delete', id),
    getOrders: (supplierId: number) => ipcRenderer.invoke('suppliers:getOrders', supplierId),
    getOutstanding: (supplierId: number) => ipcRenderer.invoke('suppliers:getOutstanding', supplierId)
  },

  // Customers
  customers: {
    getAll: (search?: string) => ipcRenderer.invoke('customers:getAll', search),
    getById: (id: number) => ipcRenderer.invoke('customers:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('customers:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('customers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('customers:delete', id),
    getOrders: (customerId: number) => ipcRenderer.invoke('customers:getOrders', customerId),
    getOutstanding: (customerId: number) => ipcRenderer.invoke('customers:getOutstanding', customerId)
  },

  // Purchases
  purchases: {
    getAll: (filters?: { status?: string; search?: string; dateFrom?: string; dateTo?: string }) =>
      ipcRenderer.invoke('purchases:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('purchases:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('purchases:create', data),
    receive: (id: number) => ipcRenderer.invoke('purchases:receive', id),
    cancel: (id: number) => ipcRenderer.invoke('purchases:cancel', id),
    return: (id: number) => ipcRenderer.invoke('purchases:return', id),
    delete: (id: number) => ipcRenderer.invoke('purchases:delete', id),
    markPaid: (id: number) => ipcRenderer.invoke('purchases:markPaid', id),
    setPaymentDue: (id: number, dueDate: string) => ipcRenderer.invoke('purchases:setPaymentDue', id, dueDate),
    batchReceive: (ids: number[]) => ipcRenderer.invoke('purchases:batchReceive', ids),
    batchCancel: (ids: number[]) => ipcRenderer.invoke('purchases:batchCancel', ids),
    getStatusHistory: (orderId: number) => ipcRenderer.invoke('purchases:getStatusHistory', orderId),
    updateNotes: (id: number, notes: string) => ipcRenderer.invoke('purchases:updateNotes', id, notes)
  },

  // Sales
  sales: {
    getAll: (filters?: { status?: string; search?: string; dateFrom?: string; dateTo?: string }) =>
      ipcRenderer.invoke('sales:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('sales:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('sales:create', data),
    complete: (id: number) => ipcRenderer.invoke('sales:complete', id),
    cancel: (id: number) => ipcRenderer.invoke('sales:cancel', id),
    return: (id: number) => ipcRenderer.invoke('sales:return', id),
    partialReturn: (id: number, items: { itemId: number; returnQty: number }[]) =>
      ipcRenderer.invoke('sales:partialReturn', id, items),
    delete: (id: number) => ipcRenderer.invoke('sales:delete', id),
    markPaid: (id: number) => ipcRenderer.invoke('sales:markPaid', id),
    setPaymentDue: (id: number, dueDate: string) => ipcRenderer.invoke('sales:setPaymentDue', id, dueDate),
    batchMarkPaid: (ids: number[]) => ipcRenderer.invoke('sales:batchMarkPaid', ids),
    batchComplete: (ids: number[]) => ipcRenderer.invoke('sales:batchComplete', ids),
    batchCancel: (ids: number[]) => ipcRenderer.invoke('sales:batchCancel', ids),
    getStatusHistory: (orderId: number) => ipcRenderer.invoke('sales:getStatusHistory', orderId),
    updateNotes: (id: number, notes: string) => ipcRenderer.invoke('sales:updateNotes', id, notes)
  },

  // Reports
  reports: {
    kpis: () => ipcRenderer.invoke('reports:kpis'),
    salesTrend: (days?: number, dateFrom?: string, dateTo?: string) => ipcRenderer.invoke('reports:salesTrend', days, dateFrom, dateTo),
    inventoryByCategory: () => ipcRenderer.invoke('reports:inventoryByCategory'),
    topProducts: (days?: number, dateFrom?: string, dateTo?: string) => ipcRenderer.invoke('reports:topProducts', days, dateFrom, dateTo),
    lowStock: () => ipcRenderer.invoke('reports:lowStock'),
    marginAnalysis: () => ipcRenderer.invoke('reports:marginAnalysis'),
    supplierStats: () => ipcRenderer.invoke('reports:supplierStats'),
    customerStats: () => ipcRenderer.invoke('reports:customerStats'),
    slowMoving: (days?: number) => ipcRenderer.invoke('reports:slowMoving', days),
    topCustomers: () => ipcRenderer.invoke('reports:topCustomers'),
    purchaseVsSales: (days?: number, dateFrom?: string, dateTo?: string) => ipcRenderer.invoke('reports:purchaseVsSales', days, dateFrom, dateTo),
    turnoverAnalysis: (days?: number) => ipcRenderer.invoke('reports:turnoverAnalysis', days),
    abcAnalysis: () => ipcRenderer.invoke('reports:abcAnalysis'),
    monthlyPL: () => ipcRenderer.invoke('reports:monthlyPL'),
    getUnpaidOrders: () => ipcRenderer.invoke('reports:getUnpaidOrders')
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

  // CSV export
  export: {
    products: () => ipcRenderer.invoke('export:products'),
    purchases: () => ipcRenderer.invoke('export:purchases'),
    sales: () => ipcRenderer.invoke('export:sales'),
    adjustments: () => ipcRenderer.invoke('export:adjustments'),
    report: (days?: number) => ipcRenderer.invoke('export:report', days)
  },

  // Inventory utilities
  inventory: {
    getPurchaseSuggestions: () => ipcRenderer.invoke('inventory:getPurchaseSuggestions'),
    createPurchaseFromSuggestions: (items: { product_id: number; quantity: number; unit_price: number }[]) =>
      ipcRenderer.invoke('inventory:createPurchaseFromSuggestions', items)
  },

  // Database backup/restore
  db: {
    backup: () => ipcRenderer.invoke('db:backup'),
    restore: () => ipcRenderer.invoke('db:restore'),
    autoBackup: () => ipcRenderer.invoke('db:autoBackup')
  },

  // CSV import
  import: {
    csv: () => ipcRenderer.invoke('import:csv')
  },

  // Stock takes
  stocktake: {
    getAll: () => ipcRenderer.invoke('stocktake:getAll'),
    getById: (id: number) => ipcRenderer.invoke('stocktake:getById', id),
    create: (notes?: string) => ipcRenderer.invoke('stocktake:create', notes),
    updateItem: (itemId: number, countedQty: number | null) => ipcRenderer.invoke('stocktake:updateItem', itemId, countedQty),
    complete: (id: number) => ipcRenderer.invoke('stocktake:complete', id),
    delete: (id: number) => ipcRenderer.invoke('stocktake:delete', id)
  },

  // PDF print
  print: {
    pdf: (opts: { type: 'sales' | 'purchase'; id: number }) => ipcRenderer.invoke('print:pdf', opts),
    exportMonthlyPdf: (opts: { year: number; month: number }) => ipcRenderer.invoke('reports:exportMonthlyPdf', opts)
  },

  // Shell
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
  },

  // Demo
  demo: {
    purge: () => ipcRenderer.invoke('demo:purge')
  },

  // Mock data generation
  mockData: {
    generate: (options: { scale: 'S' | 'M' | 'L'; scenario: 'normal' | 'warning' | 'empty' }) =>
      ipcRenderer.invoke('mockdata:generate', options)
  },

  // AI
  ai: {
    forecast: () => ipcRenderer.invoke('ai:forecast')
  },

  // Notifications
  notifications: {
    getAll: () => ipcRenderer.invoke('notifications:getAll'),
    markRead: (id: number) => ipcRenderer.invoke('notifications:markRead', id),
    markAllRead: () => ipcRenderer.invoke('notifications:markAllRead')
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type declaration for renderer TypeScript
export type ElectronAPI = typeof electronAPI

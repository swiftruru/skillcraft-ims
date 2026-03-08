// Type declaration for the contextBridge API exposed by the preload script
// Must stay in sync with src/preload/index.ts

declare global {
  interface Window {
    electronAPI: {
      products: {
        getAll(filters?: { category?: string; search?: string; lowStock?: boolean }): Promise<import('./schema').Product[]>
        getById(id: number): Promise<import('./schema').Product | null>
        create(data: unknown): Promise<import('./schema').Product>
        update(id: number, data: unknown): Promise<import('./schema').Product | null>
        delete(id: number): Promise<boolean>
        getCategories(): Promise<string[]>
        getLowStock(): Promise<import('./schema').LowStockItem[]>
        adjust(productId: number, delta: number, reason: string, note?: string): Promise<import('./schema').Product>
        getAdjustmentHistory(productId: number): Promise<import('./schema').InventoryAdjustment[]>
      }
      suppliers: {
        getAll(search?: string): Promise<import('./schema').Supplier[]>
        getById(id: number): Promise<import('./schema').Supplier | null>
        create(data: unknown): Promise<import('./schema').Supplier>
        update(id: number, data: unknown): Promise<import('./schema').Supplier | null>
        delete(id: number): Promise<boolean>
      }
      customers: {
        getAll(search?: string): Promise<import('./schema').Customer[]>
        getById(id: number): Promise<import('./schema').Customer | null>
        create(data: unknown): Promise<import('./schema').Customer>
        update(id: number, data: unknown): Promise<import('./schema').Customer | null>
        delete(id: number): Promise<boolean>
      }
      purchases: {
        getAll(filters?: { status?: string; search?: string }): Promise<import('./schema').PurchaseOrder[]>
        getById(id: number): Promise<import('./schema').PurchaseOrder | null>
        create(data: unknown): Promise<import('./schema').PurchaseOrder>
        receive(id: number): Promise<import('./schema').PurchaseOrder | null>
        cancel(id: number): Promise<boolean>
        delete(id: number): Promise<boolean>
      }
      sales: {
        getAll(filters?: { status?: string; search?: string }): Promise<import('./schema').SalesOrder[]>
        getById(id: number): Promise<import('./schema').SalesOrder | null>
        create(data: unknown): Promise<import('./schema').SalesOrder>
        complete(id: number): Promise<{ success: boolean; data?: import('./schema').SalesOrder; error?: string }>
        cancel(id: number): Promise<boolean>
        delete(id: number): Promise<boolean>
      }
      reports: {
        kpis(): Promise<import('./schema').DashboardKPIs>
        salesTrend(days?: number): Promise<import('./schema').SalesTrendPoint[]>
        inventoryByCategory(): Promise<import('./schema').InventoryByCategory[]>
        topProducts(days?: number): Promise<import('./schema').TopProduct[]>
        lowStock(): Promise<import('./schema').LowStockItem[]>
      }
      sync: {
        trigger(direction: 'push' | 'pull' | 'bidirectional'): Promise<{ success: boolean; recordsSynced?: number; error?: string }>
        status(): Promise<{ lastSync: unknown; recentLogs: unknown[] }>
        testConnection(): Promise<{ success: boolean; error?: string }>
        initSheetStructure(): Promise<{ success: boolean; error?: string }>
        onProgress(cb: (data: { message: string }) => void): void
        onCompleted(cb: (data: { recordsSynced: number }) => void): void
        onError(cb: (data: { error: string }) => void): void
        removeListeners(): void
      }
      settings: {
        get(): Promise<import('./schema').AppSettings>
        set(key: string, value: string): Promise<boolean>
        setAll(data: Record<string, string>): Promise<boolean>
      }
      search: {
        global(query: string): Promise<import('./schema').SearchResult[]>
      }
      export: {
        products(): Promise<{ success: boolean; filePath?: string; error?: string }>
        purchases(): Promise<{ success: boolean; filePath?: string; error?: string }>
        sales(): Promise<{ success: boolean; filePath?: string; error?: string }>
        adjustments(): Promise<{ success: boolean; filePath?: string; error?: string }>
      }
      inventory: {
        getPurchaseSuggestions(): Promise<import('./schema').PurchaseSuggestion[]>
        createPurchaseFromSuggestions(items: { product_id: number; quantity: number; unit_price: number }[]): Promise<import('./schema').PurchaseOrder>
      }
      shell: {
        openExternal(url: string): Promise<void>
      }
    }
  }
}

export {}

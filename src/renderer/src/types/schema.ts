// Shared types mirrored from main/db/schema.ts for use in renderer
// These must stay in sync with src/main/db/schema.ts

export interface Product {
  id: number
  sku: string
  name: string
  category: string
  sell_price: number
  buy_price: number
  stock_qty: number
  reorder_pt: number
  unit: string
  description: string | null
  created_at: string
  updated_at: string
}

export type ProductCreate = Omit<Product, 'id' | 'created_at' | 'updated_at'>
export type ProductUpdate = Partial<ProductCreate>

export interface Supplier {
  id: number
  name: string
  contact: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export type SupplierCreate = Omit<Supplier, 'id' | 'created_at'>

export interface Customer {
  id: number
  name: string
  contact: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export type CustomerCreate = Omit<Customer, 'id' | 'created_at'>

export interface PurchaseOrder {
  id: number
  order_no: string
  supplier_id: number | null
  supplier_name?: string
  status: 'pending' | 'received' | 'cancelled'
  order_date: string
  receive_date: string | null
  total_amount: number
  notes: string | null
  created_at: string
  items?: PurchaseItem[]
}

export interface PurchaseItem {
  id: number
  purchase_order_id: number
  product_id: number
  product_name?: string
  product_sku?: string
  quantity: number
  unit_price: number
  subtotal?: number
}

export type PurchaseItemInput = { product_id: number; quantity: number; unit_price: number }
export type PurchaseOrderCreate = {
  supplier_id: number | null
  order_date: string
  notes: string | null
  items: PurchaseItemInput[]
}

export interface SalesOrder {
  id: number
  order_no: string
  customer_id: number | null
  customer_name?: string
  status: 'pending' | 'completed' | 'cancelled'
  order_date: string
  total_amount: number
  notes: string | null
  created_at: string
  items?: SaleItem[]
}

export interface SaleItem {
  id: number
  sales_order_id: number
  product_id: number
  product_name?: string
  product_sku?: string
  quantity: number
  unit_price: number
  subtotal?: number
}

export type SaleItemInput = { product_id: number; quantity: number; unit_price: number }
export type SalesOrderCreate = {
  customer_id: number | null
  order_date: string
  notes: string | null
  items: SaleItemInput[]
}

export interface SyncLog {
  id: number
  direction: 'push' | 'pull' | 'bidirectional'
  status: 'success' | 'error' | 'running'
  message: string | null
  records_synced: number
  synced_at: string
}

export interface DashboardKPIs {
  totalInventoryValue: number
  monthlyRevenue: number
  monthlyRevenuePrev: number
  monthlyGrossProfit: number
  monthlyGrossProfitPrev: number
  lowStockCount: number
  totalProducts: number
  pendingSalesOrders: number
}

export interface SalesTrendPoint {
  date: string
  revenue: number
  orders: number
}

export interface InventoryByCategory {
  category: string
  product_count: number
  total_units: number
  inventory_value: number
}

export interface TopProduct {
  product_id: number
  sku: string
  name: string
  category: string
  total_quantity: number
  total_revenue: number
}

export interface LowStockItem {
  id: number
  sku: string
  name: string
  category: string
  stock_qty: number
  reorder_pt: number
  buy_price: number
}

export interface AppSettings {
  googleSheetId: string
  serviceAccountKeyPath: string
  syncIntervalMinutes: number
  autoSyncEnabled: boolean
  dbPath: string
}

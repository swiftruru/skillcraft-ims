// Shared types mirrored from main/db/schema.ts for use in renderer
// These must stay in sync with src/main/db/schema.ts

export interface Product {
  id: number
  sku: string
  name: string
  category: string
  sell_price: number
  buy_price: number
  avg_cost: number
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
  credit_limit: number
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
  credit_limit: number
  created_at: string
}

export type CustomerCreate = Omit<Customer, 'id' | 'created_at'>

export interface PurchaseOrder {
  id: number
  order_no: string
  supplier_id: number | null
  supplier_name?: string
  status: 'pending' | 'received' | 'cancelled' | 'returned'
  order_date: string
  receive_date: string | null
  total_amount: number
  notes: string | null
  payment_due_date: string | null
  payment_status: 'unpaid' | 'paid'
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
  status: 'pending' | 'completed' | 'cancelled' | 'returned' | 'partial_return'
  order_date: string
  total_amount: number
  notes: string | null
  payment_due_date: string | null
  payment_status: 'unpaid' | 'paid'
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
  return_qty: number
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
  pendingPurchasesCount: number
  unpaidSalesTotal: number
  unpaidPurchasesTotal: number
  overdueCount: number
  dueSoonCount: number
}

export interface UnpaidOrder {
  id: number
  order_no: string
  party_name: string
  order_date: string
  payment_due_date: string | null
  total_amount: number
  payment_status: string
  overdue: number
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
  autoBackupEnabled: boolean
  dbPath: string
  appVersion: string
  companyName: string
  companyAddress: string
  companyPhone: string
  claudeApiKey: string
}

export interface AiForecastResult {
  summary: string
  items: {
    product_id: number
    sku: string
    name: string
    category: string
    avg_daily_sales: number
    stock_qty: number
    days_remaining: number | null
    suggested_reorder_qty: number
    reasoning: string
  }[]
  generatedAt: string
}

export interface InventoryAdjustment {
  id: number
  product_id: number
  delta: number
  reason: string
  note: string | null
  adjusted_by: string
  adjusted_at: string
  product_name?: string
  sku?: string
  category?: string
}

export interface SearchResult {
  type: 'product' | 'supplier' | 'customer' | 'purchase' | 'sale'
  id: number
  title: string
  subtitle: string
  meta?: string
}

export interface PurchaseSuggestion {
  product_id: number
  sku: string
  name: string
  category: string
  stock_qty: number
  reorder_pt: number
  suggested_qty: number
  buy_price: number
  estimated_cost: number
}

export interface MarginItem {
  id: number
  sku: string
  name: string
  category: string
  sell_price: number
  buy_price: number
  avg_cost: number
  stock_qty: number
  margin: number
  margin_pct: number | null
}

export interface SupplierStat {
  id: number
  name: string
  order_count: number
  total_received: number
  total_ordered: number
}

export interface CustomerStat {
  id: number
  name: string
  order_count: number
  total_spent: number
  total_ordered: number
}

export interface StockTake {
  id: number
  take_no: string
  status: 'draft' | 'completed'
  notes: string | null
  created_at: string
  completed_at: string | null
  item_count?: number
  diff_count?: number
  uncounted?: number
}

export interface StockTakeItem {
  id: number
  stock_take_id: number
  product_id: number
  product_name: string
  sku: string
  unit: string
  category: string
  system_qty: number
  counted_qty: number | null
}

export interface StockTakeDetail extends StockTake {
  items: StockTakeItem[]
}

export interface SlowMovingItem {
  id: number
  name: string
  sku: string
  category: string
  stock_qty: number
  buy_price: number
  updated_at: string
  days_idle: number
  stock_value: number
}

export interface TopCustomerItem {
  customer_id: number
  name: string
  order_count: number
  total_spent: number
}

export interface PriceHistoryItem {
  order_date: string
  order_no: string
  unit_price: number
  quantity: number
}

export interface TurnoverItem {
  product_id: number
  sku: string
  name: string
  category: string
  stock_qty: number
  sold_qty: number
  turnover_rate: number | null
  days_to_sell: number | null
}

export interface PurchaseVsSalesPoint {
  date: string
  purchase_amount: number
  sales_amount: number
}

export interface AbcItem {
  product_id: number
  sku: string
  name: string
  category: string
  revenue: number
  revenue_pct: number
  cumulative_pct: number
  abc_class: 'A' | 'B' | 'C'
}

export interface MonthlyPLPoint {
  month: string
  revenue: number
  cost: number
  gross_profit: number
}

export interface AppNotification {
  id: number
  type: string
  title: string
  body: string
  link: string | null
  read: number
  created_at: string
}

-- 客戶增加點數餘額欄位
ALTER TABLE customers ADD COLUMN points_balance REAL NOT NULL DEFAULT 0;

-- 點數變動明細表
CREATE TABLE IF NOT EXISTS customer_points_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type         TEXT    NOT NULL CHECK(type IN ('earned', 'redeemed', 'adjusted')),
  amount       REAL    NOT NULL,
  ref_order_id INTEGER REFERENCES sales_orders(id) ON DELETE SET NULL,
  note         TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 銷售單記錄本筆獲得點數（方便退貨反向扣除）
ALTER TABLE sales_orders ADD COLUMN points_earned REAL NOT NULL DEFAULT 0;

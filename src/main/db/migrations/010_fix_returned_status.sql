-- Migration 010: Add 'returned' to purchase_orders and sales_orders status CHECK constraints
-- SQLite does not support ALTER TABLE DROP/ADD CONSTRAINT, so we recreate both tables.

PRAGMA foreign_keys = OFF;

-- ── purchase_orders ──────────────────────────────────────────────────────────

CREATE TABLE purchase_orders_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no      TEXT    NOT NULL UNIQUE,
  supplier_id   INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  status        TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','received','cancelled','returned')),
  order_date    TEXT    NOT NULL,
  receive_date  TEXT,
  total_amount  REAL    NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO purchase_orders_new
  SELECT id, order_no, supplier_id, status, order_date, receive_date, total_amount, notes, created_at
  FROM purchase_orders;

DROP TABLE purchase_orders;
ALTER TABLE purchase_orders_new RENAME TO purchase_orders;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status   ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date     ON purchase_orders(order_date);

-- ── sales_orders ─────────────────────────────────────────────────────────────

CREATE TABLE sales_orders_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no      TEXT    NOT NULL UNIQUE,
  customer_id   INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  status        TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','cancelled','returned')),
  order_date    TEXT    NOT NULL,
  total_amount  REAL    NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO sales_orders_new
  SELECT id, order_no, customer_id, status, order_date, total_amount, notes, created_at
  FROM sales_orders;

DROP TABLE sales_orders;
ALTER TABLE sales_orders_new RENAME TO sales_orders;

CREATE INDEX IF NOT EXISTS idx_sales_orders_status   ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date     ON sales_orders(order_date);

PRAGMA foreign_keys = ON;

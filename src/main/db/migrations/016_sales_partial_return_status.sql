-- Migration 016: Add 'partial_return' to sales_orders status CHECK constraint
-- SQLite does not support ALTER TABLE MODIFY CONSTRAINT, so we recreate the table.

PRAGMA foreign_keys = OFF;

CREATE TABLE sales_orders_new (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no         TEXT    NOT NULL UNIQUE,
  customer_id      INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  status           TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','cancelled','returned','partial_return')),
  order_date       TEXT    NOT NULL,
  total_amount     REAL    NOT NULL DEFAULT 0,
  notes            TEXT,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  payment_due_date TEXT    NULL,
  payment_status   TEXT    NOT NULL DEFAULT 'unpaid'
);

INSERT INTO sales_orders_new
  SELECT id, order_no, customer_id, status, order_date, total_amount, notes, created_at, payment_due_date, payment_status
  FROM sales_orders;

DROP TABLE sales_orders;
ALTER TABLE sales_orders_new RENAME TO sales_orders;

CREATE INDEX IF NOT EXISTS idx_sales_orders_status   ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date     ON sales_orders(order_date);

PRAGMA foreign_keys = ON;

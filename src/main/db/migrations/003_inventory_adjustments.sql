-- Migration 003: Inventory Adjustments
-- Tracks manual stock adjustments (损耗, 盘点修正, 样品出货 etc.)

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  delta       INTEGER NOT NULL,           -- positive = stock in, negative = stock out
  reason      TEXT    NOT NULL,
  note        TEXT,
  adjusted_by TEXT    DEFAULT 'system',
  adjusted_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

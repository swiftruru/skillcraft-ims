CREATE TABLE IF NOT EXISTS stock_takes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  take_no      TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','completed')),
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS stock_take_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  stock_take_id INTEGER NOT NULL REFERENCES stock_takes(id) ON DELETE CASCADE,
  product_id    INTEGER NOT NULL REFERENCES products(id),
  system_qty    INTEGER NOT NULL,
  counted_qty   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_stock_take_items_take ON stock_take_items(stock_take_id);

CREATE TABLE IF NOT EXISTS purchase_status_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  changed_at   DATETIME NOT NULL DEFAULT (datetime('now')),
  note         TEXT
);

CREATE TABLE IF NOT EXISTS sale_status_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  changed_at   DATETIME NOT NULL DEFAULT (datetime('now')),
  note         TEXT
);

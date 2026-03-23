CREATE TABLE IF NOT EXISTS purchase_templates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_template_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id  INTEGER NOT NULL REFERENCES purchase_templates(id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity     INTEGER NOT NULL CHECK(quantity > 0),
  unit_price   REAL    NOT NULL CHECK(unit_price >= 0),
  discount_pct REAL    NOT NULL DEFAULT 0
);

-- Add discount_pct to order items
ALTER TABLE purchase_items ADD COLUMN discount_pct REAL NOT NULL DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN discount_pct REAL NOT NULL DEFAULT 0;

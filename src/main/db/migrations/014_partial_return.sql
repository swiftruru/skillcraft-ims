-- Migration 014: partial return support
-- Add return_qty to sale_items to track per-item returned quantities
ALTER TABLE sale_items ADD COLUMN return_qty INTEGER DEFAULT 0;

-- Add partial_return as a valid status for sales_orders (SQLite CHECK not enforced retroactively)
-- Status values: pending | completed | cancelled | returned | partial_return

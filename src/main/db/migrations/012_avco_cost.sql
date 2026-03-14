-- Add avg_cost (moving weighted average cost) column to products table
ALTER TABLE products ADD COLUMN avg_cost REAL DEFAULT 0;
-- Initialize avg_cost from buy_price for existing products
UPDATE products SET avg_cost = buy_price WHERE avg_cost = 0 AND buy_price > 0;

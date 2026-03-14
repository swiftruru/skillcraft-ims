-- Add payment tracking fields to purchase_orders and sales_orders
ALTER TABLE purchase_orders ADD COLUMN payment_due_date DATE NULL;
ALTER TABLE purchase_orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE sales_orders ADD COLUMN payment_due_date DATE NULL;
ALTER TABLE sales_orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid';

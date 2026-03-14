-- Migration 015: credit limit for customers and suppliers
-- 0 means unlimited (no restriction)
ALTER TABLE customers ADD COLUMN credit_limit REAL DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN credit_limit REAL DEFAULT 0;

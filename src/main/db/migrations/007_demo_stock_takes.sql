-- Demo 庫存盤點記錄
-- Take 1：一月底例行盤點，全數吻合（完美結果）
-- Take 2：二月中旬盤點，發現 3 項差異（HDMI線少5、原子筆多10、氣泡紙少2）
-- Take 3：三月初盤點草稿（進行中）

INSERT OR IGNORE INTO stock_takes (id, take_no, status, notes, created_at, completed_at) VALUES
  (1, 'ST-2026-01-31-7892', 'completed', '一月底例行盤點', '2026-01-31 09:15:00', '2026-01-31 11:40:00'),
  (2, 'ST-2026-02-15-3401', 'completed', '二月中旬抽查盤點', '2026-02-15 14:00:00', '2026-02-15 16:20:00'),
  (3, 'ST-2026-03-01-5566', 'draft',     '三月開工定期盤點', '2026-03-01 08:30:00', NULL);

-- Take 1：全部吻合（系統庫存 = 實際盤點）
INSERT OR IGNORE INTO stock_take_items (stock_take_id, product_id, system_qty, counted_qty)
SELECT 1, id, stock_qty, stock_qty FROM products;

-- Take 2：大多吻合，3 項有差異
--   HDMI 線（id=3）：系統 156，實盤 151，少 5（損耗）
--   原子筆（id=7）：系統 215，實盤 225，多 10（進貨未入帳）
--   氣泡紙（id=13）：系統 78，實盤 76，少 2（損耗）
INSERT OR IGNORE INTO stock_take_items (stock_take_id, product_id, system_qty, counted_qty)
SELECT 2, id,
  stock_qty,
  CASE id
    WHEN 3  THEN stock_qty - 5
    WHEN 7  THEN stock_qty + 10
    WHEN 13 THEN stock_qty - 2
    ELSE stock_qty
  END
FROM products;

-- Take 3：草稿，前 8 項已盤，其餘尚未清點
INSERT OR IGNORE INTO stock_take_items (stock_take_id, product_id, system_qty, counted_qty)
SELECT 3, id,
  stock_qty,
  CASE
    WHEN id <= 8 THEN stock_qty   -- 前 8 項已盤完，全部吻合
    ELSE NULL                     -- 其餘尚未清點
  END
FROM products;

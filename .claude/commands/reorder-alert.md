---
name: reorder-alert
description: 當使用者要求查看低庫存警示、計算補貨量或產生採購建議時觸發。
---

## 補貨警示規範

1. **資料庫路徑**：永遠使用 `~/Library/Application Support/skillcraft-ims/ims.db`，以 `stock_qty <= reorder_pt` 篩選需補貨商品。

2. **低庫存查詢**：從 SQLite 取得低庫存商品列表，並計算過去 90 天平均日銷量。

   ```bash
   DB=~/Library/Application\ Support/skillcraft-ims/ims.db

   sqlite3 "$DB" "
   SELECT
     p.id, p.sku, p.name, p.category,
     p.stock_qty, p.reorder_pt, p.buy_price, p.unit,
     COALESCE(ROUND(avg_sales.avg_daily, 2), 0) as avg_daily_sales,
     CASE
       WHEN p.stock_qty = 0 THEN 'CRITICAL'
       WHEN p.stock_qty < p.reorder_pt * 0.5 THEN 'CRITICAL'
       WHEN p.stock_qty <= p.reorder_pt THEN 'WARNING'
       ELSE 'MONITOR'
     END as priority
   FROM products p
   LEFT JOIN (
     SELECT si.product_id,
            ROUND(SUM(si.quantity) * 1.0 /
              MAX(julianday('now') - julianday(MIN(so.order_date)), 1), 2) as avg_daily
     FROM sale_items si
     JOIN sales_orders so ON si.sales_order_id = so.id
     WHERE so.status = 'completed'
       AND so.order_date >= date('now', '-90 days')
     GROUP BY si.product_id
   ) avg_sales ON p.id = avg_sales.product_id
   WHERE p.stock_qty <= p.reorder_pt
   ORDER BY
     CASE WHEN p.stock_qty = 0 THEN 0
          WHEN p.stock_qty < p.reorder_pt * 0.5 THEN 1
          ELSE 2 END ASC,
     (p.stock_qty * 1.0 / MAX(p.reorder_pt, 1)) ASC
   " -column -header
   ```

3. **補貨量計算**：對每項低庫存商品計算以下數值，取最大值作為建議補貨量。
   - **剩餘天數** = `stock_qty / avg_daily_sales`（若 avg_daily_sales > 0）
   - **30 天需求量** = `avg_daily_sales * 30`
   - **建議補貨量** = `MAX(reorder_pt * 2 - stock_qty, 30天需求量)`

4. **輸出格式**：以 Markdown 表格依優先序分組輸出，CRITICAL 為立即補貨，WARNING 為近期補貨。

   | 優先序 | SKU | 商品 | 現有庫存 | 補貨點 | 剩餘天數 | 建議補貨量 | 預估成本 |
   |--------|-----|------|----------|--------|----------|------------|----------|

5. **採購草稿詢問**：表格輸出後詢問「是否要依供應商分組，產生草稿採購單摘要？」，若確認則查詢供應商資訊並輸出分組草稿，最後說明如何在 app 中建立正式採購單。

   ```bash
   sqlite3 "$DB" "
   SELECT s.name as supplier, p.sku, p.name, p.buy_price
   FROM products p
   LEFT JOIN (
     SELECT DISTINCT pi.product_id, po.supplier_id
     FROM purchase_items pi
     JOIN purchase_orders po ON pi.purchase_order_id = po.id
     ORDER BY po.order_date DESC
   ) last_po ON p.id = last_po.product_id
   LEFT JOIN suppliers s ON last_po.supplier_id = s.id
   WHERE p.stock_qty <= p.reorder_pt
   ORDER BY s.name, p.name
   " -column -header
   ```

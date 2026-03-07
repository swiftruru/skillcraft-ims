# reorder-alert

> 掃描低庫存商品，計算 EOQ 補貨建議，並可產生草稿採購單。

## 說明

此 Skill 會查詢所有低於補貨點的商品，根據歷史銷售量計算
建議補貨數量（簡易 EOQ 模型），並提供優先序排列的補貨清單。

## 使用方式

在 Claude Code 中輸入：`/reorder-alert`

---

## 執行步驟

1. **查詢低庫存商品與銷售速率**

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

2. **計算建議補貨量**

   對每個低庫存商品計算：
   - **剩餘天數** = `stock_qty / avg_daily_sales`（若 avg_daily_sales > 0）
   - **30 天需求量** = `avg_daily_sales * 30`
   - **建議補貨量** = `MAX(reorder_pt * 2 - stock_qty, 30天需求量, 缺口)`

3. **呈現優先序補貨表**

   以 Markdown 表格輸出，依優先序排列：

   ```
   🔴 CRITICAL（立即補貨）
   ⚠️  WARNING（近期補貨）
   ```

   | 優先序 | SKU | 商品 | 現有庫存 | 補貨點 | 剩餘天數 | 建議補貨量 | 預估成本 |
   |--------|-----|------|----------|--------|----------|------------|----------|

4. **詢問是否產生採購草稿**

   問：「是否要依供應商分組，產生草稿採購單摘要？」

   若確認：
   ```bash
   # 查詢供應商資訊（由使用者指定或從最近採購推斷）
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

   輸出依供應商分組的草稿採購單，並說明如何在 app 中建立正式採購單。

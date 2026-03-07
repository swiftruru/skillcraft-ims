---
name: sales-analysis
description: 當使用者要求分析銷售趨勢、查看產品表現、比較期間業績或產生銷售報告時觸發。
---

## 銷售分析規範

1. **時間範圍參數**：預設分析最近 30 天；使用者可傳入天數（如 `90`）或日期範圍（如 `2026-01 2026-03`）。

2. **必查四組銷售數據**：依序執行期間總覽、各產品銷售表現、每日趨勢、客戶排行四組查詢。

   ```bash
   DB=~/Library/Application\ Support/skillcraft-ims/ims.db
   DAYS=30  # 依使用者輸入調整

   echo "=== 期間總覽 ===" && \
   sqlite3 "$DB" "
   SELECT
     COUNT(*) as total_orders,
     COUNT(DISTINCT customer_id) as unique_customers,
     printf('NT$ %,.0f', SUM(total_amount)) as total_revenue,
     printf('NT$ %,.0f', AVG(total_amount)) as avg_order_value,
     printf('NT$ %,.0f', SUM(total_amount) /
       NULLIF(julianday('now') - julianday(MIN(order_date)), 0) * 30) as monthly_run_rate
   FROM sales_orders
   WHERE status = 'completed'
     AND order_date >= date('now', '-' || $DAYS || ' days')
   " -column -header

   echo "" && echo "=== 各產品銷售表現 ===" && \
   sqlite3 "$DB" "
   SELECT
     p.sku, p.name, p.category,
     SUM(si.quantity) as qty_sold,
     printf('NT$ %,.0f', SUM(si.quantity * si.unit_price)) as revenue,
     printf('NT$ %,.0f', SUM(si.quantity * (si.unit_price - p.buy_price))) as gross_profit,
     printf('%.1f%%', SUM(si.quantity * (si.unit_price - p.buy_price)) /
       NULLIF(SUM(si.quantity * si.unit_price), 0) * 100) as margin
   FROM sale_items si
   JOIN products p ON si.product_id = p.id
   JOIN sales_orders so ON si.sales_order_id = so.id
   WHERE so.status = 'completed'
     AND so.order_date >= date('now', '-' || $DAYS || ' days')
   GROUP BY p.id
   ORDER BY SUM(si.quantity * si.unit_price) DESC
   " -column -header

   echo "" && echo "=== 每日銷售趨勢 ===" && \
   sqlite3 "$DB" "
   SELECT
     order_date as date,
     COUNT(*) as orders,
     printf('NT$ %,.0f', SUM(total_amount)) as revenue
   FROM sales_orders
   WHERE status = 'completed'
     AND order_date >= date('now', '-' || $DAYS || ' days')
   GROUP BY order_date
   ORDER BY order_date
   " -column -header

   echo "" && echo "=== 客戶排行 ===" && \
   sqlite3 "$DB" "
   SELECT
     COALESCE(c.name, '一般客戶') as customer,
     COUNT(DISTINCT so.id) as orders,
     printf('NT$ %,.0f', SUM(so.total_amount)) as total_spent
   FROM sales_orders so
   LEFT JOIN customers c ON so.customer_id = c.id
   WHERE so.status = 'completed'
     AND so.order_date >= date('now', '-' || $DAYS || ' days')
   GROUP BY so.customer_id
   ORDER BY SUM(so.total_amount) DESC
   LIMIT 10
   " -column -header
   ```

3. **前期比較**：查詢前一個相同長度區間的業績，計算營收與訂單數的環比變化百分比。

   ```bash
   sqlite3 "$DB" "
   SELECT
     printf('NT$ %,.0f', SUM(total_amount)) as prev_period_revenue,
     COUNT(*) as prev_period_orders
   FROM sales_orders
   WHERE status = 'completed'
     AND order_date >= date('now', '-' || ($DAYS * 2) || ' days')
     AND order_date < date('now', '-' || $DAYS || ' days')
   " -column -header
   ```

4. **報告格式**：輸出含產品績效矩陣的 Markdown 報告，以繁體中文撰寫。

   ```markdown
   # 銷售分析報告
   **分析期間**：[開始日期] ～ [結束日期]

   ## 關鍵指標
   | 指標 | 本期 | 前期 | 變化 |
   |------|------|------|------|

   ## 銷售趨勢
   [以 ASCII 趨勢線描述上升/下降趨勢]

   ## 產品績效矩陣
   - **明星商品**（高收入 × 高毛利）：[列出]
   - **現金牛**（高收入 × 低毛利）：[列出，建議提升毛利或維持量]
   - **問號商品**（低收入 × 高毛利）：[列出，建議加強促銷]
   - **瘦狗商品**（低收入 × 低毛利）：[列出，建議評估是否下架]

   ## 客戶洞察
   [重複購買率、客單價趨勢]

   ## 策略建議
   1. [具體建議]
   2. [具體建議]
   3. [具體建議]
   ```

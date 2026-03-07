# sales-analysis

> 深度分析銷售趨勢、產品表現與客戶行為，輸出商業智慧報告。

## 說明

此 Skill 對銷售資料進行多維度分析，包含趨勢、產品績效矩陣、
客戶分析，並提供策略建議。可接受時間範圍參數。

## 使用方式

- `/sales-analysis` — 分析最近 30 天
- `/sales-analysis 90` — 分析最近 90 天
- `/sales-analysis 2026-01 2026-03` — 指定日期範圍

---

## 執行步驟

1. **取得使用者指定的時間範圍**（預設 30 天）

2. **執行多組銷售查詢**

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

3. **與前期比較**（對應前一個相同長度的時間區間）

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

4. **產生商業智慧報告**

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

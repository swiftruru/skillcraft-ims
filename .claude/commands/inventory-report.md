---
name: inventory-report
description: 當使用者要求產生庫存分析報告、查看庫存狀況或分析庫存健康度時觸發。
---

## 庫存報告規範

1. **資料庫路徑**：永遠使用 `~/Library/Application Support/skillcraft-ims/ims.db`（macOS），執行前先確認檔案存在。

   ```bash
   ls ~/Library/Application\ Support/skillcraft-ims/ims.db
   ```

2. **必查四組數據**：依序對資料庫執行類別摘要、總覽統計、低庫存商品、前 5 大庫存值商品四組查詢。

   ```bash
   DB=~/Library/Application\ Support/skillcraft-ims/ims.db

   echo "=== 類別摘要 ===" && \
   sqlite3 "$DB" "
   SELECT category,
          COUNT(*) as product_count,
          SUM(stock_qty) as total_units,
          printf('NT$ %,.0f', SUM(stock_qty * buy_price)) as inventory_value,
          printf('NT$ %,.0f', SUM(stock_qty * sell_price)) as retail_value,
          printf('%.1f%%', AVG((sell_price - buy_price) / NULLIF(sell_price, 0) * 100)) as avg_margin
   FROM products
   GROUP BY category
   ORDER BY SUM(stock_qty * buy_price) DESC
   " -column -header

   echo "" && echo "=== 總覽統計 ===" && \
   sqlite3 "$DB" "
   SELECT
     COUNT(*) as total_products,
     printf('NT$ %,.0f', SUM(stock_qty * buy_price)) as total_inventory_cost,
     printf('NT$ %,.0f', SUM(stock_qty * sell_price)) as total_retail_value,
     (SELECT COUNT(*) FROM products WHERE stock_qty <= reorder_pt) as low_stock_count
   FROM products
   " -column -header

   echo "" && echo "=== 低庫存商品 ===" && \
   sqlite3 "$DB" "
   SELECT sku, name, stock_qty, reorder_pt,
          printf('NT$ %,.0f', buy_price) as buy_price,
          (reorder_pt - stock_qty) as shortfall
   FROM products
   WHERE stock_qty <= reorder_pt
   ORDER BY (stock_qty * 1.0 / MAX(reorder_pt, 1)) ASC
   " -column -header

   echo "" && echo "=== 前 5 大庫存值商品 ===" && \
   sqlite3 "$DB" "
   SELECT sku, name, category, stock_qty,
          printf('NT$ %,.0f', stock_qty * buy_price) as inventory_value,
          printf('NT$ %,.0f', sell_price - buy_price) as unit_margin
   FROM products
   ORDER BY (stock_qty * buy_price) DESC
   LIMIT 5
   " -column -header
   ```

3. **報告格式**：依查詢結果輸出 Markdown 報告，含今日日期，以繁體中文撰寫。

   ```markdown
   # 庫存分析報告
   **日期**：YYYY-MM-DD
   **系統**：SkillCraft IMS

   ## 執行摘要
   [2-3 句話總結庫存健康狀況]

   ## 類別分佈
   | 類別 | 商品數 | 庫存單位 | 庫存成本 | 零售值 | 平均毛利率 |
   |------|--------|----------|----------|--------|------------|
   [填入查詢結果]

   ## 風險評估
   - **過剩庫存**：[哪些類別庫存過多]
   - **缺貨風險**：[哪些商品低於補貨點]

   ## 利潤分析
   [分析哪些商品/類別有最佳/最差毛利]

   ## 建議行動
   1. [具體建議]
   2. [具體建議]
   3. [具體建議]
   ```

4. **儲存詢問**：報告產生後詢問是否儲存至 `docs/reports/inventory-YYYY-MM-DD.md`，若確認則建立目錄並寫入。

# inventory-report

> 產生 AI 驅動的庫存分析報告，涵蓋類別分佈、利潤分析與補貨建議。

## 說明

此 Skill 會對 SkillCraft IMS 的 SQLite 資料庫執行真實查詢，
自動分析目前庫存狀況，並以結構化的 Markdown 報告呈現。

## 使用方式

在 Claude Code 中輸入：`/inventory-report`

---

## 執行步驟

1. **找到資料庫路徑**

   macOS：`~/Library/Application Support/skillcraft-ims/ims.db`
   Windows：`%APPDATA%\skillcraft-ims\ims.db`

   用 Bash 確認資料庫存在：
   ```bash
   ls ~/Library/Application\ Support/skillcraft-ims/ims.db
   ```

2. **執行庫存查詢**

   對資料庫執行以下 SQL 查詢（使用 sqlite3 CLI）：

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

3. **分析數據並產生報告**

   根據查詢結果，撰寫以下格式的 Markdown 報告：

   ```markdown
   # 庫存分析報告
   **日期**：[今天的日期]
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
   1. [具體建議 1]
   2. [具體建議 2]
   3. [具體建議 3]
   ```

4. **詢問是否儲存報告**

   問：「是否要將此報告儲存到 `docs/reports/inventory-YYYY-MM-DD.md`？」
   若確認，建立 `docs/reports/` 目錄並寫入報告。

export interface UxTourStep {
  id: string
  emoji: string
  tag: { zh: string; en: string }
  title: { zh: string; en: string }
  description: { zh: string; en: string }
  uxHighlight: { zh: string; en: string }
  route: string
  lookHere?: { zh: string; en: string }
  targetSelector?: string
}

export const UX_TOUR_STEPS: UxTourStep[] = [
  {
    id: 'keyboard',
    emoji: '⌨️',
    tag: { zh: '鍵盤操作', en: 'Keyboard' },
    title: { zh: '鍵盤快捷鍵面板', en: 'Keyboard Shortcut Panel' },
    route: '/products',
    description: {
      zh: '按下 ? 鍵可呼叫快捷鍵說明面板。在任何非輸入框的情況下，G + P 跳至商品頁，G + B 跳至採購頁，G + S 跳至銷售頁。',
      en: 'Press ? to open the keyboard shortcut panel. When no input is focused, G + P jumps to Products, G + B to Purchases, G + S to Sales.'
    },
    uxHighlight: {
      zh: '電源用戶不喜歡用滑鼠。鍵盤優先設計（Keyboard-first）讓熟練操作員的工作速度提升 30–50%，也是 SaaS 產品專業度的重要訊號。',
      en: 'Power users hate the mouse. Keyboard-first design speeds up experienced operators by 30–50% and is a key signal of professional-grade SaaS.'
    },
    lookHere: {
      zh: '按下 ? 鍵開啟快捷鍵面板；或注意 Header 搜尋欄旁的 ⌘K 徽章提示。',
      en: 'Press ? to open the shortcut panel; or notice the ⌘K badge hint next to the Header search bar.'
    }
  },
  {
    id: 'command-palette',
    emoji: '🔍',
    tag: { zh: '全域搜尋', en: 'Global Search' },
    title: { zh: '全域搜尋（命令面板）', en: 'Global Search (Command Palette)' },
    route: '/',
    targetSelector: '[data-tour="cmd-palette"]',
    description: {
      zh: '按下 ⌘K（Mac）或 Ctrl+K（Windows）即可開啟命令面板，直接搜尋商品、供應商、客戶，一鍵跳轉至詳細頁面。',
      en: 'Press ⌘K (Mac) or Ctrl+K (Windows) to open the command palette — search products, suppliers, customers, and jump instantly to their detail pages.'
    },
    uxHighlight: {
      zh: '命令面板（Command Palette）將導航成本從「多層點擊」降至「兩次按鍵」。這個模式來自 IDE（VS Code、Figma），引入 B2B 工具時可大幅提升操作效率，也能幫助新用戶快速探索系統功能。',
      en: 'Command palette reduces navigation cost from "multiple clicks" to "two keystrokes". Borrowed from IDEs (VS Code, Figma), it dramatically speeds up B2B tool operation and helps new users quickly discover system capabilities.'
    },
    lookHere: {
      zh: 'Header 中央的搜尋欄，按 ⌘K 觸發；或直接點擊搜尋欄開啟命令面板。',
      en: 'The search bar in the center of the Header — press ⌘K or click the search bar to open the command palette.'
    }
  },
  {
    id: 'theme',
    emoji: '🌙',
    tag: { zh: '主題切換', en: 'Theme' },
    title: { zh: '深淺色主題切換', en: 'Dark / Light Theme Toggle' },
    route: '/',
    targetSelector: '[data-tour="theme"]',
    description: {
      zh: '點擊 Header 右側的 Sun / Moon 圖示，可即時在深色與亮色模式之間切換，偏好設定透過 localStorage 自動儲存。',
      en: 'Click the Sun / Moon icon on the right side of the Header to instantly toggle between dark and light mode. Preference is auto-saved via localStorage.'
    },
    uxHighlight: {
      zh: '夜班倉儲人員需要護眼的深色介面；白天日光下的會議室展示則需要亮色。主題切換是現代 SaaS 的基本人體工學設計，也大幅提升截圖展示與教學文件的彈性。',
      en: 'Night-shift warehouse staff need eye-friendly dark UI; daytime boardroom demos need light mode. Theme switching is basic ergonomic design in modern SaaS and significantly improves screenshot and documentation flexibility.'
    },
    lookHere: {
      zh: 'Header 右側的 Sun（亮色模式）或 Moon（深色模式）按鈕。',
      en: 'The Sun (light) or Moon (dark) icon button at the right side of the Header.'
    }
  },
  {
    id: 'low-stock',
    emoji: '⚠️',
    tag: { zh: '庫存警示', en: 'Low Stock Alert' },
    title: { zh: '低庫存紅/黃色警示', en: 'Low Stock Red / Yellow Alert' },
    route: '/products',
    targetSelector: '[data-tour="low-stock-header"]',
    description: {
      zh: '商品表格的庫存欄位自動以顏色標示健康狀態：庫存為 0 顯示紅色警告，低於補貨點顯示黃色提醒，正常庫存則為一般顯示。Header 也會顯示全局低庫存計數。',
      en: 'The stock column auto-colors health status: red for 0 stock, yellow for below reorder point, normal for healthy. The Header also shows a global low-stock count.'
    },
    uxHighlight: {
      zh: '色彩編碼（Color Coding）利用前注意屬性（Pre-attentive Attribute），讓人在不閱讀數字的情況下即可掃描到風險。倉儲主管每天要看幾百筆資料，紅黃警示讓關鍵問題在 2 秒內浮現，而非等到缺貨才發現。',
      en: 'Color coding leverages pre-attentive attributes — users spot risk without reading numbers. Warehouse managers scan hundreds of rows daily; red/yellow alerts surface critical issues within 2 seconds, preventing out-of-stock surprises.'
    },
    lookHere: {
      zh: '商品管理表格的「庫存」欄 — 尋找紅色（缺貨）或黃色（低庫存）高亮的列。Header 右側也會顯示 ⚠️ 低庫存數量提示。',
      en: 'The "Stock" column in the Products table — look for red (out of stock) or yellow (low stock) rows. The Header right side also shows a ⚠️ low-stock count.'
    }
  },
  {
    id: 'quick-purchase',
    emoji: '🛒',
    tag: { zh: '快速操作', en: 'Quick Action' },
    title: { zh: '快速採購一鍵補貨', en: 'Quick Purchase Button' },
    route: '/products',
    targetSelector: '[data-tour="quick-purchase"]',
    description: {
      zh: '每個商品列的右側有一個購物車圖示，點擊可開啟快速採購對話框，自動預填：補貨數量（補貨點 − 現有庫存）、進價、供應商選項，一鍵建立採購單。',
      en: 'Each product row has a shopping cart icon. Clicking opens a Quick Purchase dialog, auto-filled with: reorder quantity (reorder point − current stock), buy price, and supplier options — one click to create a PO.'
    },
    uxHighlight: {
      zh: '從「發現問題（低庫存）」到「採取行動（建立採購單）」的步驟數即為摩擦力（Friction）。將兩個動作合為一步，遵循「最小阻力路徑（Path of Least Resistance）」原則，讓即時反應取代延遲處理。',
      en: 'Steps from "spotting a problem (low stock)" to "taking action (create PO)" define friction. Merging both into one step follows the Path of Least Resistance principle — enabling immediate response instead of deferred handling.'
    },
    lookHere: {
      zh: '商品管理表格中，將滑鼠移至任一列右側 — 藍色購物車圖示按鈕（「快速採購」）。',
      en: 'Hover any row in the Products table — look for the blue shopping cart icon button ("Quick Purchase") on the right side.'
    }
  },
  {
    id: 'auto-sku',
    emoji: '✨',
    tag: { zh: '自動化', en: 'Automation' },
    title: { zh: '自動 SKU 號碼產生', en: 'Auto SKU Generation' },
    route: '/products',
    targetSelector: '[data-tour="add-product"]',
    description: {
      zh: '在新增商品表單中，先選擇類別，再點擊 SKU 欄位旁的魔杖按鈕，系統自動依類別前綴（ELEC / PERI / STAT / PKG / MISC）產生唯一流水號 SKU。',
      en: 'In the Add Product form, select a category first, then click the wand button next to the SKU field. The system auto-generates a unique sequential SKU with category prefix (ELEC / PERI / STAT / PKG / MISC).'
    },
    uxHighlight: {
      zh: 'SKU 命名規則複雜且容易出錯（重號、格式不統一）。提供「一鍵自動產生」配合「可手動覆寫」是「自動化但不失控制感（Automation with Control）」的最佳實踐，有效降低資料品質問題。',
      en: 'SKU naming is complex and error-prone (duplicates, inconsistent format). Offering "one-click auto-generate" with "manual override" is best practice for Automation with Control — effectively reducing data quality issues.'
    },
    lookHere: {
      zh: '點擊商品管理頁的「新增商品」→ 先選類別 → 再點擊 SKU 欄位旁的魔杖（Wand）圖示按鈕。',
      en: 'Click "Add Product" on the Products page → select a category first → then click the wand (Wand2) icon button next to the SKU field.'
    }
  },
  {
    id: 'order-clone',
    emoji: '📋',
    tag: { zh: '操作效率', en: 'Efficiency' },
    title: { zh: '訂單一鍵複製', en: 'One-click Order Clone' },
    route: '/purchases',
    targetSelector: '[data-tour="order-clone"]',
    description: {
      zh: '採購單（及銷售單）列表的每列右側有一個複製（Copy）按鈕，點擊可快速複製整筆訂單的所有內容為新草稿，適合向同一供應商週期性重複下單。',
      en: 'Each purchase (and sale) order row has a Copy button on the right. Clicking clones the entire order — supplier, products, quantities, prices — as a new draft, perfect for periodic repeat orders.'
    },
    uxHighlight: {
      zh: '重複性操作是使用者流失的主因之一。「複製既有訂單」比「從頭建立」節省約 70% 的輸入時間，消除「每次選供應商、選商品」的操作疲勞（Interaction Cost），讓週期性業務流程從繁瑣到順暢。',
      en: 'Repetitive tasks are a top driver of user churn. "Clone existing order" saves ~70% of entry time versus "create from scratch", eliminating the interaction cost of re-selecting supplier and products every time.'
    },
    lookHere: {
      zh: '採購管理表格中，將滑鼠移至任一列 — 右側出現複製圖示按鈕（位於眼睛詳情按鈕旁）。',
      en: 'Hover any row in the Purchases table — the copy icon button appears on the right (next to the eye/detail button).'
    }
  },
  {
    id: 'date-filter',
    emoji: '📅',
    tag: { zh: '資料篩選', en: 'Data Filter' },
    title: { zh: '日期區間篩選', en: 'Date Range Filter' },
    route: '/purchases',
    targetSelector: '[data-tour="date-filter"]',
    description: {
      zh: '採購管理頁（及銷售管理頁）頂部提供「開始日期」和「結束日期」兩個日期輸入框，快速縮小訂單範圍，並附有「清除」連結快速重置。',
      en: 'The Purchases (and Sales) page provides "Start Date" and "End Date" inputs at the top for quickly narrowing order scope, with a "Clear" link for instant reset.'
    },
    uxHighlight: {
      zh: '日期篩選是「漸進式揭露（Progressive Disclosure）」的實踐：預設顯示所有資料，但在使用者需要縮小範圍時立即提供工具。適合月結對帳、特定時段業績稽核，比下拉式「本月/上月」預設更靈活。',
      en: 'Date filtering is Progressive Disclosure in practice: show all data by default, provide narrowing tools on demand. Ideal for month-end reconciliation and period audits — more flexible than dropdown presets like "this month / last month".'
    },
    lookHere: {
      zh: '採購管理頁面頂部工具列 — 搜尋欄旁的「開始日期」和「結束日期」日期輸入框。',
      en: 'The top toolbar of the Purchases page — the date input fields labeled "Start Date" and "End Date" next to the search bar.'
    }
  },
  {
    id: 'overdue-badge',
    emoji: '⏰',
    tag: { zh: '狀態識別', en: 'Status ID' },
    title: { zh: '逾期採購單橘色警示', en: 'Overdue PO Badge' },
    route: '/purchases',
    targetSelector: '[data-tour="overdue-badge"]',
    description: {
      zh: '超過 30 天仍在「待確認」狀態的採購單，狀態欄會自動顯示橘色「逾期」標籤，無需手動計算建立日期，提醒跟進供應商到貨進度。',
      en: 'Purchase orders remaining "pending" for 30+ days automatically show an orange "Overdue" badge in the status column — no manual date calculation needed. Prompts follow-up on delivery.'
    },
    uxHighlight: {
      zh: '被遺忘的採購單是中小企業進銷存管理的常見痛點。系統主動計算「等待天數」並標示，讓逾期問題在使用者打開頁面的一秒內浮現，而不是等月底對帳才察覺。這是「主動式（Proactive）」UX 設計的典型應用。',
      en: 'Forgotten POs are a common SMB inventory pain point. The system proactively calculates waiting days and highlights them — surfacing overdue issues within one second of opening the page, not at month-end reconciliation. Classic Proactive UX design.'
    },
    lookHere: {
      zh: '採購管理表格的「狀態」欄 — 尋找橘色「逾期」標籤（需有建立超過 30 天的待確認採購單）。',
      en: 'The "Status" column in the Purchases table — look for the orange "Overdue" badge (requires a pending PO created 30+ days ago).'
    }
  },
  {
    id: 'report-range',
    emoji: '📊',
    tag: { zh: '報表自訂', en: 'Custom Reports' },
    title: { zh: '報表自訂日期範圍', en: 'Custom Report Date Range' },
    route: '/reports',
    targetSelector: '[data-tour="report-range"]',
    description: {
      zh: '報表分析頁面的期間選擇器新增「自訂」選項，點選後顯示開始/結束日期輸入框，可分析任意時段的銷售趨勢、採購 vs 銷售對比、熱銷商品排行等圖表。',
      en: 'The report period selector now includes a "Custom" option. Selecting it reveals start/end date inputs for analyzing sales trends, purchase vs. sales comparisons, and top product rankings for any arbitrary time range.'
    },
    uxHighlight: {
      zh: '固定「本月」、「本季」等預設無法應對業務多樣性（如半年評估、特殊促銷期分析）。自訂範圍讓報表從「展示工具」進化為「決策工具」，配合 CSV 匯出可讓資料流入外部分析工具（Excel、Google Sheets）。',
      en: 'Fixed presets cannot handle business diversity (semi-annual reviews, promotion analysis). Custom ranges evolve reports from "show tools" to "decision tools". Combined with CSV export, data can flow into external tools (Excel, Google Sheets).'
    },
    lookHere: {
      zh: '報表分析頁面頂部的期間選擇器 — 點擊「自訂」按鈕後，會顯示開始/結束日期輸入框。',
      en: 'The period selector at the top of the Reports page — click the "Custom" button to reveal start/end date inputs.'
    }
  },
  {
    id: 'notifications',
    emoji: '🔔',
    tag: { zh: '通知系統', en: 'Notifications' },
    title: { zh: '通知中心', en: 'Notification Center' },
    route: '/',
    targetSelector: '[data-tour="notifications"]',
    description: {
      zh: 'Header 右側的鈴鐺圖示顯示未讀通知數量。每次銷售完成後，若商品庫存低於補貨點，系統自動生成通知，點擊通知可直接跳轉至相關頁面。',
      en: 'The bell icon in the Header shows unread notifications. After each sale, if any product falls below its reorder point, the system auto-generates a notification. Clicking a notification jumps to the relevant page.'
    },
    uxHighlight: {
      zh: '將「偵測庫存異常」的責任從使用者轉移給系統，是從「被動工具（Reactive Tool）」進化為「主動助理（Proactive Assistant）」的關鍵設計。推播式通知讓使用者不需要記得去主動巡視每個頁面，大幅降低認知負擔（Cognitive Load）。',
      en: 'Shifting "detecting stock anomalies" responsibility from user to system is the key evolution from Reactive Tool to Proactive Assistant. Push notifications free users from having to patrol every page, significantly reducing cognitive load.'
    },
    lookHere: {
      zh: 'Header 右側的 Bell（鈴鐺）圖示 — 有未讀通知時顯示紅色數字徽章；點擊展開通知列表。',
      en: 'The Bell icon on the right side of the Header — a red number badge appears for unread notifications; click to expand the notification list.'
    }
  },
  {
    id: 'stocktake-chart',
    emoji: '📦',
    tag: { zh: '視覺化分析', en: 'Visual Analytics' },
    title: { zh: '盤點差異長條圖', en: 'Stocktake Variance Chart' },
    route: '/stock-take',
    targetSelector: '[data-tour="stocktake-chart"]',
    description: {
      zh: '完成盤點後，系統自動產生橫向長條圖，對比每個商品的「帳面庫存（藍色）」與「實際盤點數量（綠色）」，差異欄位以顏色區分正數（盤盈）與負數（盤虧）。',
      en: 'After completing a stocktake, the system auto-generates a horizontal bar chart comparing "book stock (blue)" vs "actual counted (green)" for each item, with the variance column color-coded for positive (surplus) and negative (loss).'
    },
    uxHighlight: {
      zh: '數字表格只能告訴你差了幾個；長條圖能直觀傳達「哪些商品差最多」、「整體是盤盈還是盤虧」。視覺化讓盤點結果從「數字回報」升級為「庫存健康診斷」，管理者可在 10 秒內辨識需要優先調查的異常商品。',
      en: 'A number table tells you how much variance; a bar chart visually conveys "which items vary most" and "is the overall trend surplus or loss". Visualization upgrades stocktake results from a number report to an inventory health diagnosis — managers identify priority items in 10 seconds.'
    },
    lookHere: {
      zh: '盤點頁面中，點擊一筆已完成的盤點記錄，向下捲動可見圖表區塊 — 「帳面數量（藍）」vs「實際盤點（綠）」橫向長條圖。',
      en: 'On the Stocktake page, click a completed stocktake record and scroll down to see the chart — "Book Stock (blue)" vs "Counted (green)" horizontal bar chart.'
    }
  },
]

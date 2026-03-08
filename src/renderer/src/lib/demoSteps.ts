export interface DemoStepDef {
  id: string
  emoji: string
  tag: { zh: string; en: string }
  title: { zh: string; en: string }
  description: { zh: string; en: string }
  concept: { zh: string; en: string }
}

export const DEMO_STEPS: DemoStepDef[] = [
  {
    id: 'supplier',
    emoji: '🏭',
    tag: { zh: '主資料', en: 'Master Data' },
    title: { zh: '建立供應商', en: 'Create Supplier' },
    description: {
      zh: '新增「Demo 科技有限公司」作為上游供應商，設定聯絡人與聯絡方式。',
      en: 'Add "Demo Tech Co., Ltd." as the upstream supplier with contact details.'
    },
    concept: {
      zh: '供應商（Supplier）是提供商品的上游廠商。完整的進銷存系統必須追蹤每筆採購的貨源，以便管理供應鏈、比較報價、控制交期。沒有供應商資料，系統就無法記錄「貨從哪裡來」。',
      en: 'A Supplier is the upstream vendor providing goods. A complete IMS must track the source of every purchase to manage the supply chain, compare quotes, and control lead times. Without supplier records, the system cannot track "where goods come from".'
    }
  },
  {
    id: 'customer',
    emoji: '🛒',
    tag: { zh: '主資料', en: 'Master Data' },
    title: { zh: '建立客戶', en: 'Create Customer' },
    description: {
      zh: '新增「Demo 電商股份有限公司」作為下游客戶，記錄聯絡資訊以便後續開立銷售單。',
      en: 'Add "Demo E-Commerce Inc." as a downstream customer to enable sales order creation.'
    },
    concept: {
      zh: '客戶（Customer）是購買商品的下游買家。記錄客戶資料可追蹤銷售歷史、分析客戶貢獻度（RFM 分析），並在發票、對帳時快速調用。進銷存系統需要「知道賣給誰」才能完整記錄每一筆交易。',
      en: 'A Customer is the downstream buyer. Recording customer data enables sales history tracking, RFM analysis, and fast invoice lookup. An IMS needs to know "who the goods are sold to" to fully record every transaction.'
    }
  },
  {
    id: 'product',
    emoji: '📦',
    tag: { zh: '商品管理', en: 'Product Mgmt' },
    title: { zh: '建立商品（SKU）', en: 'Create Product (SKU)' },
    description: {
      zh: '新增「Demo USB-C Hub 7合1」，設定進價 $350、售價 $599、補貨點 10 件，這是整個流程的核心主體。',
      en: 'Add "Demo USB-C Hub 7-in-1" with buy price $350, sell price $599, and reorder point of 10 units.'
    },
    concept: {
      zh: 'SKU（庫存單位）是進銷存系統的核心主體。每個 SKU 需記錄：進價（成本）、售價、單位、補貨點。系統利用這些數值自動計算毛利率（Gross Margin）並在庫存低於補貨點時觸發警示，這是進銷存智能化的關鍵。',
      en: 'SKU (Stock Keeping Unit) is the core entity of an IMS. Each SKU records: buy price (cost), sell price, unit, and reorder point. The system uses these to auto-calculate Gross Margin and trigger alerts when stock falls below the reorder point — the key to intelligent inventory management.'
    }
  },
  {
    id: 'purchase',
    emoji: '🛍️',
    tag: { zh: '採購流程', en: 'Procurement' },
    title: { zh: '建立採購單', en: 'Create Purchase Order' },
    description: {
      zh: '向「Demo 科技有限公司」建立採購單，訂購 50 件 USB-C Hub，單價 $350。此時庫存尚未增加。',
      en: 'Create a purchase order to "Demo Tech" for 50 units of USB-C Hub at $350 each. Stock has NOT increased yet.'
    },
    concept: {
      zh: '採購單（Purchase Order, PO）是企業向供應商下訂的正式文件。在「收貨確認」之前，庫存不會增加——這確保了「已訂但未到貨」與「實際庫存」的區別。這個設計避免了「幽靈庫存」的問題，是嚴謹進銷存系統的標誌。',
      en: 'A Purchase Order (PO) is the formal document issued to a supplier. Stock does NOT increase until "Goods Received" — this separates "ordered but not yet arrived" from "actual inventory", preventing ghost stock entries, a hallmark of a rigorous IMS.'
    }
  },
  {
    id: 'receive',
    emoji: '📥',
    tag: { zh: '入庫作業', en: 'Goods Receipt' },
    title: { zh: '確認收貨（入庫）', en: 'Confirm Goods Receipt' },
    description: {
      zh: '確認貨物到達倉庫，系統自動將 50 件 USB-C Hub 入庫，庫存從 0 增加至 50 件。',
      en: 'Confirm goods arrived at the warehouse. The system automatically adds 50 units to stock, increasing from 0 to 50.'
    },
    concept: {
      zh: '收貨（Goods Receipt）是採購流程的終點，也是庫存實際增加的時間點。收貨後系統記錄入庫時間與數量，這是「先進先出（FIFO）」成本計算和批次追蹤（Batch Tracking）的數據基礎，對食品、醫藥等行業尤為重要。',
      en: 'Goods Receipt is the end of the procurement cycle and the moment inventory actually increases. The system records the date and quantity, forming the basis for FIFO costing and batch tracking — critical for food, pharma, and other regulated industries.'
    }
  },
  {
    id: 'sales',
    emoji: '📤',
    tag: { zh: '銷售流程', en: 'Sales' },
    title: { zh: '建立銷售單', en: 'Create Sales Order' },
    description: {
      zh: '接受「Demo 電商」訂單，建立銷售單：12 件 USB-C Hub，售價 $599 各。此時庫存尚未扣減。',
      en: 'Accept order from "Demo E-Commerce" — create a sales order: 12 USB-C Hubs at $599 each. Stock has NOT been deducted yet.'
    },
    concept: {
      zh: '銷售單（Sales Order, SO）記錄客戶的訂購需求。在「完成出貨」之前，庫存尚未扣減，銷售單處於待處理狀態。這個設計讓業務人員可以先接單、再安排出貨，系統也能預先計算「可用庫存（Available-to-Promise, ATP）」，避免超賣（Overselling）。',
      en: 'A Sales Order (SO) records a customer\'s purchase request. Until "Order Complete", stock is NOT deducted. This allows staff to accept orders first, then arrange shipment. The system can also pre-calculate Available-to-Promise (ATP) inventory, preventing overselling.'
    }
  },
  {
    id: 'complete',
    emoji: '✅',
    tag: { zh: '出庫作業', en: 'Goods Issue' },
    title: { zh: '完成銷售（出庫）', en: 'Complete Sale (Goods Issue)' },
    description: {
      zh: '確認商品出貨，系統扣減 12 件庫存（50 → 38 件），並計算本筆交易毛利 $2,988。',
      en: 'Confirm shipment. The system deducts 12 units (50 → 38), and calculates gross profit of $2,988 for this transaction.'
    },
    concept: {
      zh: '完成銷售代表商品實際出庫（Goods Issue）。此時系統同時執行三件事：① 扣減庫存 ② 計算單筆毛利（售價－成本）× 數量 ③ 更新「本月營收」KPI。這個時間點也是財務認列收入（Revenue Recognition）的基礎。',
      en: 'Completing a sale represents the actual goods issue. The system simultaneously: ① Deducts inventory ② Calculates gross profit: (sell price − cost) × quantity ③ Updates the monthly revenue KPI. This moment is also the basis for revenue recognition in accounting.'
    }
  },
  {
    id: 'summary',
    emoji: '🎯',
    tag: { zh: '流程總結', en: 'Summary' },
    title: { zh: 'Demo 完成！', en: 'Demo Complete!' },
    description: {
      zh: '恭喜！您已完整走過一個進銷存閉環：建立主資料 → 採購入庫 → 銷售出庫 → 庫存更新。',
      en: 'Congratulations! You have completed a full IMS cycle: Master Data → Purchase & Receipt → Sales & Issue → Inventory Updated.'
    },
    concept: {
      zh: '完整的進銷存流程形成一個閉環（Closed Loop）：主資料設定 → 採購訂單 → 收貨入庫 → 銷售訂單 → 出貨出庫 → 庫存即時更新 → 報表分析。這個循環持續運轉，確保企業隨時掌握「有多少貨、進了多少、賣了多少、賺了多少」的完整供應鏈視圖。',
      en: 'The complete IMS flow forms a Closed Loop: Master Data → Purchase Order → Goods Receipt → Sales Order → Goods Issue → Real-time Inventory → Reports & Analysis. This cycle runs continuously, giving businesses a complete supply chain view: "How much stock? How much received? How much sold? How much earned?"'
    }
  }
]

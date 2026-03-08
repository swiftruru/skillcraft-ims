import { registerProductsIpc } from './products.ipc'
import { registerSuppliersIpc } from './suppliers.ipc'
import { registerCustomersIpc } from './customers.ipc'
import { registerPurchasesIpc } from './purchases.ipc'
import { registerSalesIpc } from './sales.ipc'
import { registerReportsIpc } from './reports.ipc'
import { registerSyncIpc } from './sync.ipc'
import { registerSettingsIpc } from './settings.ipc'
import { registerSearchIpc } from './search.ipc'
import { registerExportIpc } from './export.ipc'
import { registerInventoryIpc } from './inventory.ipc'
import { registerDbIpc } from './db.ipc'
import { registerImportIpc } from './import.ipc'

export function registerAllIpcHandlers(): void {
  registerProductsIpc()
  registerSuppliersIpc()
  registerCustomersIpc()
  registerPurchasesIpc()
  registerSalesIpc()
  registerReportsIpc()
  registerSyncIpc()
  registerSettingsIpc()
  registerSearchIpc()
  registerExportIpc()
  registerInventoryIpc()
  registerDbIpc()
  registerImportIpc()
}

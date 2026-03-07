import { registerProductsIpc } from './products.ipc'
import { registerSuppliersIpc } from './suppliers.ipc'
import { registerCustomersIpc } from './customers.ipc'
import { registerPurchasesIpc } from './purchases.ipc'
import { registerSalesIpc } from './sales.ipc'
import { registerReportsIpc } from './reports.ipc'
import { registerSyncIpc } from './sync.ipc'
import { registerSettingsIpc } from './settings.ipc'

export function registerAllIpcHandlers(): void {
  registerProductsIpc()
  registerSuppliersIpc()
  registerCustomersIpc()
  registerPurchasesIpc()
  registerSalesIpc()
  registerReportsIpc()
  registerSyncIpc()
  registerSettingsIpc()
}

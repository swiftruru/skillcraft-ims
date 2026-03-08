/** 清除所有帶 [Demo] / Live Demo 標記的遺留資料（靜默執行） */
export async function purgeDemoData(): Promise<void> {
  try {
    await window.electronAPI.demo.purge()
    localStorage.removeItem('skillcraft-demo-ids')
  } catch { /* ignore */ }
}

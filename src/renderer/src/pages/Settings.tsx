import { useEffect, useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { CheckCircle2, XCircle, Loader2, ExternalLink, HardDrive, UploadCloud, Database, Shuffle, RotateCcw, RefreshCw, Download } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AppSettings } from '@/types/schema'
import { useLang } from '@/lib/useLang'
import { useShortcutsStore, DEFAULT_SHORTCUTS } from '@/stores/shortcuts.store'

type Status = 'idle' | 'loading' | 'success' | 'error'
type DbOpStatus = { type: 'idle' | 'loading' | 'success' | 'error'; msg?: string }
type MockScale = 'S' | 'M' | 'L'
type MockScenario = 'normal' | 'warning' | 'empty'
type MockStatus = { type: 'idle' | 'loading' | 'success' | 'error'; msg?: string; counts?: Record<string, number> }

const MOCK_COMPANIES = [
  { name: '台灣科技有限公司',   address: '台北市中山區南京東路三段 168 號 8 樓',   phone: '02-2501-8888' },
  { name: '創新電子股份有限公司', address: '新北市板橋區文化路一段 266 號 5 樓',    phone: '02-2963-5566' },
  { name: '永豐貿易股份有限公司', address: '台中市西屯區台灣大道二段 688 號 12 樓', phone: '04-2328-7700' },
  { name: '鑫瑞國際有限公司',   address: '高雄市前鎮區成功二路 88 號 3 樓',       phone: '07-338-9900' },
  { name: '智誠科技有限公司',   address: '台北市信義區松仁路 58 號 9 樓',         phone: '02-2720-3399' },
  { name: '宏遠電商股份有限公司', address: '桃園市桃園區中山路 1268 號 2 樓',      phone: '03-333-6688' },
  { name: '聯捷物流有限公司',   address: '新北市新莊區幸福路 512 號',             phone: '02-2277-4422' },
  { name: '鼎豐企業股份有限公司', address: '台南市東區東門路一段 260 號',           phone: '06-275-8811' },
]

const SCALE_CONFIG: Record<MockScale, { products: number; purchases: number; sales: number }> = {
  S: { products: 30, purchases: 40, sales: 80 },
  M: { products: 60, purchases: 80, sales: 160 },
  L: { products: 100, purchases: 150, sales: 300 },
}

type CompanyForm = { companyName: string; companyAddress: string; companyPhone: string }
type SheetsForm = { googleSheetId: string; serviceAccountKeyPath: string; syncIntervalMinutes: number; autoSyncEnabled: boolean }

export default function Settings() {
  const t = useLang()
  const s = t.settings
  const SCENARIO_CONFIG: Record<MockScenario, { label: string; desc: string }> = {
    normal: { label: s.mockDataScenarioNormal, desc: s.mockDataScenarioNormalDesc },
    warning: { label: s.mockDataScenarioWarning, desc: s.mockDataScenarioWarningDesc },
    empty: { label: s.mockDataScenarioEmpty, desc: s.mockDataScenarioEmptyDesc },
  }
  const queryClient = useQueryClient()

  const [testStatus, setTestStatus] = useState<Status>('idle')
  const [testMsg, setTestMsg] = useState('')
  const [initStatus, setInitStatus] = useState<Status>('idle')
  const [initMsg, setInitMsg] = useState('')
  const [companySaveStatus, setCompanySaveStatus] = useState<Status>('idle')
  const [sheetsSaveStatus, setSheetsSaveStatus] = useState<Status>('idle')
  const [backupStatus, setBackupStatus] = useState<DbOpStatus>({ type: 'idle' })
  const [restoreStatus, setRestoreStatus] = useState<DbOpStatus>({ type: 'idle' })
  const [mockScale, setMockScale] = useState<MockScale>('M')
  const [mockScenario, setMockScenario] = useState<MockScenario>('normal')
  const [mockStatus, setMockStatus] = useState<MockStatus>({ type: 'idle' })

  const { data: settings } = useQuery<AppSettings>({
    queryKey: ['settings'],
    queryFn: () => window.electronAPI.settings.get()
  })

  // ── 公司資訊 form（獨立） ──
  const companyForm = useForm<CompanyForm>()

  useEffect(() => {
    if (settings) {
      companyForm.reset({
        companyName: settings.companyName,
        companyAddress: settings.companyAddress,
        companyPhone: settings.companyPhone
      })
    }
  }, [settings]) // eslint-disable-line react-hooks/exhaustive-deps

  const companyMutation = useMutation({
    mutationFn: (data: Record<string, string>) => window.electronAPI.settings.setAll(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setCompanySaveStatus('success')
      setTimeout(() => setCompanySaveStatus('idle'), 2000)
    },
    onError: () => setCompanySaveStatus('error')
  })

  const onSaveCompany = (data: CompanyForm) => {
    setCompanySaveStatus('loading')
    companyMutation.mutate({
      companyName: data.companyName,
      companyAddress: data.companyAddress,
      companyPhone: data.companyPhone
    })
  }

  const fillMockCompany = () => {
    const pick = MOCK_COMPANIES[Math.floor(Math.random() * MOCK_COMPANIES.length)]
    companyForm.setValue('companyName', pick.name)
    companyForm.setValue('companyAddress', pick.address)
    companyForm.setValue('companyPhone', pick.phone)
  }

  // ── Google Sheets form（獨立） ──
  const sheetsForm = useForm<SheetsForm>()

  useEffect(() => {
    if (settings) {
      sheetsForm.reset({
        googleSheetId: settings.googleSheetId,
        serviceAccountKeyPath: settings.serviceAccountKeyPath,
        syncIntervalMinutes: settings.syncIntervalMinutes,
        autoSyncEnabled: settings.autoSyncEnabled
      })
    }
  }, [settings]) // eslint-disable-line react-hooks/exhaustive-deps

  const sheetsMutation = useMutation({
    mutationFn: (data: Record<string, string>) => window.electronAPI.settings.setAll(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setSheetsSaveStatus('success')
      setTimeout(() => setSheetsSaveStatus('idle'), 2000)
    },
    onError: () => setSheetsSaveStatus('error')
  })

  const onSaveSheets = (data: SheetsForm) => {
    setSheetsSaveStatus('loading')
    sheetsMutation.mutate({
      googleSheetId: data.googleSheetId,
      serviceAccountKeyPath: data.serviceAccountKeyPath,
      syncIntervalMinutes: String(data.syncIntervalMinutes),
      autoSyncEnabled: String(data.autoSyncEnabled)
    })
  }

  const handleTest = async () => {
    setTestStatus('loading')
    setTestMsg(s.testing)
    const result = await window.electronAPI.sync.testConnection()
    if (result.success) {
      setTestStatus('success')
      setTestMsg(s.testSuccess)
    } else {
      setTestStatus('error')
      setTestMsg(result.error ?? s.testFailed)
    }
  }

  const handleBackup = async () => {
    setBackupStatus({ type: 'loading' })
    const result = await window.electronAPI.db.backup()
    if (result.success) {
      setBackupStatus({ type: 'success', msg: s.backupSuccess(result.filePath!) })
    } else {
      setBackupStatus({ type: 'error', msg: result.error ?? s.backupFailed })
    }
    setTimeout(() => setBackupStatus({ type: 'idle' }), 4000)
  }

  const handleRestore = async () => {
    setRestoreStatus({ type: 'loading' })
    const result = await window.electronAPI.db.restore()
    if (!result.success) {
      setRestoreStatus({ type: 'error', msg: result.error ?? s.restoreFailed })
      setTimeout(() => setRestoreStatus({ type: 'idle' }), 4000)
    }
  }

  const handleGenerateMock = async () => {
    setMockStatus({ type: 'loading' })
    const result = await window.electronAPI.mockData.generate({ scale: mockScale, scenario: mockScenario })
    if (result.success) {
      queryClient.invalidateQueries()
      setMockStatus({ type: 'success', counts: result.counts })
    } else {
      setMockStatus({ type: 'error', msg: result.error })
    }
  }

  const handleInitStructure = async () => {
    setInitStatus('loading')
    setInitMsg(s.initializing)
    const result = await window.electronAPI.sync.initSheetStructure()
    if (result.success) {
      setInitStatus('success')
      setInitMsg(s.initDone)
    } else {
      setInitStatus('error')
      setInitMsg(result.error ?? s.initFailed)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{s.companyInfo}</CardTitle>
          <CardDescription>{s.companyInfoDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={companyForm.handleSubmit(onSaveCompany)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{s.companyName}</Label>
              <Input {...companyForm.register('companyName')} placeholder={s.companyNamePlaceholder} />
            </div>
            <div className="space-y-1.5">
              <Label>{s.companyAddress}</Label>
              <Input {...companyForm.register('companyAddress')} placeholder={s.companyAddressPlaceholder} />
            </div>
            <div className="space-y-1.5">
              <Label>{s.companyPhone}</Label>
              <Input {...companyForm.register('companyPhone')} placeholder={s.companyPhonePlaceholder} />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={companyMutation.isPending} size="sm">
                {companySaveStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : s.saveSettings}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={fillMockCompany} className="gap-1.5 text-muted-foreground">
                <Shuffle className="w-3.5 h-3.5" />
                Mock
              </Button>
              {companySaveStatus === 'success' && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {s.saved}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Google Sheets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{s.sheetsSync}</CardTitle>
          <CardDescription>
            {s.sheetsDesc}{' '}
            <a
              href="#"
              className="text-primary underline inline-flex items-center gap-1"
              onClick={(e) => { e.preventDefault(); window.electronAPI.shell.openExternal('https://github.com/swiftruru/skillcraft-ims/blob/main/docs/google-cloud-setup.md') }}
            >
              {s.openGuide} <ExternalLink className="w-3 h-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={sheetsForm.handleSubmit(onSaveSheets)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{s.sheetId}</Label>
              <Input
                {...sheetsForm.register('googleSheetId')}
                placeholder={s.sheetIdPlaceholder}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{s.keyPath}</Label>
              <Input
                {...sheetsForm.register('serviceAccountKeyPath')}
                placeholder={s.keyPathPlaceholder}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">{s.keyPathDesc}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{s.syncInterval}</Label>
                <Input type="number" min={5} max={1440} {...sheetsForm.register('syncIntervalMinutes')} />
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...sheetsForm.register('autoSyncEnabled')} className="w-4 h-4 rounded" />
                  <span className="text-sm">{s.autoSync}</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={sheetsMutation.isPending} size="sm">
                {sheetsSaveStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : s.saveSettings}
              </Button>
              {sheetsSaveStatus === 'success' && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {s.saved}
                </span>
              )}

              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testStatus === 'loading'}>
                  {testStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  {s.testConnection}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleInitStructure} disabled={initStatus === 'loading'}>
                  {initStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  {s.initSheet}
                </Button>
              </div>
            </div>

            {testStatus !== 'idle' && testStatus !== 'loading' && (
              <div className={`flex items-center gap-2 text-sm ${testStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {testStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {testMsg}
              </div>
            )}
            {initStatus !== 'idle' && initStatus !== 'loading' && (
              <div className={`flex items-center gap-2 text-sm ${initStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {initStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {initMsg}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <AiSettingsCard settings={settings} onSaved={() => queryClient.invalidateQueries({ queryKey: ['settings'] })} />

      {/* DB Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{s.dbInfo}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground shrink-0">{s.dbPath}</span>
            <span className="font-mono text-xs break-all">{settings?.dbPath ?? t.common.loading}</span>
          </div>
        </CardContent>
      </Card>

      {/* Demo Data Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" />
            {s.mockDataTitle}
          </CardTitle>
          <CardDescription>{s.mockDataDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scale */}
          <div className="space-y-1.5">
            <Label>{s.mockDataScale}</Label>
            <div className="flex gap-2">
              {(['S', 'M', 'L'] as MockScale[]).map(scale => (
                <button
                  key={scale}
                  onClick={() => setMockScale(scale)}
                  className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${mockScale === scale ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'}`}
                >
                  <span className="font-bold">{scale}</span>
                  <span className="block text-[10px] font-normal opacity-75">{s.mockDataProducts(SCALE_CONFIG[scale].products)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div className="space-y-1.5">
            <Label>{s.mockDataScenario}</Label>
            <div className="flex flex-col gap-1.5">
              {(['normal', 'warning', 'empty'] as MockScenario[]).map(sc => (
                <button
                  key={sc}
                  onClick={() => setMockScenario(sc)}
                  className={`flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors text-left ${mockScenario === sc ? 'bg-primary/10 border-primary text-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'}`}
                >
                  <span className="font-medium">{SCENARIO_CONFIG[sc].label}</span>
                  <span className="text-xs">{SCENARIO_CONFIG[sc].desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Estimated counts */}
          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {s.mockDataEstimate(8, 12, SCALE_CONFIG[mockScale].products, SCALE_CONFIG[mockScale].purchases, SCALE_CONFIG[mockScale].sales)}
          </div>

          {/* Generate button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateMock}
            disabled={mockStatus.type === 'loading'}
            className="w-full border-red-600/50 text-red-400 hover:bg-red-600/10 hover:border-red-500"
          >
            {mockStatus.type === 'loading'
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{s.mockDataGenerating}</>
              : <><Database className="w-4 h-4 mr-2" />{s.mockDataGenerate}</>}
          </Button>

          {/* Result */}
          {mockStatus.type === 'success' && mockStatus.counts && (
            <div className="rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2.5 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-green-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {s.mockDataDone}
              </div>
              <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-muted-foreground mt-1">
                <span>{s.mockDataSuppliers(mockStatus.counts.suppliers)}</span>
                <span>{s.mockDataCustomers(mockStatus.counts.customers)}</span>
                <span>{s.mockDataProductsCount(mockStatus.counts.products)}</span>
                <span>{s.mockDataPurchases(mockStatus.counts.purchaseOrders)}</span>
                <span>{s.mockDataSales(mockStatus.counts.salesOrders)}</span>
                <span>{s.mockDataAdjustments(mockStatus.counts.adjustments)}</span>
                <span>{s.mockDataStockTakes(mockStatus.counts.stockTakes)}</span>
              </div>
            </div>
          )}
          {mockStatus.type === 'error' && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <XCircle className="w-4 h-4 shrink-0" />
              {mockStatus.msg}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{s.dbSection}</CardTitle>
          <CardDescription>{s.dbSectionDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-border mb-3">
            <div>
              <p className="text-sm font-medium">{s.autoBackup}</p>
              <p className="text-xs text-muted-foreground">{s.autoBackupDesc}</p>
            </div>
            <Switch
              checked={settings?.autoBackupEnabled ?? false}
              onCheckedChange={(checked) =>
                window.electronAPI.settings.set('autoBackupEnabled', String(checked)).then(() =>
                  queryClient.invalidateQueries({ queryKey: ['settings'] })
                )
              }
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackup}
              disabled={backupStatus.type === 'loading'}
              className="flex items-center gap-2"
            >
              {backupStatus.type === 'loading'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <HardDrive className="w-4 h-4" />}
              {s.backup}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestore}
              disabled={restoreStatus.type === 'loading'}
              className="flex items-center gap-2 border-yellow-600 text-yellow-500 hover:bg-yellow-600/10"
            >
              {restoreStatus.type === 'loading'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <UploadCloud className="w-4 h-4" />}
              {s.restore}
            </Button>
          </div>
          {backupStatus.type === 'success' && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="break-all">{backupStatus.msg}</span>
            </div>
          )}
          {backupStatus.type === 'error' && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <XCircle className="w-4 h-4 shrink-0" />
              {backupStatus.msg}
            </div>
          )}
          {restoreStatus.type === 'error' && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <XCircle className="w-4 h-4 shrink-0" />
              {restoreStatus.msg}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nav Shortcuts */}
      <ShortcutsCard />

      {/* About & Updates */}
      <UpdateCard />
    </div>
  )
}

function ShortcutsCard() {
  const t = useLang()
  const { shortcuts, setKey, resetAll } = useShortcutsStore()
  const [editingPath, setEditingPath] = useState<string | null>(null)
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const NAV_LABELS: Record<string, string> = {
    '/': t.nav.dashboard,
    '/products': t.nav.products,
    '/purchases': t.nav.purchases,
    '/sales': t.nav.sales,
    '/suppliers': t.nav.suppliers,
    '/customers': t.nav.customers,
    '/receivables': t.nav.receivables,
    '/reports': t.nav.reports,
    '/stock-take': t.nav.stockTake,
    '/inventory-history': t.nav.inventoryHistory,
    '/settings': t.nav.settings,
  }

  const startEdit = (path: string, currentKey: string) => {
    setEditingPath(path)
    setInputVal(currentKey)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const commitEdit = (path: string) => {
    if (inputVal.trim()) setKey(path, inputVal.trim())
    setEditingPath(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>導覽快捷鍵</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={resetAll}>
            <RotateCcw className="w-3 h-3" />恢復預設
          </Button>
        </CardTitle>
        <CardDescription>按 <kbd className="font-mono text-xs border rounded px-1">G</kbd> 後再按對應鍵即可跳轉頁面。點擊鍵值可自訂。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {DEFAULT_SHORTCUTS.map(({ path }) => {
            const current = shortcuts.find((s) => s.path === path)
            const key = current?.key ?? ''
            const isEditing = editingPath === path
            return (
              <div key={path} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                <span className="text-sm">{NAV_LABELS[path] ?? path}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">G +</span>
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      className="w-10 h-7 text-center text-sm font-mono border border-primary rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring uppercase"
                      maxLength={1}
                      value={inputVal.toUpperCase()}
                      onChange={(e) => setInputVal(e.target.value.toLowerCase())}
                      onBlur={() => commitEdit(path)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit(path)
                        if (e.key === 'Escape') setEditingPath(null)
                      }}
                    />
                  ) : (
                    <button
                      title="點擊自訂"
                      className="w-10 h-7 font-mono text-sm border border-border rounded hover:border-primary hover:text-primary transition-colors bg-muted/40"
                      onClick={() => startEdit(path, key)}
                    >
                      {key ? key.toUpperCase() : <span className="text-muted-foreground/40">—</span>}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

type UpdateStatus =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'up-to-date' }
  | { type: 'available'; version: string }
  | { type: 'downloading'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

function UpdateCard() {
  const [status, setStatus] = useState<UpdateStatus>({ type: 'idle' })
  const [currentVersion, setCurrentVersion] = useState('')

  useEffect(() => {
    window.electronAPI.app.getVersion().then(setCurrentVersion)
  }, [])

  useEffect(() => {
    const unsubs = [
      window.electronAPI.updater.onUpdateAvailable((info) =>
        setStatus({ type: 'available', version: info.version })
      ),
      window.electronAPI.updater.onUpdateNotAvailable(() =>
        setStatus({ type: 'up-to-date' })
      ),
      window.electronAPI.updater.onDownloadProgress((p) =>
        setStatus({ type: 'downloading', percent: p.percent })
      ),
      window.electronAPI.updater.onUpdateDownloaded((info) =>
        setStatus({ type: 'downloaded', version: info.version })
      ),
      window.electronAPI.updater.onError((msg) =>
        setStatus({ type: 'error', message: msg })
      ),
    ]
    return () => unsubs.forEach((fn) => fn())
  }, [])

  const handleCheck = async () => {
    setStatus({ type: 'checking' })
    try {
      await window.electronAPI.updater.checkForUpdates()
    } catch (e) {
      setStatus({ type: 'error', message: (e as Error).message })
    }
  }

  const handleInstall = () => window.electronAPI.updater.installUpdate()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          關於與更新
        </CardTitle>
        <CardDescription>目前版本：<span className="font-mono">v{currentVersion}</span></CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.type === 'idle' || status.type === 'up-to-date' || status.type === 'error' ? (
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleCheck} className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              檢查更新
            </Button>
            {status.type === 'up-to-date' && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 已是最新版本
              </span>
            )}
            {status.type === 'error' && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> {status.message}
              </span>
            )}
          </div>
        ) : status.type === 'checking' ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> 檢查更新中…
          </div>
        ) : status.type === 'available' ? (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Download className="w-4 h-4" />
            發現新版本 <span className="font-mono font-semibold">v{status.version}</span>，正在下載…
          </div>
        ) : status.type === 'downloading' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>下載中…</span>
              <span>{status.percent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${status.percent}%` }}
              />
            </div>
          </div>
        ) : status.type === 'downloaded' ? (
          <div className="space-y-2">
            <p className="text-sm text-green-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>v{status.version} 已下載完成，點擊安裝後將重啟應用程式</span>
            </p>
            <Button size="sm" onClick={handleInstall} className="gap-2">
              <Download className="w-3.5 h-3.5" />
              立即安裝並重啟
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function AiSettingsCard({ settings, onSaved }: { settings: AppSettings | undefined; onSaved: () => void }) {
  const [apiKey, setApiKey] = useState('')
  const [saveStatus, setSaveStatus] = useState<Status>('idle')

  useEffect(() => {
    if (settings?.claudeApiKey !== undefined) {
      setApiKey(settings.claudeApiKey)
    }
  }, [settings?.claudeApiKey])

  const handleSave = async () => {
    setSaveStatus('loading')
    try {
      await window.electronAPI.settings.set('claudeApiKey', apiKey.trim())
      onSaved()
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI 需求預測</CardTitle>
        <CardDescription>
          設定 Claude API Key 以啟用 AI 銷售預測與補貨建議功能。API Key 僅儲存在本機。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Claude API Key</Label>
          <Input
            type="password"
            placeholder="sk-ant-..."
            className="font-mono text-sm"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            從 console.anthropic.com 取得 API Key。使用的模型為 claude-haiku-4-5（低成本）。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleSave} disabled={saveStatus === 'loading'}>
            {saveStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : '儲存'}
          </Button>
          {saveStatus === 'success' && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 已儲存
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> 儲存失敗
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

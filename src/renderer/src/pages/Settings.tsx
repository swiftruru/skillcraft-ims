import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { CheckCircle2, XCircle, Loader2, ExternalLink, HardDrive, UploadCloud, Database } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AppSettings } from '@/types/schema'
import { useLang } from '@/lib/useLang'

type Status = 'idle' | 'loading' | 'success' | 'error'
type DbOpStatus = { type: 'idle' | 'loading' | 'success' | 'error'; msg?: string }
type MockScale = 'S' | 'M' | 'L'
type MockScenario = 'normal' | 'warning' | 'empty'
type MockStatus = { type: 'idle' | 'loading' | 'success' | 'error'; msg?: string; counts?: Record<string, number> }

const SCALE_CONFIG: Record<MockScale, { products: number; purchases: number; sales: number }> = {
  S: { products: 30, purchases: 40, sales: 80 },
  M: { products: 60, purchases: 80, sales: 160 },
  L: { products: 100, purchases: 150, sales: 300 },
}
const SCENARIO_CONFIG: Record<MockScenario, { label: string; desc: string }> = {
  normal: { label: '正常庫存', desc: '所有商品庫存充足' },
  warning: { label: '低庫存警示', desc: '約 30% 商品低於補貨點' },
  empty: { label: '偶有缺貨', desc: '約 20% 商品庫存歸零' },
}

type CompanyForm = { companyName: string; companyAddress: string; companyPhone: string }
type SheetsForm = { googleSheetId: string; serviceAccountKeyPath: string; syncIntervalMinutes: number; autoSyncEnabled: boolean }

export default function Settings() {
  const t = useLang()
  const s = t.settings
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
          <CardTitle className="text-base">公司資訊</CardTitle>
          <CardDescription>列印採購單與銷售單 PDF 時顯示的公司資訊</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={companyForm.handleSubmit(onSaveCompany)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>公司名稱</Label>
              <Input {...companyForm.register('companyName')} placeholder="例：SkillCraft 股份有限公司" />
            </div>
            <div className="space-y-1.5">
              <Label>公司地址</Label>
              <Input {...companyForm.register('companyAddress')} placeholder="例：台北市信義區信義路五段 7 號" />
            </div>
            <div className="space-y-1.5">
              <Label>聯絡電話</Label>
              <Input {...companyForm.register('companyPhone')} placeholder="例：(02) 1234-5678" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={companyMutation.isPending} size="sm">
                {companySaveStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : s.saveSettings}
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
            Demo 資料產生
          </CardTitle>
          <CardDescription>一鍵清除現有資料並產生豐富的 Mock 資料，讓系統所有功能立即可以展示</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scale */}
          <div className="space-y-1.5">
            <Label>資料規模</Label>
            <div className="flex gap-2">
              {(['S', 'M', 'L'] as MockScale[]).map(scale => (
                <button
                  key={scale}
                  onClick={() => setMockScale(scale)}
                  className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${mockScale === scale ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'}`}
                >
                  <span className="font-bold">{scale}</span>
                  <span className="block text-[10px] font-normal opacity-75">{SCALE_CONFIG[scale].products} 商品</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div className="space-y-1.5">
            <Label>庫存情境</Label>
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
            預計產生：供應商 8 家、客戶 12 家、商品 {SCALE_CONFIG[mockScale].products} 項、採購單 {SCALE_CONFIG[mockScale].purchases} 筆、銷售單 {SCALE_CONFIG[mockScale].sales} 筆
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
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />正在產生 Demo 資料...</>
              : <><Database className="w-4 h-4 mr-2" />產生 Demo 資料（清除現有資料）</>}
          </Button>

          {/* Result */}
          {mockStatus.type === 'success' && mockStatus.counts && (
            <div className="rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2.5 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-green-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Demo 資料產生完成，請切換頁面查看
              </div>
              <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-muted-foreground mt-1">
                <span>供應商：{mockStatus.counts.suppliers}</span>
                <span>客戶：{mockStatus.counts.customers}</span>
                <span>商品：{mockStatus.counts.products}</span>
                <span>採購單：{mockStatus.counts.purchaseOrders}</span>
                <span>銷售單：{mockStatus.counts.salesOrders}</span>
                <span>庫存調整：{mockStatus.counts.adjustments}</span>
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
              <p className="text-sm font-medium">自動備份</p>
              <p className="text-xs text-muted-foreground">每日凌晨 2 點自動備份，保留 30 天</p>
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
    </div>
  )
}

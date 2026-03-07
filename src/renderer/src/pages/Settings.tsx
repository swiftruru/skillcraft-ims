import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AppSettings } from '@/types/schema'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function Settings() {
  const [testStatus, setTestStatus] = useState<Status>('idle')
  const [testMsg, setTestMsg] = useState('')
  const [initStatus, setInitStatus] = useState<Status>('idle')
  const [initMsg, setInitMsg] = useState('')
  const [saveStatus, setSaveStatus] = useState<Status>('idle')

  const { data: settings } = useQuery<AppSettings>({
    queryKey: ['settings'],
    queryFn: () => window.electronAPI.settings.get()
  })

  const { register, handleSubmit, reset } = useForm<{
    googleSheetId: string
    serviceAccountKeyPath: string
    syncIntervalMinutes: number
    autoSyncEnabled: boolean
  }>()

  useEffect(() => {
    if (settings) {
      reset({
        googleSheetId: settings.googleSheetId,
        serviceAccountKeyPath: settings.serviceAccountKeyPath,
        syncIntervalMinutes: settings.syncIntervalMinutes,
        autoSyncEnabled: settings.autoSyncEnabled
      })
    }
  }, [settings, reset])

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) => window.electronAPI.settings.setAll(data),
    onSuccess: () => { setSaveStatus('success'); setTimeout(() => setSaveStatus('idle'), 2000) },
    onError: () => setSaveStatus('error')
  })

  const onSave = (data: { googleSheetId: string; serviceAccountKeyPath: string; syncIntervalMinutes: number; autoSyncEnabled: boolean }) => {
    setSaveStatus('loading')
    saveMutation.mutate({
      googleSheetId: data.googleSheetId,
      serviceAccountKeyPath: data.serviceAccountKeyPath,
      syncIntervalMinutes: String(data.syncIntervalMinutes),
      autoSyncEnabled: String(data.autoSyncEnabled)
    })
  }

  const handleTest = async () => {
    setTestStatus('loading')
    setTestMsg('測試連線中...')
    const result = await window.electronAPI.sync.testConnection()
    if (result.success) {
      setTestStatus('success')
      setTestMsg('連線成功！')
    } else {
      setTestStatus('error')
      setTestMsg(result.error ?? '連線失敗')
    }
  }

  const handleInitStructure = async () => {
    setInitStatus('loading')
    setInitMsg('初始化中...')
    const result = await window.electronAPI.sync.initSheetStructure()
    if (result.success) {
      setInitStatus('success')
      setInitMsg('Sheet 結構初始化完成！')
    } else {
      setInitStatus('error')
      setInitMsg(result.error ?? '初始化失敗')
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Google Sheets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Google Sheets 同步設定</CardTitle>
          <CardDescription>
            設定 Service Account 憑證以啟用雙向同步。{' '}
            <a href="#" className="text-primary underline inline-flex items-center gap-1" onClick={() => {}}>
              查看設定說明 <ExternalLink className="w-3 h-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Google Sheet ID</Label>
              <Input
                {...register('googleSheetId')}
                placeholder="從試算表 URL 複製 ID（docs.google.com/spreadsheets/d/{ID}/edit）"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Service Account Key 路徑</Label>
              <Input
                {...register('serviceAccountKeyPath')}
                placeholder="/Users/yourname/.config/skillcraft-ims/service-account.json"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                從 Google Cloud Console 下載的 JSON 金鑰檔案完整路徑
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>自動同步間隔（分鐘）</Label>
                <Input type="number" min={5} max={1440} {...register('syncIntervalMinutes')} />
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('autoSyncEnabled')} className="w-4 h-4 rounded" />
                  <span className="text-sm">啟用自動同步</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saveMutation.isPending} size="sm">
                {saveStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : '儲存設定'}
              </Button>
              {saveStatus === 'success' && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 已儲存
                </span>
              )}

              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testStatus === 'loading'}>
                  {testStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  測試連線
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleInitStructure} disabled={initStatus === 'loading'}>
                  {initStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  初始化 Sheet
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
          <CardTitle className="text-base">資料庫資訊</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground shrink-0">資料庫路徑：</span>
            <span className="font-mono text-xs break-all">{settings?.dbPath ?? '載入中...'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

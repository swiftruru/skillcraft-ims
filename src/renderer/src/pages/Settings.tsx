import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { CheckCircle2, XCircle, Loader2, ExternalLink, HardDrive, UploadCloud } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AppSettings } from '@/types/schema'
import { useLang } from '@/lib/useLang'

type Status = 'idle' | 'loading' | 'success' | 'error'
type DbOpStatus = { type: 'idle' | 'loading' | 'success' | 'error'; msg?: string }

export default function Settings() {
  const t = useLang()
  const s = t.settings
  const [testStatus, setTestStatus] = useState<Status>('idle')
  const [testMsg, setTestMsg] = useState('')
  const [initStatus, setInitStatus] = useState<Status>('idle')
  const [initMsg, setInitMsg] = useState('')
  const [saveStatus, setSaveStatus] = useState<Status>('idle')
  const [backupStatus, setBackupStatus] = useState<DbOpStatus>({ type: 'idle' })
  const [restoreStatus, setRestoreStatus] = useState<DbOpStatus>({ type: 'idle' })

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
    // On success the app relaunches automatically
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
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{s.sheetId}</Label>
              <Input
                {...register('googleSheetId')}
                placeholder={s.sheetIdPlaceholder}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{s.keyPath}</Label>
              <Input
                {...register('serviceAccountKeyPath')}
                placeholder={s.keyPathPlaceholder}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">{s.keyPathDesc}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{s.syncInterval}</Label>
                <Input type="number" min={5} max={1440} {...register('syncIntervalMinutes')} />
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('autoSyncEnabled')} className="w-4 h-4 rounded" />
                  <span className="text-sm">{s.autoSync}</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saveMutation.isPending} size="sm">
                {saveStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : s.saveSettings}
              </Button>
              {saveStatus === 'success' && (
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

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{s.dbSection}</CardTitle>
          <CardDescription>{s.dbSectionDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

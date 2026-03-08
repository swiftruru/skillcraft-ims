import { CheckCircle2, Loader2, MousePointerClick } from 'lucide-react'
import { useDemoStore } from '@/stores/demo.store'
import { useLangStore } from '@/stores/lang.store'
import { Button } from '@/components/ui/button'

export function DemoFormOverlay() {
  const { formOverlay, submitCallback } = useDemoStore()
  const { lang } = useLangStore()
  const isZh = lang === 'zh'
  const t = (obj: { zh: string; en: string }) => obj[lang]

  if (!formOverlay) return null

  const { title, subtitle, fields, waitingForSubmit, isSubmitting } = formOverlay
  const currentFieldIndex = fields.findIndex((f) => !f.done)

  const handleSubmit = () => {
    // Grab and immediately clear to guarantee at-most-once execution
    const cb = submitCallback
    useDemoStore.getState().setSubmitCallback(null)
    cb?.()
  }

  return (
    // z-40 so DemoController bottom panel (z-50) stays on top
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold">{t(title)}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t(subtitle)}</p>
        </div>

        {/* Fields */}
        <div className="px-6 py-5 space-y-4">
          {fields.map((field, i) => {
            const isCurrentField = i === currentFieldIndex && !waitingForSubmit && !isSubmitting
            const isPending = !field.done && i > currentFieldIndex && !waitingForSubmit && !isSubmitting

            return (
              <div
                key={field.key}
                className={`transition-opacity duration-300 ${isPending ? 'opacity-25' : 'opacity-100'}`}
              >
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {t(field.label)}
                </label>
                <div
                  className={`
                    relative flex items-center rounded-md border px-3 py-2 text-sm bg-background min-h-[36px]
                    transition-colors duration-200
                    ${field.done
                      ? 'border-green-500/40 bg-green-500/5'
                      : isCurrentField
                        ? 'border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.15)]'
                        : 'border-border'
                    }
                  `}
                >
                  <span className="flex-1 font-mono text-sm">
                    {field.typed}
                  </span>
                  {/* Blinking cursor for active field */}
                  {isCurrentField && (
                    <span className="animate-blink text-primary font-thin">|</span>
                  )}
                  {/* Checkmark for completed fields */}
                  {field.done && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 ml-2" />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <p className={`text-xs transition-colors ${waitingForSubmit ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            {isSubmitting
              ? (isZh ? '正在儲存資料...' : 'Saving...')
              : waitingForSubmit
                ? (isZh ? '✓ 填寫完成，請點擊「確認送出」' : '✓ Done — click "Submit" to confirm')
                : (isZh ? '自動填寫中...' : 'Auto-filling...')
            }
          </p>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!waitingForSubmit || isSubmitting}
            className={`gap-1.5 shrink-0 transition-all ${
              waitingForSubmit && !isSubmitting
                ? 'animate-pulse shadow-[0_0_12px_hsl(var(--primary)/0.4)]'
                : ''
            }`}
          >
            {isSubmitting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{isZh ? '送出中...' : 'Submitting...'}</>
              : waitingForSubmit
                ? <><MousePointerClick className="w-3.5 h-3.5" />{isZh ? '確認送出' : 'Submit'}</>
                : (isZh ? '確認送出' : 'Submit')
            }
          </Button>
        </div>
      </div>
    </div>
  )
}

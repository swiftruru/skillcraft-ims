import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight, Sparkles, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLangStore } from '@/stores/lang.store'
import { useUxTourStore } from '@/stores/uxTour.store'
import { UX_TOUR_STEPS } from '@/lib/uxTourSteps'

const TOTAL = UX_TOUR_STEPS.length

export function UxTourOverlay() {
  const navigate = useNavigate()
  const { lang } = useLangStore()
  const { isOpen, currentStep, close, next, prev } = useUxTourStore()

  const isZh = lang === 'zh'
  const t = <T extends { zh: string; en: string }>(obj: T): string => obj[lang]

  useEffect(() => {
    if (!isOpen) return
    const step = UX_TOUR_STEPS[currentStep]
    navigate(step.route)
  }, [isOpen, currentStep]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  const step = UX_TOUR_STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === TOTAL - 1
  const progress = ((currentStep + 1) / TOTAL) * 100

  return (
    <div className="fixed top-0 right-0 h-screen w-80 z-50 flex flex-col bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-300">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold">
            {isZh ? '特色 Demo' : 'UX Feature Tour'}
          </span>
        </div>
        <button
          onClick={close}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-muted shrink-0">
        <div
          className="h-full bg-violet-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicator dots */}
      <div className="flex items-center gap-1 px-4 py-2 shrink-0">
        {UX_TOUR_STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentStep ? 'w-4 bg-violet-400' :
              i < currentStep ? 'w-1.5 bg-violet-400/40' :
              'w-1.5 bg-muted'
            }`}
          />
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {currentStep + 1} / {TOTAL}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">

        {/* Step header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">{step.emoji}</span>
            <div>
              <h3 className="text-sm font-semibold leading-snug">{t(step.title)}</h3>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium shrink-0 mt-0.5 whitespace-nowrap">
            {t(step.tag)}
          </span>
        </div>

        {/* Description */}
        <div className="rounded-lg bg-muted/40 px-3 py-2.5">
          <p className="text-xs text-foreground leading-relaxed">{t(step.description)}</p>
        </div>

        {/* UX Highlight */}
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-yellow-400" />
            <span className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider">
              {isZh ? 'UX 亮點' : 'UX Highlight'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{t(step.uxHighlight)}</p>
        </div>

        {/* Look Here */}
        {step.lookHere && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 flex gap-2">
            <Eye className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-blue-400 mb-1 uppercase tracking-wider">
                {isZh ? '看哪裡' : 'Look Here'}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">{t(step.lookHere)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3 flex flex-col gap-2 shrink-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prev}
            disabled={isFirst}
            className="flex-1 gap-1 text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {isZh ? '上一步' : 'Prev'}
          </Button>
          <Button
            variant={isLast ? 'outline' : 'default'}
            size="sm"
            onClick={isLast ? close : next}
            className={`flex-1 gap-1 text-xs ${!isLast ? 'bg-violet-600 hover:bg-violet-700 border-violet-600' : ''}`}
          >
            {isLast ? (isZh ? '完成' : 'Done') : (isZh ? '下一步' : 'Next')}
            {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <button
          onClick={close}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
        >
          {isZh ? '關閉特色 Demo' : 'Close UX Tour'}
        </button>
      </div>
    </div>
  )
}

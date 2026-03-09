import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight, Sparkles, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLangStore } from '@/stores/lang.store'
import { useUxTourStore } from '@/stores/uxTour.store'
import { UX_TOUR_STEPS } from '@/lib/uxTourSteps'

const TOTAL = UX_TOUR_STEPS.length
const PAD = 10

interface TargetRect {
  top: number; left: number; width: number; height: number
}

function useTargetRect(selector: string | undefined, isOpen: boolean, currentStep: number) {
  const [rect, setRect] = useState<TargetRect | null>(null)

  useEffect(() => {
    if (!isOpen || !selector) { setRect(null); return }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let attempts = 0

    const find = () => {
      if (cancelled) return
      const el = document.querySelector(selector)
      if (el) {
        const r = el.getBoundingClientRect()
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      } else if (attempts < 15) {
        attempts++
        timer = setTimeout(find, 200)
      } else {
        setRect(null)
      }
    }
    timer = setTimeout(find, 150)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [selector, isOpen, currentStep])

  return rect
}

export function UxTourOverlay() {
  const navigate = useNavigate()
  const { lang } = useLangStore()
  const { isOpen, currentStep, close, next, prev } = useUxTourStore()
  const tooltipRef = useRef<HTMLDivElement>(null)

  const isZh = lang === 'zh'
  const t = <T extends { zh: string; en: string }>(obj: T): string => obj[lang]

  const step = isOpen ? UX_TOUR_STEPS[currentStep] : null

  useEffect(() => {
    if (!isOpen || !step) return
    navigate(step.route)
  }, [isOpen, currentStep]) // eslint-disable-line react-hooks/exhaustive-deps

  const targetRect = useTargetRect(step?.targetSelector, isOpen, currentStep)

  if (!isOpen || !step) return null

  const isFirst = currentStep === 0
  const isLast = currentStep === TOTAL - 1
  const progress = ((currentStep + 1) / TOTAL) * 100

  // Spotlight box (with padding)
  const spot = targetRect ? {
    top: targetRect.top - PAD,
    left: targetRect.left - PAD,
    width: targetRect.width + PAD * 2,
    height: targetRect.height + PAD * 2,
  } : null

  // Tooltip position
  const TOOLTIP_W = 380
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    width: TOOLTIP_W,
    zIndex: 70,
  }
  if (spot) {
    const spaceBelow = window.innerHeight - (spot.top + spot.height)
    const spaceAbove = spot.top

    let left = spot.left + spot.width / 2 - TOOLTIP_W / 2
    left = Math.max(12, Math.min(left, window.innerWidth - TOOLTIP_W - 12))

    if (spaceBelow >= 280 || spaceBelow > spaceAbove) {
      tooltipStyle = { ...tooltipStyle, top: spot.top + spot.height + 12, left }
    } else {
      tooltipStyle = { ...tooltipStyle, bottom: window.innerHeight - spot.top + 12, left }
    }
  } else {
    tooltipStyle = {
      ...tooltipStyle,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }

  return (
    <>
      {/* Overlay: 4-quadrant approach to create a spotlight hole */}
      {spot ? (
        <>
          {/* Top */}
          <div style={{ position: 'fixed', zIndex: 60, inset: 0, bottom: `calc(100% - ${spot.top}px)`, background: 'rgba(0,0,0,0.65)' }} />
          {/* Bottom */}
          <div style={{ position: 'fixed', zIndex: 60, left: 0, right: 0, top: spot.top + spot.height, bottom: 0, background: 'rgba(0,0,0,0.65)' }} />
          {/* Left */}
          <div style={{ position: 'fixed', zIndex: 60, left: 0, width: spot.left, top: spot.top, height: spot.height, background: 'rgba(0,0,0,0.65)' }} />
          {/* Right */}
          <div style={{ position: 'fixed', zIndex: 60, left: spot.left + spot.width, right: 0, top: spot.top, height: spot.height, background: 'rgba(0,0,0,0.65)' }} />
          {/* Violet ring around spotlight */}
          <div style={{ position: 'fixed', zIndex: 61, top: spot.top, left: spot.left, width: spot.width, height: spot.height, pointerEvents: 'none', borderRadius: 8, outline: '2px solid rgba(139,92,246,0.8)', outlineOffset: 0, boxShadow: '0 0 0 4px rgba(139,92,246,0.2), 0 0 20px rgba(139,92,246,0.3)' }} />
        </>
      ) : (
        <div style={{ position: 'fixed', zIndex: 60, inset: 0, background: 'rgba(0,0,0,0.65)' }} />
      )}

      {/* Tooltip bubble */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <span className="text-xl shrink-0">{step.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium shrink-0">
                {t(step.tag)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {currentStep + 1} / {TOTAL}
              </span>
            </div>
            <h3 className="text-sm font-semibold leading-tight mt-0.5 truncate">{t(step.title)}</h3>
          </div>
          <button onClick={close} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-muted shrink-0">
          <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {/* Body */}
        <div className="px-4 py-3 flex flex-col gap-2.5 max-h-64 overflow-y-auto">
          <p className="text-xs text-foreground leading-relaxed">{t(step.description)}</p>

          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 flex gap-2">
            <Sparkles className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">{t(step.uxHighlight)}</p>
          </div>

          {step.lookHere && (
            <div className="flex gap-2 items-start">
              <Eye className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-400/90 leading-relaxed">{t(step.lookHere)}</p>
            </div>
          )}
        </div>

        {/* Footer: navigation */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
          <Button
            variant="outline" size="sm"
            onClick={prev} disabled={isFirst}
            className="flex-1 gap-1 text-xs h-7"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {isZh ? '上一步' : 'Prev'}
          </Button>
          <Button
            size="sm"
            onClick={isLast ? close : next}
            className={`flex-1 gap-1 text-xs h-7 ${!isLast ? 'bg-violet-600 hover:bg-violet-700 border-violet-600' : ''}`}
          >
            {isLast ? (isZh ? '完成' : 'Done') : (isZh ? '下一步' : 'Next')}
            {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
    </>
  )
}

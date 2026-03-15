import { useEffect, useRef, useState } from 'react'
import { useIsFetching } from '@tanstack/react-query'

export function NavProgressBar() {
  const isFetching = useIsFetching()
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState<'run' | 'fade'>('run')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isFetching > 0) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setPhase('run')
      setVisible(true)
    } else if (visible) {
      setPhase('fade')
      timerRef.current = setTimeout(() => setVisible(false), 300)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isFetching]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 overflow-hidden">
      <div
        key={phase}
        className={`h-full bg-primary ${phase === 'run' ? 'animate-nav-progress' : 'animate-nav-fade'}`}
      />
    </div>
  )
}

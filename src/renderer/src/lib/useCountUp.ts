import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 600): number {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef(0)

  useEffect(() => {
    fromRef.current = current
    startRef.current = null
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const from = fromRef.current
    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      const value = from + (target - from) * ease
      setCurrent(progress < 1 ? value : target)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration]) // eslint-disable-line react-hooks/exhaustive-deps

  return current
}

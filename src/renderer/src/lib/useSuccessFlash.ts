import { useState, useCallback } from 'react'

const FLASH_DURATION = 600

export function useSuccessFlash() {
  const [flashId, setFlashId] = useState<number | string | null>(null)

  const triggerFlash = useCallback((id: number | string) => {
    setFlashId(id)
    setTimeout(() => setFlashId(null), FLASH_DURATION)
  }, [])

  return { flashId, triggerFlash }
}

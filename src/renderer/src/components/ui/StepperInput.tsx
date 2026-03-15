import { Minus, Plus } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { cn } from '@/lib/utils'

interface StepperInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  disabled?: boolean
}

export function StepperInput({ value, onChange, min = 1, max, step = 1, className, disabled }: StepperInputProps) {
  const dec = () => {
    const next = value - step
    if (min !== undefined && next < min) return
    onChange(next)
  }
  const inc = () => {
    const next = value + step
    if (max !== undefined && next > max) return
    onChange(next)
  }
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value)
    if (isNaN(n)) return
    if (min !== undefined && n < min) return onChange(min)
    if (max !== undefined && n > max) return onChange(max)
    onChange(n)
  }

  return (
    <div className={cn('flex items-center', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-r-none border-r-0 shrink-0"
        onClick={dec}
        disabled={disabled || (min !== undefined && value <= min)}
      >
        <Minus className="w-3 h-3" />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        className="h-8 w-16 rounded-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={handleInput}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-l-none border-l-0 shrink-0"
        onClick={inc}
        disabled={disabled || (max !== undefined && value >= max)}
      >
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  )
}

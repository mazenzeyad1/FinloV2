interface ProgressBarProps {
  value: number
  color?: 'primary' | 'success' | 'warning' | 'danger'
  height?: number
  showLabel?: boolean
}

const colorMap = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export function ProgressBar({ value, color = 'primary', height = 6, showLabel = false }: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-surface-3 rounded-full overflow-hidden" style={{ height }}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorMap[color]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] text-text-3 w-8 text-right">{Math.round(clamped)}%</span>
      )}
    </div>
  )
}

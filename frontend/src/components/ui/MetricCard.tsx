import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'

interface MetricCardProps {
  label: string
  value: string
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  accent?: boolean
}

export function MetricCard({ label, value, change, changeType = 'neutral', accent = false }: MetricCardProps) {
  return (
    <div className={`card p-5 ${accent ? 'bg-primary border-primary/20' : ''}`}>
      <p className={`text-[12px] font-medium uppercase tracking-wide mb-1 ${accent ? 'text-primary-200' : 'text-text-3'}`}>
        {label}
      </p>
      <p className={`text-[26px] font-semibold tracking-tight ${accent ? 'text-white' : 'text-text-1'}`}>
        {value}
      </p>
      {change && (
        <div className={`flex items-center gap-1 mt-1 text-[12px] font-medium
          ${changeType === 'up' ? 'text-success' : changeType === 'down' ? 'text-danger' : accent ? 'text-primary-200' : 'text-text-3'}`}>
          {changeType === 'up' && <ArrowUpIcon className="w-3 h-3" />}
          {changeType === 'down' && <ArrowDownIcon className="w-3 h-3" />}
          {change}
        </div>
      )}
    </div>
  )
}

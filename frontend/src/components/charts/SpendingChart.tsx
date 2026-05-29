// @ts-nocheck -- recharts v2 has known type incompatibilities with React 18 @types
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface SpendingChartProps {
  data: { day: string; amount: number }[]
}

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-black/[0.07] rounded-lg px-3 py-2 shadow-md">
      <p className="text-[11px] text-text-3 mb-0.5">{label}</p>
      <p className="text-[13px] font-semibold text-text-1">{CAD.format(payload[0].value)}</p>
    </div>
  )
}

export function SpendingChart({ data }: SpendingChartProps) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barSize={20} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9E9BAD' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9E9BAD' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F0EFF5' }} />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="#7C5CFC" minPointSize={3} />
      </BarChart>
    </ResponsiveContainer>
  )
}

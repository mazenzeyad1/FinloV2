// @ts-nocheck -- recharts v2 has known type incompatibilities with React 18 @types
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface DonutChartProps {
  data: { name: string; value: number; color: string }[]
}

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload
  return (
    <div className="bg-white border border-black/[0.07] rounded-lg px-3 py-2 shadow-md">
      <p className="text-[11px] text-text-3 mb-0.5">{entry.name}</p>
      <p className="text-[13px] font-semibold text-text-1">{CAD.format(entry.value)}</p>
    </div>
  )
}

export function DonutChart({ data }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  // Ensure every slice is at least 5% of total so colors are always visible
  const minDisplay = total * 0.05
  const chartData = data.map(d => ({ ...d, chartValue: Math.max(d.value, minDisplay) }))

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={72}
            paddingAngle={2}
            dataKey="chartValue"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[11px] text-text-3">Total</span>
        <span className="text-[14px] font-semibold text-text-1">{CAD.format(total)}</span>
      </div>
    </div>
  )
}

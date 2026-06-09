import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

interface DataPoint {
  year: number
  month: number
  income: number
  expenses: number
}

interface Props {
  data: DataPoint[]
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-black/[0.08] rounded-xl shadow-lg px-3 py-2.5 text-[12px] space-y-1">
      <p className="text-text-3 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
          <span className="text-text-2 capitalize">{p.name}</span>
          <span className="font-semibold text-text-1 ml-auto">{CAD.format(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function CustomLegend({ payload }: any) {
  return (
    <div className="flex items-center justify-center gap-4 mt-1">
      {payload?.map((p: any) => (
        <div key={p.value} className="flex items-center gap-1.5 text-[11px] text-text-3">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.color }} />
          <span className="capitalize">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function MonthlyBarChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-[13px] text-text-3">
        Not enough data yet
      </div>
    )
  }

  const chartData = data.map((d) => ({
    label: `${MONTH_SHORT[d.month - 1]} ${String(d.year).slice(2)}`,
    income: d.income,
    expenses: d.expenses,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          width={44}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Legend content={<CustomLegend />} />
        <Bar dataKey="income" name="income" fill="#1DB87A" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expenses" name="expenses" fill="#F04E4E" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}

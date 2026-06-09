import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

interface DataPoint {
  year: number
  month: number
  netWorth: number
}

interface Props {
  data: DataPoint[]
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-black/[0.08] rounded-xl shadow-lg px-3 py-2.5 text-[12px]">
      <p className="text-text-3 mb-0.5">{label}</p>
      <p className="font-semibold text-text-1">{CAD.format(payload[0].value)}</p>
    </div>
  )
}

export function NetWorthChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-[13px] text-text-3">
        Not enough data yet
      </div>
    )
  }

  const chartData = data.map((d) => ({
    label: `${MONTH_SHORT[d.month - 1]} ${String(d.year).slice(2)}`,
    netWorth: d.netWorth,
  }))

  const values = chartData.map((d) => d.netWorth)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const isFlat = max - min < 1
  const domainMin = isFlat ? min - 100 : min - Math.abs(min) * 0.05
  const domainMax = isFlat ? max + 100 : max + Math.abs(max) * 0.05

  const isPositive = chartData[chartData.length - 1]?.netWorth >= chartData[0]?.netWorth

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={isPositive ? '#1DB87A' : '#F04E4E'} stopOpacity={0.18} />
            <stop offset="95%" stopColor={isPositive ? '#1DB87A' : '#F04E4E'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[domainMin, domainMax]}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="netWorth"
          stroke={isPositive ? '#1DB87A' : '#F04E4E'}
          strokeWidth={2}
          fill="url(#nwGradient)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

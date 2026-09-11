import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MONTH_NAMES, promoIntensityFor, seasonalityFor } from '../lib/model';

export function TimingChart({ selectedMonth, recommendedMonths }: { selectedMonth: number; recommendedMonths: number[] }) {
  const data = Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
    const promo = promoIntensityFor(month);
    return {
      month,
      label: MONTH_NAMES[month - 1],
      seasonalityIndex: seasonalityFor(month).seasonalityIndex,
      promoPressure: promo.competitorsObserved ? (promo.competitorsOnPromo / promo.competitorsObserved) * promo.avgDiscountPctWhenActive : 0,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e5df" />
        <XAxis dataKey="label" stroke="#61706d" fontSize={12} />
        <YAxis yAxisId="index" stroke="#61706d" fontSize={12} width={36} />
        <YAxis yAxisId="promo" orientation="right" stroke="#b34747" fontSize={12} width={36} tickFormatter={(v) => `${v}`} />
        <Tooltip
          formatter={(value, name) => {
            const n = Number(value);
            return [name === 'Demand index' ? n.toFixed(0) : n.toFixed(1), String(name)];
          }}
        />
        <Bar yAxisId="index" dataKey="seasonalityIndex" name="Demand index" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell
              key={d.month}
              fill={recommendedMonths.includes(d.month) ? '#2f6f5e' : '#c9cec5'}
              stroke={d.month === selectedMonth ? '#1c2b2d' : 'none'}
              strokeWidth={d.month === selectedMonth ? 2 : 0}
            />
          ))}
        </Bar>
        <Line yAxisId="promo" type="monotone" dataKey="promoPressure" name="Competitor promo pressure" stroke="#b34747" strokeWidth={2} dot />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

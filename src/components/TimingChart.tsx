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
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="label" stroke="#64748B" fontSize={12} />
        <YAxis yAxisId="index" stroke="#64748B" fontSize={12} width={36} />
        <YAxis yAxisId="promo" orientation="right" stroke="#F59E0B" fontSize={12} width={36} tickFormatter={(v) => `${v}`} />
        <Tooltip
          contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)' }}
          labelStyle={{ color: '#0F172A' }}
          itemStyle={{ color: '#4F46E5' }}
          formatter={(value, name) => {
            const n = Number(value);
            return [name === 'Demand index' ? n.toFixed(0) : n.toFixed(1), String(name)];
          }}
        />
        <Bar yAxisId="index" dataKey="seasonalityIndex" name="Demand index" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell
              key={d.month}
              fill={recommendedMonths.includes(d.month) ? '#4F46E5' : '#E5E7EB'}
              stroke={d.month === selectedMonth ? '#0F172A' : 'none'}
              strokeWidth={d.month === selectedMonth ? 2 : 0}
            />
          ))}
        </Bar>
        <Line yAxisId="promo" type="monotone" dataKey="promoPressure" name="Competitor promo pressure" stroke="#F59E0B" strokeWidth={2} dot />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

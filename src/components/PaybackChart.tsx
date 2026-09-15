import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PaybackMonthPoint } from '../lib/model';
import { eur0 } from '../lib/format';

export function PaybackChart({ months, paybackMonth }: { months: PaybackMonthPoint[]; paybackMonth: number | null }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={months} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis
          dataKey="month"
          type="number"
          domain={[1, 24]}
          ticks={[1, 3, 6, 9, 12, 15, 18, 21, 24]}
          label={{ value: 'Month', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 12 }}
          stroke="#64748B"
          fontSize={12}
        />
        <YAxis tickFormatter={(v) => eur0(v)} stroke="#64748B" fontSize={12} width={64} />
        <Tooltip
          contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)' }}
          labelStyle={{ color: '#0F172A' }}
          itemStyle={{ color: '#4F46E5' }}
          formatter={(value, name) => [eur0(Number(value)), String(name)]}
          labelFormatter={(v) => `Month ${v}`}
        />
        {paybackMonth !== null && (
          <ReferenceLine
            x={paybackMonth}
            stroke="#0F172A"
            strokeDasharray="4 3"
            label={{ value: `Payback: month ${paybackMonth}`, position: 'top', fill: '#0F172A', fontSize: 12 }}
          />
        )}
        <Line type="monotone" dataKey="cumulativeContribution" name="Cumulative contribution" stroke="#4F46E5" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="cumulativeSpend" name="Cumulative spend" stroke="#64748B" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MONTH_NAMES, promoIntensityFor, seasonalityFor } from '../lib/model';
import { WEATHER_FORECAST_COLOR } from '../lib/colors';
import type { MonthlyForecastPoint } from '../lib/weather';

type TooltipPayloadEntry = { dataKey?: string; name?: string; value?: number | string | null; color?: string };

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string | number }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <p style={{ color: '#0F172A', margin: 0, marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map((entry) => {
        if (entry.value === null || entry.value === undefined) return null;
        const n = Number(entry.value);
        const formatted = entry.dataKey === 'forecastTempC' ? `${n.toFixed(1)}°C` : entry.dataKey === 'seasonalityIndex' ? n.toFixed(0) : n.toFixed(1);
        return (
          <p key={entry.dataKey} style={{ color: entry.color, margin: 0 }}>
            {entry.name}: {formatted}
          </p>
        );
      })}
    </div>
  );
}

export function TimingChart({
  selectedMonth,
  recommendedMonths,
  forecastPoints,
}: {
  selectedMonth: number;
  recommendedMonths: number[];
  forecastPoints: MonthlyForecastPoint[];
}) {
  const forecastByMonth = new Map(forecastPoints.map((p) => [p.month, p.forecastTempC]));
  const data = Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
    const promo = promoIntensityFor(month);
    return {
      month,
      label: MONTH_NAMES[month - 1],
      seasonalityIndex: seasonalityFor(month).seasonalityIndex,
      promoPressure: promo.competitorsObserved ? (promo.competitorsOnPromo / promo.competitorsObserved) * promo.avgDiscountPctWhenActive : 0,
      forecastTempC: forecastByMonth.get(month) ?? null,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="label" stroke="#64748B" fontSize={12} />
        <YAxis yAxisId="index" stroke="#64748B" fontSize={12} width={36} />
        <YAxis yAxisId="promo" orientation="right" stroke="#F59E0B" fontSize={12} width={36} tickFormatter={(v) => `${v}`} />
        <YAxis yAxisId="temp" orientation="right" stroke={WEATHER_FORECAST_COLOR} fontSize={12} width={40} tickFormatter={(v) => `${v}°C`} />
        <Tooltip content={<ChartTooltip />} />
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
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="forecastTempC"
          name="Live forecast temp"
          stroke={WEATHER_FORECAST_COLOR}
          strokeWidth={2}
          dot={{ r: 4, fill: WEATHER_FORECAST_COLOR, strokeWidth: 0 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

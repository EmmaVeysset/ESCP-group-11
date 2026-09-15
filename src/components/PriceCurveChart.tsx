import { CartesianGrid, ComposedChart, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { acceptancePctAt, contributionIndexPer1000, type ChannelWeights } from '../lib/model';
import { eur } from '../lib/format';
import priceSensitivityCurve from '../data/generated/price-sensitivity-curve.json';

const PRICES = priceSensitivityCurve.prices;

export function PriceCurveChart({
  weights,
  segment,
  currentPrice,
  optimalPrice,
}: {
  weights: ChannelWeights;
  segment?: string;
  currentPrice: number;
  optimalPrice: number;
}) {
  const data = PRICES.map((price) => ({
    price,
    acceptancePct: acceptancePctAt(price, segment),
    contributionIndex: contributionIndexPer1000(price, weights, segment),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis
          dataKey="price"
          type="number"
          domain={[PRICES[0], PRICES[PRICES.length - 1]]}
          ticks={[1.0, 1.5, 2.0, 2.5, 3.0, 3.5]}
          tickFormatter={(v) => eur(v, 2)}
          stroke="#64748B"
          fontSize={12}
        />
        <YAxis yAxisId="acceptance" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#64748B" fontSize={12} width={44} />
        <YAxis yAxisId="contribution" orientation="right" tickFormatter={(v) => eur(v, 0)} stroke="#4F46E5" fontSize={12} width={52} />
        <Tooltip
          contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)' }}
          labelStyle={{ color: '#0F172A' }}
          itemStyle={{ color: '#4F46E5' }}
          formatter={(value, name) => {
            const n = Number(value);
            return [name === 'Acceptance' ? `${n.toFixed(1)}%` : eur(n, 0), String(name)];
          }}
          labelFormatter={(v) => `Retail price ${eur(Number(v))}`}
        />
        <ReferenceLine yAxisId="acceptance" x={currentPrice} stroke="#0F172A" strokeDasharray="4 3" />
        <ReferenceDot
          yAxisId="contribution"
          x={optimalPrice}
          y={contributionIndexPer1000(optimalPrice, weights, segment)}
          r={5}
          fill="#4F46E5"
          stroke="none"
        />
        <Line yAxisId="acceptance" type="monotone" dataKey="acceptancePct" name="Acceptance" stroke="#94A3B8" strokeWidth={2} dot={false} />
        <Line
          yAxisId="contribution"
          type="monotone"
          dataKey="contributionIndex"
          name="Contribution index"
          stroke="#4F46E5"
          strokeWidth={2.5}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

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
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e5df" />
        <XAxis
          dataKey="price"
          type="number"
          domain={[PRICES[0], PRICES[PRICES.length - 1]]}
          ticks={[1.0, 1.5, 2.0, 2.5, 3.0, 3.5]}
          tickFormatter={(v) => eur(v, 2)}
          stroke="#61706d"
          fontSize={12}
        />
        <YAxis yAxisId="acceptance" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#61706d" fontSize={12} width={44} />
        <YAxis yAxisId="contribution" orientation="right" tickFormatter={(v) => eur(v, 0)} stroke="#2f6f5e" fontSize={12} width={52} />
        <Tooltip
          formatter={(value, name) => {
            const n = Number(value);
            return [name === 'Acceptance' ? `${n.toFixed(1)}%` : eur(n, 0), String(name)];
          }}
          labelFormatter={(v) => `Retail price ${eur(Number(v))}`}
        />
        <ReferenceLine yAxisId="acceptance" x={currentPrice} stroke="#1c2b2d" strokeDasharray="4 3" />
        <ReferenceDot
          yAxisId="contribution"
          x={optimalPrice}
          y={contributionIndexPer1000(optimalPrice, weights, segment)}
          r={5}
          fill="#2f6f5e"
          stroke="none"
        />
        <Line yAxisId="acceptance" type="monotone" dataKey="acceptancePct" name="Acceptance" stroke="#61706d" strokeWidth={2} dot={false} />
        <Line
          yAxisId="contribution"
          type="monotone"
          dataKey="contributionIndex"
          name="Contribution index"
          stroke="#2f6f5e"
          strokeWidth={2.5}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

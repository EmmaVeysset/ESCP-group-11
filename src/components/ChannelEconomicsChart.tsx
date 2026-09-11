import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COGS_PER_UNIT_EUR, SALES_CHANNELS, unitContribution, type SalesChannel } from '../lib/model';
import { CHANNEL_COLOR } from '../lib/colors';
import { eur } from '../lib/format';

export function ChannelEconomicsChart({ price, activeChannels }: { price: number; activeChannels: Set<SalesChannel> }) {
  const data = SALES_CHANNELS.map((channel) => ({
    channel,
    cogs: COGS_PER_UNIT_EUR,
    contribution: Math.max(unitContribution(price, channel), 0),
    lossBelowCogs: Math.min(unitContribution(price, channel), 0),
    active: activeChannels.has(channel),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }} barCategoryGap={18}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e5df" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => eur(v, 1)} stroke="#61706d" fontSize={12} />
        <YAxis type="category" dataKey="channel" width={100} stroke="#61706d" fontSize={12} />
        <Tooltip formatter={(value, name) => [eur(Number(value), 2), String(name)]} labelFormatter={(v) => `${v} at ${eur(price)}`} />
        <Legend />
        <Bar dataKey="cogs" stackId="a" name="COGS" fill="#d7dad2" radius={[4, 0, 0, 4]} />
        <Bar dataKey="contribution" stackId="a" name="Contribution to LUMEN" radius={[0, 4, 4, 0]}>
          {data.map((d) => (
            <Cell key={d.channel} fill={CHANNEL_COLOR[d.channel]} opacity={d.active ? 1 : 0.35} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

import { MARKETING_CHANNELS, cacFor, ltvToCac, paybackMonths, type ChannelWeights } from '../lib/model';
import { eur } from '../lib/format';

export function RoiTable({ price, salesWeights }: { price: number; salesWeights: ChannelWeights }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[#61706d]">
          <th className="pb-2 font-medium">Acquisition channel</th>
          <th className="pb-2 font-medium text-right">CAC</th>
          <th className="pb-2 font-medium text-right">LTV:CAC</th>
          <th className="pb-2 font-medium text-right">Payback</th>
        </tr>
      </thead>
      <tbody>
        {MARKETING_CHANNELS.map((channel) => {
          const ratio = ltvToCac(price, salesWeights, channel);
          const payback = paybackMonths(price, salesWeights, channel);
          const healthy = ratio >= 3;
          return (
            <tr key={channel} className="border-t border-[#e2e5df]">
              <td className="py-2">{channel}</td>
              <td className="py-2 text-right tabular-nums">{eur(cacFor(channel), 0)}</td>
              <td className={`py-2 text-right tabular-nums font-semibold ${healthy ? 'text-[#2f6f5e]' : 'text-[#b34747]'}`}>
                {ratio.toFixed(1)}:1
              </td>
              <td className="py-2 text-right tabular-nums">{Number.isFinite(payback) ? `${payback.toFixed(1)} mo` : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

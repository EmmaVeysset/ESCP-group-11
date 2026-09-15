import { Card } from './Card';
import type { Phase2Gates } from '../lib/model';
import { eur0, pct } from '../lib/format';

type GateRow = {
  key: keyof Omit<Phase2Gates, 'allPass'>;
  label: string;
  formatValue: (value: number) => string;
  targetLabel: string;
  note?: string;
};

const GATE_ROWS: GateRow[] = [
  { key: 'margin', label: 'Blended contribution margin', formatValue: (v) => pct(v, 0), targetLabel: '≥35%' },
  {
    key: 'cac',
    label: 'Blended CAC',
    formatValue: (v) => eur0(v),
    targetLabel: '≤€50',
    note: '(fixed by Decision 001 flat-CAC — €44.01 regardless of settings)',
  },
  { key: 'ltvCac', label: 'LTV:CAC', formatValue: (v) => `${v.toFixed(1)}:1`, targetLabel: '≥2.5:1' },
  {
    key: 'd2cRepeat',
    label: 'D2C repeat-purchase rate',
    formatValue: (v) => pct(v, 0),
    targetLabel: '≥25%',
    note: '(placeholder — pre-launch, doesn\'t respond to sliders)',
  },
];

export function PhaseGateCard({ gates }: { gates: Phase2Gates }) {
  const passCount = GATE_ROWS.filter((row) => gates[row.key].pass).length;

  return (
    <Card
      title="Phase 2 gate check — projected at current settings"
      subtitle="Margin, CAC, and LTV:CAC are live projections from your current price/mix/budget. D2C repeat-purchase rate has no pre-launch data yet — shown as a placeholder estimate."
    >
      <div className={`rounded-lg px-4 py-2.5 text-sm font-medium ${gates.allPass ? 'bg-accent-soft text-accent' : 'bg-warning/10 text-warning'}`}>
        {gates.allPass
          ? 'All 4 gates pass at current settings — proceed to pilot'
          : `${passCount} of 4 gates pass — ${4 - passCount} blocker${4 - passCount === 1 ? '' : 's'} to resolve before Phase 2`}
      </div>

      <div className="mt-3 flex flex-col divide-y divide-border">
        {GATE_ROWS.map((row) => {
          const gate = gates[row.key];
          return (
            <div key={row.key} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="text-sm text-primary">{row.label}</p>
                {row.note && <p className="text-xs text-tertiary">{row.note}</p>}
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-sm tabular-nums text-secondary">
                  {row.formatValue(gate.value)} <span className="text-tertiary">/ {row.targetLabel}</span>
                </span>
                <span className={`text-base font-semibold ${gate.pass ? 'text-success' : 'text-warning'}`}>{gate.pass ? '✓' : '✗'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

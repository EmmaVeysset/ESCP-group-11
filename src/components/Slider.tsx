export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  valueLabel,
  accent,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  valueLabel: string;
  accent?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex items-center justify-between text-[#3c4a47]">
        <span>{label}</span>
        <span className="font-semibold tabular-nums" style={accent ? { color: accent } : undefined}>
          {valueLabel}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        className="w-full accent-[#2f6f5e]"
      />
    </label>
  );
}

import { TONE, paramStatus } from '../lib/status';
import { Sparkline } from './Sparkline';

interface MetricTileProps {
  label: string;
  hint: string;
  value: string;
  unit: string;
  subScore: number;
  flagged: boolean;
  trend: number[];
}

export function MetricTile({ label, hint, value, unit, subScore, flagged, trend }: MetricTileProps) {
  const status = paramStatus(subScore, flagged);
  const tone = TONE[status.tone];

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-900">{label}</p>
          <p className="text-xs text-zinc-400">{hint}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tone.pill}`}>
          {status.label}
        </span>
      </div>

      <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-zinc-900">
        {value}
        <span className="ml-1 text-base font-normal text-zinc-400">{unit}</span>
      </p>

      <div className="mt-3">
        <Sparkline values={trend} color={tone.stroke} />
      </div>
    </section>
  );
}

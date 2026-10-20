import { TONE, Tone, Scale, BandKind } from '../lib/status';
import { Panel, Pill } from './Panel';
import { Sparkline } from './Sparkline';

const BAND_COLOR: Record<BandKind, string> = {
  ideal: 'bg-[#3FCF8E]/55',
  fair: 'bg-[#3A414C]',
  poor: 'bg-[#F5A524]/55',
  unsafe: 'bg-[#F2555A]/55',
};

interface MetricTileProps {
  label: string;
  hint: string;
  value: number | null;
  digits: number;
  unit: string;
  status: { label: string; tone: Tone };
  // Quality parameters show their sub-score and threshold scale; temperature shows a note instead.
  subScore?: number | null;
  scale?: Scale;
  note?: string;
  trend: (number | null)[];
  trendSpan: number;
}

export function MetricTile({ label, hint, value, digits, unit, status, subScore, scale, note, trend, trendSpan }: MetricTileProps) {
  const pct = (v: number) => scale && ((Math.min(scale.max, Math.max(scale.min, v)) - scale.min) / (scale.max - scale.min)) * 100;

  return (
    <Panel className="flex flex-col gap-4 p-[22px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted">{hint}</p>
        </div>
        <Pill tone={status.tone}>{status.label}</Pill>
      </div>

      <div className="flex items-end justify-between gap-3">
        <p className="font-mono text-[38px] font-medium leading-none tracking-[-0.04em]">
          {value === null ? '—' : value.toFixed(digits)}
          <span className="ml-1 text-[15px] tracking-normal text-muted">{unit}</span>
        </p>
        {subScore !== undefined && (
          <p className="text-right text-xs text-muted">
            Sub-score
            <br />
            <span className="font-mono text-sm text-ink">{subScore ?? '—'}</span>
          </p>
        )}
      </div>

      <Sparkline values={trend} color={TONE[status.tone].stroke} minSpan={trendSpan} />

      {scale ? (
        <div>
          <div className="relative h-3">
            <div className="mt-[3px] flex h-1.5 gap-0.5">
              {scale.bands.map((b) => (
                <div
                  key={b.from}
                  className={`h-full rounded-sm ${BAND_COLOR[b.kind]}`}
                  style={{ width: `${((b.to - b.from) / (scale.max - scale.min)) * 100}%` }}
                />
              ))}
            </div>
            {value !== null && (
              <div
                className="absolute -top-[3px] h-[18px] w-[3px] -translate-x-1/2 rounded-sm bg-ink shadow-[0_0_0_2px_#12151A] transition-[left] duration-700"
                style={{ left: `${Math.min(99, Math.max(1, pct(value) ?? 0))}%` }}
              />
            )}
          </div>
          <div className="relative mt-1.5 h-4 font-mono text-[11px] text-muted">
            {scale.ticks.map((t) => (
              <span key={t} className="absolute -translate-x-1/2" style={{ left: `${pct(t)}%` }}>
                {t}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">{scale.summary}</p>
        </div>
      ) : (
        <p className="text-xs text-muted">{note}</p>
      )}
    </Panel>
  );
}

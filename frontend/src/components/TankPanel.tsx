import { HistoryPoint, ScoringConfig, TankReading } from '../api/tankApi';
import { LEVEL_COPY } from '../lib/status';
import { Eyebrow, Panel, Pill } from './Panel';

const TREND_WINDOW_MS = 30 * 60_000;

// Fill/drain rate from the level history over the last 30 minutes, in % per hour.
function levelRate(history: HistoryPoint[]): number | null {
  const points = history.filter((p) => p.level !== null);
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const first = points.find((p) => last.timestamp - p.timestamp <= TREND_WINDOW_MS) ?? points[0];
  const hours = (last.timestamp - first.timestamp) / 3_600_000;
  if (hours < 5 / 60) return null; // need at least 5 minutes of data
  return ((last.level as number) - (first.level as number)) / hours;
}

export function TankPanel({ reading, history, config }: { reading: TankReading; history: HistoryPoint[]; config: ScoringConfig }) {
  const copy = LEVEL_COPY[reading.levelStatus];
  const level = reading.level;
  const pct = level === null ? 0 : Math.round(Math.min(100, Math.max(0, level)));
  const rate = levelRate(history);
  const { normalMin, refillMin, lowMin } = config.level;

  let trend = 'Not enough data yet';
  if (rate !== null) {
    if (Math.abs(rate) < 1) trend = 'Steady';
    else trend = `${rate > 0 ? 'Filling' : 'Draining'} ${Math.abs(rate).toFixed(1)}% / h`;
  }

  const lines = [
    { at: normalMin, border: 'border-ink/30', text: 'text-muted' },
    { at: refillMin, border: 'border-[#F5A524]/50', text: 'text-[#F8C062]' },
    { at: lowMin, border: 'border-[#F2555A]/60', text: 'text-[#FF8A8E]' },
  ];

  return (
    <Panel className="flex flex-[1_1_300px] flex-col gap-5 p-6 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>Water level</Eyebrow>
        <Pill tone={copy.tone}>{copy.label}</Pill>
      </div>

      <div className="flex flex-1 items-end gap-6">
        <div className="relative pl-8">
          <div className="relative h-[232px] w-28 overflow-hidden rounded-2xl bg-well ring-2 ring-inset ring-edge">
            {level !== null && (
              <div className="absolute inset-x-0 bottom-0 bg-water/80 transition-[height] duration-700" style={{ height: `${pct}%` }}>
                <div className="absolute -top-1.5 left-0 h-3 w-[200%] overflow-hidden">
                  <svg className="animate-drift" width="100%" height="12" viewBox="0 0 224 12" preserveAspectRatio="none" aria-hidden>
                    <path d="M0 6 Q14 0 28 6 T56 6 T84 6 T112 6 T140 6 T168 6 T196 6 T224 6 V12 H0 Z" fill="#9BE0F7" fillOpacity={0.9} />
                  </svg>
                </div>
              </div>
            )}
            {lines.map((l) => (
              <div key={l.at} className={`absolute inset-x-0 border-t border-dashed ${l.border}`} style={{ bottom: `${l.at}%` }} />
            ))}
          </div>
          {lines.map((l) => (
            <span key={l.at} className={`absolute left-0 font-mono text-[11px] ${l.text}`} style={{ bottom: `calc(${l.at}% - 8px)` }}>
              {l.at}
            </span>
          ))}
        </div>

        <div className="flex min-w-0 flex-col gap-3.5 pb-1">
          <p className="font-mono text-[56px] font-medium leading-none tracking-[-0.04em]">
            {level === null ? '—' : pct}
            <span className="text-xl text-muted">%</span>
          </p>
          <div className="text-xs">
            <p className="text-muted">Last 30 min</p>
            <p className="font-mono text-ink">{trend}</p>
          </div>
          {reading.levelAlert && <p className="text-xs leading-relaxed text-sub">{reading.levelAlert}</p>}
        </div>
      </div>
    </Panel>
  );
}

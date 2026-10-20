import { ScoringConfig, TankReading } from '../api/tankApi';
import { TONE, ZONE_COPY } from '../lib/status';
import { Eyebrow, Panel } from './Panel';

const PART_COLORS = ['bg-water', 'bg-water-mid'];

export function StatusPanel({ reading, config }: { reading: TankReading; config: ScoringConfig }) {
  const copy = ZONE_COPY[reading.zone];
  const tone = TONE[copy.tone];
  const { zones, weights } = config;
  const scored = reading.composite !== null;

  const parts = [
    { label: 'Clarity', weight: weights.clarity, sub: reading.subScores.clarity },
    { label: 'TDS', weight: weights.tds, sub: reading.subScores.tds },
  ];
  const segments = [
    { from: 0, label: 'Clean now', width: zones.maintenanceMin, color: 'bg-[#F2555A]' },
    { from: zones.maintenanceMin, label: 'Attention', width: zones.goodMin - zones.maintenanceMin, color: 'bg-[#F5A524]' },
    { from: zones.goodMin, label: 'Good', width: 100 - zones.goodMin, color: 'bg-[#3FCF8E]' },
  ];

  return (
    <Panel className="flex flex-[999_1_560px] flex-col gap-7 p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2.5">
          <Eyebrow>Water quality</Eyebrow>
          <div className="flex items-center gap-3.5">
            <span className={`h-3.5 w-3.5 flex-none rounded-full ${tone.dot}`} style={{ boxShadow: `0 0 0 5px ${tone.stroke}22` }} />
            <h2 className="text-4xl font-semibold leading-tight tracking-[-0.03em] sm:text-[44px]">{copy.title}</h2>
          </div>
          <p className="text-[15px] text-sub">{copy.advice}</p>
          <ul className="mt-1 space-y-1.5">
            {reading.causes.slice(0, 2).map((c) => (
              <li key={c} className={`text-sm ${reading.zone === 'GOOD' ? 'text-muted' : tone.text}`}>
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div className="sm:text-right">
          <Eyebrow>Health score</Eyebrow>
          <p className="mt-0.5 font-mono text-[72px] font-medium leading-none tracking-[-0.05em] sm:text-[88px]">
            {scored ? reading.composite : '—'}
            <span className="text-[22px] tracking-normal text-muted">/100</span>
          </p>
          {reading.capReason && <p className="mt-1.5 max-w-[240px] text-xs text-[#FF8A8E]">{reading.capReason} (would be {reading.rawComposite})</p>}
        </div>
      </div>

      <div>
        <div className="relative h-2.5">
          <div className="mt-0.5 flex h-1.5 gap-[3px]">
            {segments.map((s) => (
              <div key={s.label} className={`rounded-full opacity-75 ${s.color}`} style={{ width: `${s.width}%` }} />
            ))}
          </div>
          {scored && (
            <div
              className="absolute -top-[5px] h-5 w-1 -translate-x-1/2 rounded-[3px] bg-ink shadow-[0_0_0_3px_#12151A] transition-[left] duration-700"
              style={{ left: `${Math.min(99, Math.max(1, reading.composite ?? 0))}%` }}
            />
          )}
        </div>
        <div className="mt-2.5 flex font-mono text-xs text-muted">
          {segments.map((s) => (
            <span key={s.label} className="truncate pr-2" style={{ width: `${s.width}%` }}>
              {s.from}
              <span className="hidden sm:inline"> · {s.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13px] font-medium">What makes up the score</p>
          <p className="text-xs text-muted">Temperature and level are tracked, not scored</p>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-line">
          {parts.map((p, i) => (
            <div
              key={p.label}
              className={`h-full transition-[width] duration-700 ${PART_COLORS[i]} ${i === 0 ? 'shadow-[inset_-2px_0_0_#12151A]' : ''}`}
              style={{ width: `${(p.sub ?? 0) * p.weight}%` }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {parts.map((p, i) => (
            <div key={p.label} className="flex min-w-0 items-start gap-2">
              <span className={`mt-[5px] h-2 w-2 flex-none rounded-sm ${PART_COLORS[i]}`} />
              <div className="min-w-0">
                <p className="text-xs text-muted">
                  {p.label} · {Math.round(p.weight * 100)}%
                </p>
                <p className="font-mono text-[13px]">
                  {p.sub ?? '—'} × {p.weight.toFixed(2)} ={' '}
                  <span className="font-semibold text-ink">{p.sub === null ? '—' : (p.sub * p.weight).toFixed(1)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

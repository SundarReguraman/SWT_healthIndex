import { useState, MouseEvent } from 'react';
import { HistoryPoint, ScoringConfig } from '../api/tankApi';
import { ZONE_COPY, clockTime } from '../lib/status';
import { Panel } from './Panel';

export const RANGES = [
  { minutes: 15, label: '15M' },
  { minutes: 60, label: '1H' },
  { minutes: 1440, label: '24H' },
];

const W = 600;
const H = 200;

interface HistoryChartProps {
  history: HistoryPoint[];
  minutes: number;
  onMinutes: (m: number) => void;
  end: number;
  expectedIntervalMs: number;
  zones: ScoringConfig['zones'];
}

export function HistoryChart({ history, minutes, onMinutes, end, expectedIntervalMs, zones }: HistoryChartProps) {
  const [hover, setHover] = useState<HistoryPoint | null>(null);
  const start = end - minutes * 60_000;
  const x = (t: number) => ((t - start) / (end - start)) * W;
  const y = (v: number) => H - (v / 100) * H;
  const yGood = y(zones.goodMin);
  const yMaint = y(zones.maintenanceMin);

  // Break the line on sensor faults and on gaps where the device stopped posting.
  const maxGap = Math.max(3 * expectedIntervalMs, ((minutes * 60_000) / 120) * 2.5);
  const scored = history.filter((p) => p.composite !== null && p.timestamp >= start);
  const segments: HistoryPoint[][] = [];
  history.forEach((p, i) => {
    const prev = history[i - 1];
    if (p.composite === null || p.timestamp < start) return;
    const breakHere = !prev || prev.composite === null || p.timestamp - prev.timestamp > maxGap;
    if (breakHere || !segments.length) segments.push([]);
    segments[segments.length - 1].push(p);
  });
  const toPoints = (s: HistoryPoint[]) => s.map((p) => `${x(p.timestamp).toFixed(1)},${y(p.composite as number).toFixed(1)}`).join(' ');

  function onMove(e: MouseEvent<SVGSVGElement>) {
    if (!scored.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = start + ((e.clientX - rect.left) / rect.width) * (end - start);
    let best = scored[0];
    for (const p of scored) if (Math.abs(p.timestamp - t) < Math.abs(best.timestamp - t)) best = p;
    setHover(best);
  }

  const labels = [0, 0.25, 0.5, 0.75, 1].map((f) => (f === 1 ? 'now' : clockTime(start + f * (end - start))));

  return (
    <Panel className="flex flex-[999_1_560px] flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Health score history</p>
          <p className="text-xs text-muted">
            {hover
              ? `${clockTime(hover.timestamp)} · score ${hover.composite} · ${ZONE_COPY[hover.zone].title}`
              : `${scored.length} point${scored.length === 1 ? '' : 's'} · shaded by zone`}
          </p>
        </div>
        <div className="inline-flex rounded-[10px] bg-well p-[3px] ring-1 ring-inset ring-line" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.minutes}
              type="button"
              aria-pressed={r.minutes === minutes}
              onClick={() => onMinutes(r.minutes)}
              className={`h-8 min-w-[52px] rounded-lg font-mono text-xs transition-colors ${
                r.minutes === minutes ? 'bg-line text-ink' : 'text-muted hover:text-sub'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative pr-8">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="block h-[220px] w-full"
          role="img"
          aria-label={`Health score over the last ${RANGES.find((r) => r.minutes === minutes)?.label ?? ''}`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <rect x={0} y={0} width={W} height={yGood} fill="#3FCF8E" fillOpacity={0.06} />
          <rect x={0} y={yGood} width={W} height={yMaint - yGood} fill="#F5A524" fillOpacity={0.06} />
          <rect x={0} y={yMaint} width={W} height={H - yMaint} fill="#F2555A" fillOpacity={0.06} />
          <line x1={0} y1={yGood} x2={W} y2={yGood} stroke="#3FCF8E" strokeOpacity={0.35} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          <line x1={0} y1={yMaint} x2={W} y2={yMaint} stroke="#F5A524" strokeOpacity={0.35} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          {segments.map((s, i) =>
            s.length > 1 ? (
              <g key={i}>
                <polygon
                  points={`${toPoints(s)} ${x(s[s.length - 1].timestamp).toFixed(1)},${H} ${x(s[0].timestamp).toFixed(1)},${H}`}
                  fill="#5CC8F0"
                  fillOpacity={0.08}
                />
                <polyline points={toPoints(s)} fill="none" stroke="#5CC8F0" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </g>
            ) : (
              <line
                key={i}
                x1={x(s[0].timestamp)}
                x2={x(s[0].timestamp)}
                y1={y(s[0].composite as number)}
                y2={y(s[0].composite as number)}
                stroke="#5CC8F0"
                strokeWidth={6}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ),
          )}
          {hover && (
            <line x1={x(hover.timestamp)} x2={x(hover.timestamp)} y1={0} y2={H} stroke="#E6E8EB" strokeOpacity={0.35} vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        <div className="pointer-events-none absolute inset-y-0 right-0 font-mono text-[11px] text-muted">
          {[100, zones.goodMin, zones.maintenanceMin, 0].map((v) => (
            <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${((100 - v) / 100) * 220}px` }}>
              {v}
            </span>
          ))}
        </div>
        {!scored.length && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">No scored readings in this range yet</p>
        )}
      </div>

      <div className="flex justify-between pr-8 font-mono text-[11px] text-muted">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </Panel>
  );
}

import { TankReading } from '../api/tankApi';
import { TONE, ZONE_COPY, reasons } from '../lib/status';

const SEGMENTS = [
  { label: 'Clean now', width: 45, color: 'bg-red-400' },
  { label: 'Attention', width: 30, color: 'bg-amber-400' },
  { label: 'Good', width: 25, color: 'bg-emerald-400' },
];

export function StatusCard({ reading }: { reading: TankReading }) {
  const copy = ZONE_COPY[reading.zone ?? 'GOOD'];
  const tone = TONE[copy.tone];
  const why = reasons(reading);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
      <p className="text-sm text-zinc-500">Water quality</p>

      <div className="mt-2 flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${tone.dot}`} />
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">{copy.title}</h2>
      </div>
      <p className="mt-2 text-zinc-600">{copy.advice}</p>

      {why.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {why.map((w) => (
            <li key={w} className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${tone.pill}`}>
              {w}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-zinc-500">Health score</span>
          <span className="text-sm text-zinc-500">
            <span className="text-2xl font-semibold tabular-nums text-zinc-900">{reading.composite}</span> / 100
          </span>
        </div>
        <div className="relative mt-3">
          <div className="flex h-2 gap-1 overflow-hidden">
            {SEGMENTS.map((s) => (
              <div key={s.label} className={`${s.color} rounded-full opacity-80`} style={{ width: `${s.width}%` }} />
            ))}
          </div>
          <div
            className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-[3px] border-white bg-zinc-900 shadow transition-[left] duration-700"
            style={{ left: `${Math.min(98, Math.max(2, reading.composite))}%` }}
          />
        </div>
        <div className="mt-2 flex text-xs text-zinc-400">
          {SEGMENTS.map((s) => (
            <span key={s.label} style={{ width: `${s.width}%` }} className="last:text-right">
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

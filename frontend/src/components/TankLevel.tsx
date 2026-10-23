import { LevelStatus } from '../api/tankApi';
import { LEVEL_COPY, TONE } from '../lib/status';

export function TankLevel({ level, status }: { level: number; status?: LevelStatus }) {
  const copy = LEVEL_COPY[status ?? 'NORMAL'];
  const pct = Math.round(Math.min(100, Math.max(0, level)));

  return (
    <section className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
      <p className="text-sm text-zinc-500">Water level</p>

      <div className="mt-4 flex flex-1 items-end gap-6">
        <div className="relative h-40 w-24 overflow-hidden rounded-xl border-2 border-zinc-200 bg-zinc-50">
          <div
            className="absolute inset-x-0 bottom-0 bg-sky-400/80 transition-[height] duration-700"
            style={{ height: `${pct}%` }}
          >
            <div className="h-1 w-full bg-sky-300" />
          </div>
        </div>

        <div className="pb-1">
          <p className="text-4xl font-semibold tabular-nums tracking-tight text-zinc-900">
            {pct}
            <span className="text-xl text-zinc-400">%</span>
          </p>
          <p className="text-sm text-zinc-500">full</p>
          <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${TONE[copy.tone].pill}`}>
            {copy.label}
          </span>
        </div>
      </div>
    </section>
  );
}

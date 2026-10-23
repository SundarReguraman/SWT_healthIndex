import { TankReading } from '../api/tankApi';

export function ScoreDetails({ reading }: { reading: TankReading }) {
  const capped = reading.rawComposite !== undefined && reading.rawComposite !== reading.composite;

  return (
    <details className="group rounded-2xl border border-zinc-200 bg-white px-6 py-4 text-sm text-zinc-600">
      <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-zinc-900">
        How the score works
        <span className="text-zinc-400 transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="mt-3 space-y-2 leading-relaxed">
        <p>
          The score blends clarity (45%), dissolved salts (35%) and temperature (20%), based on BIS IS 10500 and WHO
          drinking-water guidance. Water level is tracked separately and does not affect the score.
        </p>
        <p>Any single unsafe reading holds the score in the red, so one bad value can't be averaged away.</p>
        {capped && (
          <p className="text-zinc-900">
            Right now the score is held at {reading.composite} (it would otherwise be {reading.rawComposite}) because of
            an unsafe reading.
          </p>
        )}
      </div>
    </details>
  );
}

interface SensorCardProps {
  label: string;
  value: number;
  unit: string;
  subScore: number;
  flagged?: boolean;
}

export function SensorCard({ label, value, unit, subScore, flagged }: SensorCardProps) {
  const isGood = subScore >= 75 && !flagged;
  const isPoor = subScore < 50 || flagged;
  const isAcceptable = !isGood && !isPoor;

  const borderColor = flagged
    ? 'border-red-500/70'
    : isPoor
    ? 'border-amber-500/70'
    : isGood
    ? 'border-emerald-500/50'
    : 'border-neutral-700';

  const subScoreColor = flagged
    ? 'text-red-400'
    : isPoor
    ? 'text-amber-400'
    : isGood
    ? 'text-emerald-400'
    : 'text-neutral-400';

  const subScoreBarColor = flagged
    ? 'bg-red-500'
    : isPoor
    ? 'bg-amber-500'
    : isGood
    ? 'bg-emerald-500'
    : 'bg-neutral-500';

  const badgeLabel = flagged ? 'UNSAFE' : isPoor ? 'POOR' : isAcceptable ? 'OK' : null;

  return (
    <div
      className={`rounded-xl p-4 text-center border transition-colors space-y-2 ${borderColor}`}
    >
      <p className="text-xs text-neutral-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-semibold leading-none">
        {value.toFixed(1)}
        <span className="text-sm font-normal text-neutral-400">{unit}</span>
      </p>

      {/* Sub-score progress bar */}
      <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${subScoreBarColor}`}
          style={{ width: `${subScore}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px]">
        <span className={`font-mono ${subScoreColor}`}>
          {subScore}<span className="text-neutral-600">/100</span>
        </span>
        {badgeLabel && (
          <span className={`font-semibold ${subScoreColor}`}>{badgeLabel}</span>
        )}
      </div>
    </div>
  );
}

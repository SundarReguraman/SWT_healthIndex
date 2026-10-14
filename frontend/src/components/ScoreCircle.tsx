import { HealthZone } from '../api/tankApi';

interface ScoreCircleProps {
  score: number;
  rawScore?: number;
  zone?: HealthZone;
  zoneLabel?: string;
  flagged: boolean;
  capReason?: string | null;
}

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreCircle({ score, rawScore, zone, zoneLabel, flagged, capReason }: ScoreCircleProps) {
  const offset = CIRCUMFERENCE * (1 - score / 100);
  const resolvedZone: HealthZone =
    zone || (flagged || score < 45 ? 'IMMEDIATE_CLEANING' : score < 75 ? 'SCHEDULE_MAINTENANCE' : 'GOOD');

  const palette = {
    GOOD: { stroke: '#22c55e', badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
    SCHEDULE_MAINTENANCE: { stroke: '#f59e0b', badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
    IMMEDIATE_CLEANING: { stroke: '#ef4444', badgeBg: 'bg-red-500/15 text-red-300 border-red-500/40' },
  }[resolvedZone];

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={160} height={160} viewBox="0 0 160 160">
        <circle cx={80} cy={80} r={RADIUS} fill="none" stroke="#1e293b" strokeWidth={12} />
        <circle
          cx={80}
          cy={80}
          r={RADIUS}
          fill="none"
          stroke={palette.stroke}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 80 80)"
        />
        <text x={80} y={84} textAnchor="middle" fontSize={34} fontWeight={700} fill="white">
          {score}
        </text>
        <text x={80} y={104} textAnchor="middle" fontSize={10} fill="#94a3b8">
          / 100 INDEX
        </text>
      </svg>
      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${palette.badgeBg}`}>
        {zoneLabel || (resolvedZone === 'GOOD' ? 'Good' : resolvedZone === 'SCHEDULE_MAINTENANCE' ? 'Schedule Maintenance' : 'Needs Immediate Cleaning')}
      </span>
      {capReason && rawScore !== undefined && rawScore !== score && (
        <span className="text-[11px] text-amber-300/90 text-center max-w-xs">
          Raw weighted score ({rawScore}) capped at {score}: {capReason}
        </span>
      )}
    </div>
  );
}

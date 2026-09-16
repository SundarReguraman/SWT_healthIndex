interface ScoreCircleProps {
  score: number;
  flagged: boolean;
}

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreCircle({ score, flagged }: ScoreCircleProps) {
  const offset = CIRCUMFERENCE * (1 - score / 100);
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={160} height={160} viewBox="0 0 160 160">
        <circle cx={80} cy={80} r={RADIUS} fill="none" stroke="#333" strokeWidth={10} />
        <circle
          cx={80}
          cy={80}
          r={RADIUS}
          fill="none"
          stroke={flagged ? '#ef4444' : '#22c55e'}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 80 80)"
        />
        <text x={80} y={88} textAnchor="middle" fontSize={32} fontWeight={500} fill="white">
          {score}
        </text>
      </svg>
      <span className="text-sm text-neutral-400">
        {flagged ? 'Unsafe — check flagged parameters' : 'Tank health index'}
      </span>
    </div>
  );
}

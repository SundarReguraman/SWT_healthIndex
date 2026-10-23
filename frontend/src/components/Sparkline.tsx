interface SparklineProps {
  values: (number | null)[];
  color: string;
  // Smallest vertical range drawn, so sensor noise doesn't fill the whole chart.
  minSpan: number;
}

export function Sparkline({ values, color, minSpan }: SparklineProps) {
  const present = values.filter((v): v is number => v !== null);
  if (present.length < 2) return <div className="h-10" />;

  const min = Math.min(...present);
  const max = Math.max(...present);
  const span = Math.max(max - min, minSpan);
  const lo = (min + max) / 2 - span / 2;

  // A missing reading breaks the line instead of drawing through it.
  const segments: string[][] = [[]];
  values.forEach((v, i) => {
    if (v === null) {
      if (segments[segments.length - 1].length) segments.push([]);
      return;
    }
    const x = (i / (values.length - 1)) * 100;
    const y = 30 - ((v - lo) / span) * 28;
    segments[segments.length - 1].push(`${x.toFixed(2)},${y.toFixed(2)}`);
  });

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="block h-10 w-full" aria-hidden>
      {segments
        .filter((s) => s.length > 1)
        .map((s, i) => (
          <polyline
            key={i}
            points={s.join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={1.6}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
    </svg>
  );
}

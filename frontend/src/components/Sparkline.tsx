interface SparklineProps {
  values: number[];
  color: string;
  // Smallest vertical range drawn, so sensor noise doesn't fill the whole chart.
  minSpan: number;
}

export function Sparkline({ values, color, minSpan }: SparklineProps) {
  if (values.length < 2) return <div className="h-8" />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, minSpan);
  const lo = (min + max) / 2 - span / 2;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 28 - ((v - lo) / span) * 24;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

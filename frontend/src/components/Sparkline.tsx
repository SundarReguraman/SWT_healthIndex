interface SparklineProps {
  values: number[];
  color: string;
}

export function Sparkline({ values, color }: SparklineProps) {
  if (values.length < 2) return <div className="h-8" />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 28 - ((v - min) / span) * 24;
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

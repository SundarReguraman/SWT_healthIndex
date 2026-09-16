interface SensorCardProps {
  label: string;
  value: number;
  unit: string;
  subScore: number;
  flagged?: boolean;
}

export function SensorCard({ label, value, unit, subScore, flagged }: SensorCardProps) {
  const good = subScore >= 70 && !flagged;
  return (
    <div
      className={`rounded-xl p-4 text-center border transition-colors ${
        flagged ? 'border-red-500' : good ? 'border-green-500' : 'border-neutral-700'
      }`}
    >
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="text-2xl font-semibold">
        {value.toFixed(1)}
        {unit}
      </p>
      {flagged && <p className="text-xs text-red-400 mt-1">Unsafe</p>}
    </div>
  );
}

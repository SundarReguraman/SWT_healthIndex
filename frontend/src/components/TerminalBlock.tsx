import { useEffect, useState } from 'react';
import { TankReading } from '../api/tankApi';

function buildScript(reading: TankReading) {
  return [
    '> reading_sensors()',
    `clarity     = ${(reading.clarity ?? 0).toFixed(1)}  pct`,
    `tds         = ${reading.tds.toFixed(0)}   ppm`,
    `temperature = ${reading.temperature.toFixed(1)}  degC`,
    `level       = ${reading.level.toFixed(0)}    pct`,
    '',
    '> compute_health_index(clarity, tds, temperature, level)',
    '  checking hard-flag thresholds...',
    '  normalizing inputs...',
    '  applying weights...',
    '',
    `score = ${reading.composite}`,
  ].join('\n');
}

export function TerminalBlock({ reading }: { reading: TankReading }) {
  const [visibleChars, setVisibleChars] = useState(0);
  const fullText = buildScript(reading);

  useEffect(() => {
    setVisibleChars(0);
    const interval = setInterval(() => {
      setVisibleChars((c) => (c < fullText.length ? c + 2 : c));
    }, 20);
    return () => clearInterval(interval);
  }, [fullText]);

  return (
    <div className="bg-[#0d1117] rounded-xl p-4 min-h-[180px]">
      <div className="flex gap-1.5 mb-2">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
      </div>
      <pre className="font-mono text-sm text-neutral-300 whitespace-pre-wrap">
        {fullText.slice(0, visibleChars)}
        {visibleChars < fullText.length && '▍'}
      </pre>
    </div>
  );
}

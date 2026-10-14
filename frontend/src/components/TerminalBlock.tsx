import { useEffect, useState } from 'react';
import { TankReading } from '../api/tankApi';

function buildScript(reading: TankReading) {
  const lines: string[] = [];

  lines.push('> reading_sensors()');
  lines.push(`  clarity     = ${(reading.clarity ?? 0).toFixed(1)} %`);
  lines.push(`  tds         = ${reading.tds.toFixed(0)} ppm`);
  lines.push(`  temperature = ${reading.temperature.toFixed(1)} °C`);
  lines.push(`  level       = ${reading.level.toFixed(0)} %`);
  lines.push('');

  lines.push('> compute_health_index()');
  lines.push(`  sub_scores  : clarity=${reading.subScores.clarity}  tds=${reading.subScores.tds}  temp=${reading.subScores.temperature}  level=${reading.subScores.level}`);

  if (reading.flaggedParams && reading.flaggedParams.length > 0) {
    lines.push(`  hard_flags  : [${reading.flaggedParams.join(', ')}]`);
  } else {
    lines.push('  hard_flags  : none');
  }

  if (reading.rawComposite !== undefined && reading.rawComposite !== reading.composite) {
    lines.push(`  raw_score   : ${reading.rawComposite} → capped → ${reading.composite}`);
    if (reading.capReason) {
      lines.push(`  cap_reason  : ${reading.capReason}`);
    }
  } else {
    lines.push(`  composite   : ${reading.composite}`);
  }

  lines.push('');
  lines.push(`> zone = "${reading.zone ?? 'GOOD'}"  (${reading.zoneLabel ?? 'Good'})`);

  if (reading.levelStatus && reading.levelStatus !== 'NORMAL') {
    lines.push(`> level_alert : ${reading.levelAlert ?? reading.levelStatus}`);
  }

  return lines.join('\n');
}

export function TerminalBlock({ reading }: { reading: TankReading }) {
  const [visibleChars, setVisibleChars] = useState(0);
  const fullText = buildScript(reading);

  useEffect(() => {
    setVisibleChars(0);
    const interval = setInterval(() => {
      setVisibleChars((c) => (c < fullText.length ? c + 3 : c));
    }, 16);
    return () => clearInterval(interval);
  }, [fullText]);

  return (
    <div className="bg-[#0d1117] rounded-xl p-4 min-h-[200px] border border-neutral-800">
      <div className="flex gap-1.5 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
        <span className="ml-2 text-[10px] text-neutral-600 font-mono">tank-health-index ~ scoring engine</span>
      </div>
      <pre className="font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
        {fullText.slice(0, visibleChars)}
        {visibleChars < fullText.length && '▍'}
      </pre>
    </div>
  );
}

import { useState } from 'react';
import { useLiveScore } from '../hooks/useLiveScore';
import { SensorCard } from '../components/SensorCard';
import { TerminalBlock } from '../components/TerminalBlock';
import { ScoreCircle } from '../components/ScoreCircle';

export function Dashboard() {
  const reading = useLiveScore();
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  if (!reading) {
    return <div className="p-8 text-center text-neutral-400">Waiting for first reading...</div>;
  }

  const handleGenerateReport = () => {
    setReportStatus('Preparing Water Quality Audit Report...');
    setTimeout(() => {
      setReportStatus(`Report generated: ${reading.deviceId.toUpperCase()}_Health_Report.pdf (Score: ${reading.composite}/100)`);
      setTimeout(() => setReportStatus(null), 4000);
    }, 1200);
  };

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-semibold text-center">Tank Health Index</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SensorCard
          label="Clarity"
          value={reading.clarity ?? 0}
          unit="%"
          subScore={reading.subScores.clarity}
          flagged={reading.flaggedParams.includes('clarity')}
        />
        <SensorCard
          label="TDS"
          value={reading.tds}
          unit=" ppm"
          subScore={reading.subScores.tds}
          flagged={reading.flaggedParams.includes('tds')}
        />
        <SensorCard label="Temperature" value={reading.temperature} unit="°C" subScore={reading.subScores.temperature} />
        <SensorCard label="Level" value={reading.level} unit="%" subScore={reading.subScores.level} />
      </div>

      <TerminalBlock reading={reading} />

      <ScoreCircle score={reading.composite} flagged={reading.flagged} />

      <div className="text-center space-y-3">
        <button
          onClick={handleGenerateReport}
          className="px-6 py-2 rounded-full bg-white text-black font-medium hover:bg-neutral-200 active:scale-95 transition shadow-lg cursor-pointer"
        >
          {reportStatus ? 'Generating...' : 'Generate PDF report'}
        </button>
        {reportStatus && (
          <div className="text-xs font-mono text-emerald-400 bg-neutral-900 border border-neutral-800 py-1.5 px-4 rounded-full inline-block animate-pulse">
            ✓ {reportStatus}
          </div>
        )}
      </div>
    </div>
  );
}

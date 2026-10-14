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

  const zoneColors = {
    GOOD: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400',
    SCHEDULE_MAINTENANCE: 'border-amber-500/30 bg-amber-950/20 text-amber-400',
    IMMEDIATE_CLEANING: 'border-red-500/30 bg-red-950/20 text-red-400',
  }[reading.zone || 'GOOD'];
  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-semibold">Tank Health Index</h1>
        <p className="text-xs text-neutral-400 font-mono">Device: {reading.deviceId} | Polling live telemetry</p>
      </div>

      {reading.zoneLabel && (
        <div className={`p-4 rounded-xl border text-center space-y-1 ${zoneColors}`}>
          <p className="text-sm font-semibold uppercase tracking-wider">{reading.zoneLabel}</p>
          <p className="text-xs text-neutral-300">{reading.message}</p>
        </div>
      )}

      {reading.levelAlert && (
        <div className="p-3 rounded-lg border border-blue-500/40 bg-blue-950/30 text-blue-300 text-xs text-center flex items-center justify-center gap-2">
          <span>💧</span>
          <span>{reading.levelAlert}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SensorCard
          label="Clarity"
          value={reading.clarity ?? 0}
          unit="%"
          subScore={reading.subScores.clarity}
          flagged={reading.flaggedParams.includes('clarity') || reading.flaggedParams.includes('turbidity')}
        />
        <SensorCard
          label="TDS"
          value={reading.tds}
          unit=" ppm"
          subScore={reading.subScores.tds}
          flagged={reading.flaggedParams.includes('tds')}
        />
        <SensorCard
          label="Temperature"
          value={reading.temperature}
          unit="°C"
          subScore={reading.subScores.temperature}
          flagged={reading.flaggedParams.includes('temperature')}
        />
        <SensorCard
          label="Level"
          value={reading.level}
          unit="%"
          subScore={reading.subScores.level}
        />
      </div>

      <TerminalBlock reading={reading} />

      <ScoreCircle
        score={reading.composite}
        rawScore={reading.rawComposite}
        zone={reading.zone}
        zoneLabel={reading.zoneLabel}
        flagged={reading.flagged}
        capReason={reading.capReason}
      />

      <div className="text-center space-y-3">
        <button
          onClick={handleGenerateReport}
          className="px-6 py-2 rounded-full bg-white text-black font-medium hover:bg-neutral-200 active:scale-95 transition shadow-lg cursor-pointer"
        >
          {reportStatus ? 'Generating...' : 'Generate PDF report'}
        </button>
        {reportStatus && (
          <div className="text-xs font-mono text-emerald-400 bg-neutral-900 border border-neutral-800 py-1.5 px-4 rounded-full inline-block animate-pulse">
            {reportStatus}
          </div>
        )}
      </div>
    </div>
  );
}

import { useLiveScore } from '../hooks/useLiveScore';
import { SensorCard } from '../components/SensorCard';
import { TerminalBlock } from '../components/TerminalBlock';
import { ScoreCircle } from '../components/ScoreCircle';

export function Dashboard() {
  const reading = useLiveScore();

  if (!reading) {
    return <div className="p-8 text-center text-neutral-400">Waiting for first reading...</div>;
  }

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

      <div className="text-center">
        <button className="px-6 py-2 rounded-full bg-white text-black font-medium hover:bg-neutral-200 transition">
          Generate PDF report
        </button>
      </div>
    </div>
  );
}

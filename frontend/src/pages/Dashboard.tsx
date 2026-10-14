import { useEffect, useState } from 'react';
import { useLiveScore } from '../hooks/useLiveScore';
import { StatusCard } from '../components/StatusCard';
import { TankLevel } from '../components/TankLevel';
import { MetricTile } from '../components/MetricTile';
import { ScoreDetails } from '../components/ScoreDetails';

// A reading older than this means the sensor has stopped posting (demo data arrives once a minute).
const STALE_MS = 3 * 60_000;

function timeAgo(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function Dashboard() {
  const { reading, history, reachable } = useLiveScore();
  const now = useNow();

  const live = reachable && reading !== null && now - reading.timestamp < STALE_MS;
  const demo = reading?.source === 'demo';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Tank Health</h1>
          <p className="text-sm text-zinc-500">{reading?.deviceId ?? 'tank-1'}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600">
          <span className="relative flex h-2 w-2">
            {live && !demo && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${!live ? 'bg-zinc-400' : demo ? 'bg-sky-500' : 'bg-emerald-500'}`} />
          </span>
          {!reachable
            ? 'Server unreachable'
            : reading
              ? `${!live ? 'Sensor offline' : demo ? 'Demo data' : 'Live'} · updated ${timeAgo(now - reading.timestamp)}`
              : 'Waiting for sensor'}
        </div>
      </header>

      {!reading ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-20 text-center">
          <p className="font-medium text-zinc-900">Waiting for the first reading</p>
          <p className="mt-1 text-sm text-zinc-500">Make sure the sensor is powered on and connected to Wi-Fi.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <StatusCard reading={reading} />
            </div>
            <TankLevel level={reading.level} status={reading.levelStatus} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <MetricTile
              label="Clarity"
              hint="How clear the water looks"
              value={(reading.clarity ?? 0).toFixed(0)}
              unit="%"
              subScore={reading.subScores.clarity}
              flagged={reading.flaggedParams.includes('clarity') || reading.flaggedParams.includes('turbidity')}
              trend={history.map((h) => h.clarity ?? 0)}
              trendSpan={10}
            />
            <MetricTile
              label="Dissolved salts"
              hint="Minerals in the water (TDS)"
              value={reading.tds.toFixed(0)}
              unit="ppm"
              subScore={reading.subScores.tds}
              flagged={reading.flaggedParams.includes('tds')}
              trend={history.map((h) => h.tds)}
              trendSpan={60}
            />
            <MetricTile
              label="Temperature"
              hint="Warm water grows bacteria"
              value={reading.temperature.toFixed(1)}
              unit="°C"
              subScore={reading.subScores.temperature}
              flagged={reading.flaggedParams.includes('temperature')}
              trend={history.map((h) => h.temperature)}
              trendSpan={4}
            />
          </div>

          <ScoreDetails reading={reading} />
        </div>
      )}
    </div>
  );
}

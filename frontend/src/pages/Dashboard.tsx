import { useState } from 'react';
import { useDashboard, useNow } from '../hooks/useDashboard';
import { clarityScale, paramStatus, tdsScale, timeAgo, clockTime } from '../lib/status';
import { StatusPanel } from '../components/StatusPanel';
import { TankPanel } from '../components/TankPanel';
import { MetricTile } from '../components/MetricTile';
import { HistoryChart } from '../components/HistoryChart';
import { EventsPanel } from '../components/EventsPanel';

const TREND_POINTS = 30;

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-full bg-panel px-3 text-xs text-sub ring-1 ring-inset ring-line">{children}</span>
  );
}

function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && <span className={`absolute inset-0 animate-ping rounded-full opacity-60 ${color}`} />}
      <span className={`relative h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-panel px-5 py-3.5 text-sm text-sub ring-1 ring-inset ring-line">{children}</div>;
}

export function Dashboard() {
  const [minutes, setMinutes] = useState(15);
  const { snapshot, fetchedAt, reachable } = useDashboard(minutes);
  const now = useNow();

  const status = snapshot?.status;
  const reading = snapshot?.latest ?? null;
  const ageMs = status?.ageMs != null ? status.ageMs + (now - fetchedAt) : null;
  const staleAfter = status?.expectedIntervalMs ? 3 * status.expectedIntervalMs + 5_000 : Infinity;
  const fresh = reachable && ageMs !== null && ageMs < staleAfter;
  const isDemo = status?.source === 'demo';
  const offline = !!reading && status?.source === 'live' && !fresh;

  let headline = 'Connecting to server…';
  let dot = 'bg-muted';
  if (!reachable) headline = 'Server unreachable';
  else if (snapshot && !reading) headline = 'Waiting for the first reading';
  else if (reading && ageMs !== null) {
    if (isDemo) {
      headline = `Demo data · updated ${timeAgo(ageMs)}`;
      dot = 'bg-water';
    } else if (fresh) {
      headline = `Live · ${reading.via.toUpperCase()} · updated ${timeAgo(ageMs)}`;
      dot = 'bg-[#3FCF8E]';
    } else {
      headline = `Sensor offline · last reading ${timeAgo(ageMs)}`;
      dot = 'bg-[#F2555A]';
    }
  }

  const trend = (key: 'clarity' | 'tds' | 'temperature') => (snapshot?.history ?? []).slice(-TREND_POINTS).map((p) => p[key]);

  return (
    <div className="min-h-screen px-4 pb-12 pt-7 sm:px-6">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-panel ring-1 ring-inset ring-line">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5CC8F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 2.7c3.6 4.2 6 7.6 6 10.8a6 6 0 0 1-12 0c0-3.2 2.4-6.6 6-10.8z" />
                <path d="M9 14.5a3 3 0 0 0 3 3" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">Tank Health</h1>
              <p className="text-xs text-muted">{reading?.deviceId ?? 'tank-1'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip>
              <Dot color={dot} pulse={fresh && !isDemo} />
              {headline}
            </Chip>
            {reading?.seq != null && !isDemo && (
              <Chip>
                <span className="font-mono">Reading #{reading.seq}</span>
              </Chip>
            )}
            {status?.usb.enabled && (
              <Chip>
                <Dot color={status.usb.connected ? 'bg-[#3FCF8E]' : 'bg-[#F5A524]'} />
                <span className="font-mono">{status.usb.connected ? `USB ${status.usb.path}` : 'USB · waiting for board'}</span>
              </Chip>
            )}
          </div>
        </header>

        {isDemo && (
          <Banner>
            <span className="font-medium text-water">Demo data.</span> No device has posted in the last 2 minutes, so the dashboard is showing
            simulated readings. Real readings replace them automatically.
          </Banner>
        )}
        {offline && reading && (
          <Banner>
            <span className="font-medium text-[#FF8A8E]">Sensor offline.</span> The last reading arrived at {clockTime(reading.timestamp)}. Values below
            are from that reading — check the USB cable or Wi-Fi.
          </Banner>
        )}

        {!snapshot || !reading ? (
          <div className="rounded-[20px] border border-dashed border-edge px-6 py-24 text-center">
            <p className="font-medium">{reachable ? 'Waiting for the first reading' : 'Can’t reach the backend'}</p>
            <p className="mt-1 text-sm text-muted">
              {reachable
                ? 'Plug in the ESP32 and start the backend with npm run usb, or run npm run simulate.'
                : 'Start it with npm start in the backend folder.'}
            </p>
          </div>
        ) : (
          <div className={`flex flex-col gap-4 transition-opacity ${offline ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap gap-4">
              <StatusPanel reading={reading} config={snapshot.config} />
              <TankPanel reading={reading} history={snapshot.history} config={snapshot.config} />
            </div>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
              <MetricTile
                label="Clarity"
                hint="How clear the water looks"
                value={reading.clarity}
                digits={1}
                unit="%"
                subScore={reading.subScores.clarity}
                status={paramStatus(reading.subScores.clarity, reading.flaggedParams.includes('clarity'))}
                scale={clarityScale(snapshot.config.clarity)}
                trend={trend('clarity')}
                trendSpan={10}
              />
              <MetricTile
                label="Dissolved salts"
                hint="Minerals in the water (TDS)"
                value={reading.tds}
                digits={0}
                unit="ppm"
                subScore={reading.subScores.tds}
                status={paramStatus(reading.subScores.tds, reading.flaggedParams.includes('tds'))}
                scale={tdsScale(snapshot.config.tds)}
                trend={trend('tds')}
                trendSpan={60}
              />
              <MetricTile
                label="Temperature"
                hint="Water temperature in the tank"
                value={reading.temperature}
                digits={1}
                unit="°C"
                status={reading.temperature === null ? { label: 'No reading', tone: 'neutral' } : { label: 'Not scored', tone: 'neutral' }}
                note="Not part of the health score. The ESP32 uses it to correct the TDS reading."
                trend={trend('temperature')}
                trendSpan={4}
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <HistoryChart
                history={snapshot.history}
                minutes={minutes}
                onMinutes={setMinutes}
                end={reading.timestamp}
                expectedIntervalMs={status?.expectedIntervalMs ?? 60_000}
                zones={snapshot.config.zones}
              />
              <EventsPanel events={snapshot.events} />
            </div>
          </div>
        )}

        <footer className="flex flex-wrap justify-between gap-3 pt-2 text-xs text-muted">
          <span>Thresholds from BIS IS 10500:2012, WHO drinking-water guidelines and US EPA secondary standards.</span>
          {snapshot && (
            <span className="font-mono">
              score = clarity {Math.round(snapshot.config.weights.clarity * 100)}% + TDS {Math.round(snapshot.config.weights.tds * 100)}%
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}

import { TankEvent } from '../api/tankApi';
import { TONE, clockTime } from '../lib/status';
import { Panel } from './Panel';

const MAX_SHOWN = 6;

export function EventsPanel({ events }: { events: TankEvent[] }) {
  return (
    <Panel className="flex flex-[1_1_300px] flex-col gap-3.5 p-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">Recent events</p>
        <p className="text-xs text-muted">{events.length ? `latest ${Math.min(events.length, MAX_SHOWN)}` : ''}</p>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted">Nothing has changed yet.</p>
      ) : (
        <ol className="flex flex-col">
          {events.slice(0, MAX_SHOWN).map((e) => (
            <li key={e.id} className="flex gap-3 border-t border-line py-3">
              <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${TONE[e.tone].dot}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px]">{e.text}</p>
                <p className="font-mono text-xs text-muted">{clockTime(e.timestamp)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

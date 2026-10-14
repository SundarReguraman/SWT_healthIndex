import { useEffect, useState } from 'react';
import { fetchHistory, fetchLatestReading, TankReading } from '../api/tankApi';

const HISTORY_POINTS = 30;

export function useLiveScore(pollMs = 2000) {
  const [reading, setReading] = useState<TankReading | null>(null);
  const [history, setHistory] = useState<TankReading[]>([]);
  const [reachable, setReachable] = useState(true);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const [latest, hist] = await Promise.all([fetchLatestReading(), fetchHistory()]);
        if (!active) return;
        setReading(latest);
        setHistory(hist.slice(-HISTORY_POINTS));
        setReachable(true);
      } catch {
        if (active) setReachable(false);
      }
    }
    poll();
    const interval = setInterval(poll, pollMs);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pollMs]);

  return { reading, history, reachable };
}

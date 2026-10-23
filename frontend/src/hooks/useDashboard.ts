import { useEffect, useState } from 'react';
import { DashboardSnapshot, fetchDashboard } from '../api/tankApi';

export function useDashboard(minutes: number, pollMs = 2000) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [reachable, setReachable] = useState(true);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const next = await fetchDashboard(minutes);
        if (!active) return;
        setSnapshot(next);
        setFetchedAt(Date.now());
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
  }, [minutes, pollMs]);

  return { snapshot, fetchedAt, reachable };
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

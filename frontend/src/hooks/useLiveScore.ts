import { useEffect, useState } from 'react';
import { fetchLatestReading, TankReading } from '../api/tankApi';

export function useLiveScore(pollMs = 2000) {
  const [reading, setReading] = useState<TankReading | null>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      const data = await fetchLatestReading();
      if (active) setReading(data);
    }
    poll();
    const interval = setInterval(poll, pollMs);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pollMs]);

  return reading;
}

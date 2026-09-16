const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface TankReading {
  deviceId: string;
  turbidity: number;
  tds: number;
  temperature: number;
  level: number;
  timestamp: number;
  subScores: { turbidity: number; tds: number; temperature: number; level: number };
  composite: number;
  flagged: boolean;
  flaggedParams: string[];
}

export async function fetchLatestReading(): Promise<TankReading | null> {
  const res = await fetch(`${BASE_URL}/api/score/latest`);
  if (!res.ok) return null;
  return res.json();
}

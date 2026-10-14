const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export type HealthZone = 'GOOD' | 'SCHEDULE_MAINTENANCE' | 'IMMEDIATE_CLEANING';
export type LevelStatus = 'NORMAL' | 'REFILL_SOON' | 'LOW' | 'CRITICAL_LOW';

export interface TankReading {
  deviceId: string;
  clarity: number | null;
  turbidity: number | null;
  tds: number;
  temperature: number;
  level: number;
  timestamp: number;
  subScores: { clarity: number; tds: number; temperature: number; level: number };
  rawComposite?: number;
  composite: number;
  zone?: HealthZone;
  zoneLabel?: string;
  flagged: boolean;
  flaggedParams: string[];
  capReason?: string | null;
  message?: string;
  causes?: string[];
  levelStatus?: LevelStatus;
  levelAlert?: string | null;
}

export async function fetchLatestReading(): Promise<TankReading | null> {
  const res = await fetch(`${BASE_URL}/api/score/latest`);
  if (!res.ok) return null;
  return res.json();
}

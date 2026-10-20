const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export type HealthZone = 'GOOD' | 'SCHEDULE_MAINTENANCE' | 'IMMEDIATE_CLEANING' | 'SENSOR_FAULT';
export type LevelStatus = 'NORMAL' | 'REFILL_SOON' | 'LOW' | 'CRITICAL_LOW' | 'UNKNOWN';
export type Source = 'live' | 'demo';
export type EventTone = 'good' | 'warn' | 'bad' | 'neutral';

export interface TankReading {
  deviceId: string;
  seq: number | null;
  source: Source;
  via: 'usb' | 'wifi' | 'demo';
  clarity: number | null;
  tds: number | null;
  temperature: number | null;
  level: number | null;
  timestamp: number;
  subScores: { clarity: number | null; tds: number | null };
  rawComposite: number | null;
  composite: number | null;
  zone: HealthZone;
  zoneLabel: string;
  flagged: boolean;
  flaggedParams: ('clarity' | 'tds')[];
  capReason: string | null;
  message: string;
  causes: string[];
  levelStatus: LevelStatus;
  levelAlert: string | null;
}

export interface HistoryPoint {
  timestamp: number;
  zone: HealthZone;
  composite: number | null;
  clarity: number | null;
  tds: number | null;
  temperature: number | null;
  level: number | null;
}

export interface TankEvent {
  id: number;
  timestamp: number;
  tone: EventTone;
  text: string;
}

export interface StreamStatus {
  source: Source | null;
  ageMs: number | null;
  expectedIntervalMs: number | null;
  demoEnabled: boolean;
  live: { lastAt: number | null; via: 'usb' | 'wifi' | null; count: number };
  usb: { enabled: boolean; connected: boolean; path: string | null };
}

export interface ScoringConfig {
  clarity: { idealMin: number; acceptableMin: number; unsafeMin: number };
  tds: { idealMin: number; idealMax: number; acceptableMax: number; unsafeMax: number };
  level: { normalMin: number; refillMin: number; lowMin: number };
  zones: { goodMin: number; maintenanceMin: number; hardFlagCap: number; poorParamCap: number };
  weights: { clarity: number; tds: number };
}

export interface DashboardSnapshot {
  status: StreamStatus;
  latest: TankReading | null;
  history: HistoryPoint[];
  events: TankEvent[];
  config: ScoringConfig;
}

export async function fetchDashboard(minutes: number): Promise<DashboardSnapshot> {
  const res = await fetch(`${BASE_URL}/api/dashboard?minutes=${minutes}`);
  if (!res.ok) throw new Error(`Backend responded ${res.status}`);
  return res.json();
}

import { HealthZone, LevelStatus, ScoringConfig } from '../api/tankApi';

export type Tone = 'good' | 'warn' | 'bad' | 'neutral';

// Text colors pass 4.5:1 on the panel background.
export const TONE: Record<Tone, { dot: string; pill: string; text: string; stroke: string }> = {
  good: { dot: 'bg-[#3FCF8E]', pill: 'bg-[#3FCF8E]/10 text-[#7BE6B6] ring-[#3FCF8E]/30', text: 'text-[#7BE6B6]', stroke: '#3FCF8E' },
  warn: { dot: 'bg-[#F5A524]', pill: 'bg-[#F5A524]/10 text-[#F8C062] ring-[#F5A524]/30', text: 'text-[#F8C062]', stroke: '#F5A524' },
  bad: { dot: 'bg-[#F2555A]', pill: 'bg-[#F2555A]/10 text-[#FF8A8E] ring-[#F2555A]/30', text: 'text-[#FF8A8E]', stroke: '#F2555A' },
  neutral: { dot: 'bg-muted', pill: 'bg-muted/10 text-sub ring-muted/30', text: 'text-sub', stroke: '#8A93A0' },
};

export const ZONE_COPY: Record<HealthZone, { title: string; advice: string; tone: Tone }> = {
  GOOD: { title: 'Good', advice: 'Water is safe for everyday use.', tone: 'good' },
  SCHEDULE_MAINTENANCE: { title: 'Needs attention', advice: 'Plan a tank cleaning in the next 1–2 weeks.', tone: 'warn' },
  IMMEDIATE_CLEANING: { title: 'Clean now', advice: 'Avoid drinking this water until the tank is cleaned.', tone: 'bad' },
  SENSOR_FAULT: { title: 'Sensor fault', advice: 'Water quality can’t be scored until every quality sensor reports.', tone: 'neutral' },
};

export const LEVEL_COPY: Record<LevelStatus, { label: string; tone: Tone }> = {
  NORMAL: { label: 'Normal', tone: 'good' },
  REFILL_SOON: { label: 'Refill soon', tone: 'warn' },
  LOW: { label: 'Low', tone: 'warn' },
  CRITICAL_LOW: { label: 'Turn on the pump', tone: 'bad' },
  UNKNOWN: { label: 'No reading', tone: 'neutral' },
};

// Maps a 0-100 sub-score onto the backend's four bands.
export function paramStatus(subScore: number | null, flagged: boolean): { label: string; tone: Tone } {
  if (subScore === null) return { label: 'No reading', tone: 'neutral' };
  if (flagged || subScore < 20) return { label: 'Unsafe', tone: 'bad' };
  if (subScore < 50) return { label: 'Poor', tone: 'warn' };
  if (subScore < 80) return { label: 'Fair', tone: 'neutral' };
  return { label: 'Good', tone: 'good' };
}

export type BandKind = 'ideal' | 'fair' | 'poor' | 'unsafe';
export interface Band {
  from: number;
  to: number;
  kind: BandKind;
}
export interface Scale {
  min: number;
  max: number;
  bands: Band[];
  ticks: number[];
  summary: string;
}

// Threshold scales drawn under each quality tile, built from the backend's live config.
export function clarityScale(c: ScoringConfig['clarity']): Scale {
  return {
    min: 0,
    max: 100,
    bands: [
      { from: 0, to: c.unsafeMin, kind: 'unsafe' },
      { from: c.unsafeMin, to: c.acceptableMin, kind: 'poor' },
      { from: c.acceptableMin, to: c.idealMin, kind: 'fair' },
      { from: c.idealMin, to: 100, kind: 'ideal' },
    ],
    ticks: [c.unsafeMin, c.acceptableMin, c.idealMin],
    summary: `Ideal ≥ ${c.idealMin}% · unsafe below ${c.unsafeMin}%`,
  };
}

export function tdsScale(t: ScoringConfig['tds']): Scale {
  const max = Math.round(t.unsafeMax * 1.2);
  return {
    min: 0,
    max,
    bands: [
      { from: 0, to: t.idealMin, kind: 'fair' },
      { from: t.idealMin, to: t.idealMax, kind: 'ideal' },
      { from: t.idealMax, to: t.acceptableMax, kind: 'fair' },
      { from: t.acceptableMax, to: t.unsafeMax, kind: 'poor' },
      { from: t.unsafeMax, to: max, kind: 'unsafe' },
    ],
    ticks: [t.idealMax, t.acceptableMax, t.unsafeMax],
    summary: `Ideal ${t.idealMin}–${t.idealMax} ppm · unsafe from ${t.unsafeMax} ppm`,
  };
}

export function timeAgo(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

export function clockTime(t: number) {
  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

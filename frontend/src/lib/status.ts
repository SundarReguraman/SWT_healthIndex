import { HealthZone, LevelStatus, TankReading } from '../api/tankApi';

export type Tone = 'good' | 'warn' | 'bad' | 'neutral';

export const TONE = {
  good: { dot: 'bg-emerald-500', text: 'text-emerald-700', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', stroke: '#10b981' },
  warn: { dot: 'bg-amber-500', text: 'text-amber-700', pill: 'bg-amber-50 text-amber-700 ring-amber-600/20', stroke: '#f59e0b' },
  bad: { dot: 'bg-red-500', text: 'text-red-700', pill: 'bg-red-50 text-red-700 ring-red-600/20', stroke: '#ef4444' },
  neutral: { dot: 'bg-zinc-400', text: 'text-zinc-600', pill: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20', stroke: '#a1a1aa' },
} as const;

export const ZONE_COPY: Record<HealthZone, { title: string; advice: string; tone: Tone }> = {
  GOOD: { title: 'Good', advice: 'Water is safe for everyday use.', tone: 'good' },
  SCHEDULE_MAINTENANCE: { title: 'Needs attention', advice: 'Plan a tank cleaning in the next 1–2 weeks.', tone: 'warn' },
  IMMEDIATE_CLEANING: { title: 'Clean now', advice: 'Avoid drinking this water until the tank is cleaned.', tone: 'bad' },
};

export const LEVEL_COPY: Record<LevelStatus, { label: string; tone: Tone }> = {
  NORMAL: { label: 'Normal', tone: 'good' },
  REFILL_SOON: { label: 'Refill soon', tone: 'warn' },
  LOW: { label: 'Low', tone: 'warn' },
  CRITICAL_LOW: { label: 'Turn on the pump', tone: 'bad' },
};

// Maps a 0-100 sub-score onto the same bands the backend uses.
export function paramStatus(subScore: number, flagged: boolean): { label: string; tone: Tone } {
  if (flagged || subScore < 20) return { label: 'Unsafe', tone: 'bad' };
  if (subScore < 50) return { label: 'Poor', tone: 'warn' };
  if (subScore < 80) return { label: 'Fair', tone: 'neutral' };
  return { label: 'Good', tone: 'good' };
}

// Short, number-free reasons for the headline card.
export function reasons(r: TankReading): string[] {
  const f = r.flaggedParams;
  const out: string[] = [];
  if (f.includes('compound_warm_cloudy')) out.push('Warm, cloudy water — bacteria can grow');
  if (f.includes('clarity') || f.includes('turbidity')) out.push('Water is very cloudy');
  else if (r.subScores.clarity < 50 && !f.includes('compound_warm_cloudy')) out.push('Water is getting cloudy');
  if (f.includes('tds')) out.push('Very high dissolved salts');
  else if (r.subScores.tds < 50) out.push('Dissolved salts are high');
  if (f.includes('temperature')) out.push('Water is too hot');
  else if (r.subScores.temperature < 50 && !f.includes('compound_warm_cloudy')) out.push('Water is warm');
  return out;
}

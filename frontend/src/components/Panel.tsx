import { ReactNode } from 'react';
import { TONE, Tone } from '../lib/status';

export function Panel({ className = '', children }: { className?: string; children: ReactNode }) {
  return <section className={`min-w-0 rounded-[20px] bg-panel ring-1 ring-inset ring-line ${className}`}>{children}</section>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs uppercase tracking-[0.08em] text-muted">{children}</p>;
}

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${TONE[tone].pill}`}>
      {children}
    </span>
  );
}

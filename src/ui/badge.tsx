import type { ReactNode } from "react";

const tones = {
  // Red is kept for what needs the reader's attention.
  accent: "border-accent text-accent",
  strong: "border-text-muted text-text",
  muted: "border-border text-text-muted",
};

type BadgeTone = keyof typeof tones;

// A short label in a pill. Its text carries the meaning; the tone only repeats it, so it reads the
// same without colour.
export const Badge = ({ tone, children }: { tone: BadgeTone; children: ReactNode }) => (
  <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}>
    {children}
  </span>
);

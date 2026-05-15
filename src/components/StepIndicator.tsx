"use client";

interface Props {
  current: number;
  total: number;
  label: string;
}

export default function StepIndicator({ current, total, label }: Props) {
  const pct = Math.max(0, Math.min(100, (current / total) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
        <span className="text-[var(--color-text-primary)]/65">
          Step {current} of {total}
        </span>
        <span className="text-[var(--color-text-primary)]">{label}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-black/10 shadow-inner">
        <div
          className="h-1.5 rounded-full bg-[var(--color-accent-orange)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}


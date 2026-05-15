"use client";

type MatchGaugeProps = {
  score: number;
  className?: string;
};

export default function MatchGauge({ score, className = "" }: MatchGaugeProps) {
  const position = Math.max(4, Math.min(96, score));
  const level = labelForScore(score);

  return (
    <div
      className={`w-full max-w-md ${className}`}
      role="img"
      aria-label={`Recruiter confidence gauge: ${level}`}
    >
      <div className="relative rounded-[22px] border border-white/70 bg-white/72 p-4 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="relative h-4 overflow-hidden rounded-full bg-[#ece7df]">
          <div className="absolute inset-y-0 left-0 w-1/3 bg-[#f2d7c2]" />
          <div className="absolute inset-y-0 left-1/3 w-1/3 bg-[#f7c871]" />
          <div className="absolute inset-y-0 right-0 w-1/3 bg-[var(--color-accent-orange)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-white/35 to-white/5" />
        </div>

        <div
          className="absolute top-[18px] h-8 w-8 -translate-x-1/2 rounded-full border-[5px] border-white bg-[var(--color-accent-purple)] shadow-[0_10px_22px_rgba(45,30,74,0.26)]"
          style={{ left: `${position}%` }}
          aria-hidden
        />

        <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">
          <span>Not a good fit</span>
          <span className="text-center">Close fit</span>
          <span className="text-right">Great fit</span>
        </div>

        <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
          {level}
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
          {guidanceForScore(score)}
        </p>
      </div>
    </div>
  );
}

function labelForScore(score: number): string {
  if (score >= 81) return "Great fit";
  if (score >= 61) return "Strong recruiter alignment";
  if (score >= 41) return "Close fit with gaps to clarify";
  if (score >= 21) return "Some transferable overlap";
  return "Limited visible overlap";
}

function guidanceForScore(score: number): string {
  if (score >= 81) {
    return "Your experience strongly matches the hiring intent behind this role.";
  }
  if (score >= 61) {
    return "Your experience aligns well with this role, with a few details that could make the application sharper.";
  }
  if (score >= 41) {
    return "Your background shows meaningful overlap, but a few role-specific skills or platform details could strengthen the final application.";
  }
  if (score >= 21) {
    return "Some transferable strengths are visible, though the resume needs clearer role-specific evidence.";
  }
  return "This role appears to have limited overlap with your current resume, though some transferable skills may still apply.";
}

"use client";

type GraphicProps = {
  className?: string;
};

export function DocumentStackGraphic({ className = "" }: GraphicProps) {
  return (
    <div className={`relative h-36 w-40 ${className}`} aria-hidden>
      <div className="absolute left-5 top-5 h-28 w-24 rotate-[-8deg] rounded-[22px] bg-white/55 shadow-lg" />
      <div className="absolute left-12 top-1 h-32 w-24 rotate-[7deg] rounded-[22px] bg-white shadow-xl">
        <div className="mx-auto mt-5 h-2 w-12 rounded-full bg-[var(--color-accent-purple)]/20" />
        <div className="mx-5 mt-6 space-y-2">
          <div className="h-2 rounded-full bg-[var(--color-accent-orange)]/80" />
          <div className="h-2 w-4/5 rounded-full bg-[var(--color-accent-purple)]/18" />
          <div className="h-2 w-3/5 rounded-full bg-[var(--color-accent-purple)]/18" />
        </div>
        <div className="absolute bottom-5 left-5 right-5 h-8 rounded-2xl bg-[var(--color-accent-orange)]/20" />
      </div>
      <div className="absolute bottom-2 left-1 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-purple)] text-white shadow-lg">
        <span className="text-lg font-black">✓</span>
      </div>
    </div>
  );
}

export function SearchCardGraphic({ className = "" }: GraphicProps) {
  return (
    <div className={`relative h-36 w-40 ${className}`} aria-hidden>
      <div className="absolute inset-x-3 top-4 rounded-[24px] bg-white p-4 shadow-xl">
        <div className="h-4 w-20 rounded-full bg-[var(--color-accent-purple)]/14" />
        <div className="mt-4 flex items-center gap-2 rounded-full border border-[var(--color-border-light)] bg-[#f8f4ef] px-3 py-2">
          <div className="h-3 w-3 rounded-full border-2 border-[var(--color-accent-orange)]" />
          <div className="h-2 flex-1 rounded-full bg-[var(--color-accent-purple)]/16" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-2 rounded-full bg-[var(--color-accent-orange)]/55" />
          <div className="h-2 w-4/5 rounded-full bg-[var(--color-accent-purple)]/14" />
          <div className="h-2 w-2/3 rounded-full bg-[var(--color-accent-purple)]/14" />
        </div>
      </div>
      <div className="absolute bottom-2 right-4 h-14 w-14 rounded-[20px] bg-[var(--color-accent-purple)] shadow-xl" />
    </div>
  );
}

export function CoachGraphic({ className = "" }: GraphicProps) {
  return (
    <div className={`relative h-28 w-32 ${className}`} aria-hidden>
      <div className="absolute left-4 top-4 h-20 w-24 rounded-[24px] bg-[var(--color-accent-orange)]/18" />
      <div className="absolute left-0 top-0 rounded-[24px] bg-white p-4 shadow-xl">
        <div className="h-3 w-20 rounded-full bg-[var(--color-accent-purple)]/18" />
        <div className="mt-3 h-2 w-24 rounded-full bg-[var(--color-accent-orange)]/65" />
        <div className="mt-2 h-2 w-16 rounded-full bg-[var(--color-accent-purple)]/14" />
      </div>
      <div className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-purple)] text-white shadow-lg">
        <span className="text-xl">?</span>
      </div>
    </div>
  );
}

export function SuccessGraphic({ className = "" }: GraphicProps) {
  return (
    <div className={`relative h-28 w-32 ${className}`} aria-hidden>
      <div className="absolute inset-x-4 bottom-0 h-20 rounded-[26px] bg-white/70 shadow-xl" />
      <div className="absolute left-8 top-0 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-purple)] text-white">
          <span className="text-2xl font-black">✓</span>
        </div>
      </div>
      <div className="absolute bottom-6 left-7 right-7 h-2 rounded-full bg-[var(--color-accent-orange)]/65" />
      <div className="absolute bottom-3 left-10 right-10 h-2 rounded-full bg-[var(--color-accent-purple)]/16" />
    </div>
  );
}

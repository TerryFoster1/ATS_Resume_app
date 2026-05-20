import Link from "next/link";

const LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund-policy", label: "Refunds" },
  { href: "/support", label: "Support" }
];

export default function AppFooter() {
  return (
    <footer className="app-footer">
      <div>
        <p className="text-sm font-black text-[var(--color-text-primary)]">Career Ladder</p>
        <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--color-text-muted)]">
          Recruiter-aware resume positioning for real job postings. Built to help people communicate
          their experience clearly and professionally.
        </p>
      </div>
      <nav className="flex flex-wrap gap-3 text-xs font-bold text-[var(--color-text-muted)]">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="transition hover:text-[var(--color-text-primary)]">
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}

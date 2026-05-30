import Link from "next/link";

const STATS = [
  { value: "<60", unit: "sec", label: "per quote" },
  { value: "10×", unit: "", label: "productivity" },
  { value: "75k+", unit: "", label: "agencies in Europe" },
] as const;

const FEATURES = [
  {
    title: "Free-text input",
    description:
      "Paste emails, WhatsApp threads, or rough notes. TQuot understands natural language requests—no forms, no friction.",
    icon: MessageIcon,
    accent: "teal" as const,
  },
  {
    title: "AI web search",
    description:
      "Live pricing from hotels, flights, and tours across the web. Your quotes stay current without manual lookups.",
    icon: SearchIcon,
    accent: "warm" as const,
  },
  {
    title: "Margin engine",
    description:
      "Apply agency markups, commissions, and rounding rules automatically. Protect your margin on every line item.",
    icon: ChartIcon,
    accent: "accent" as const,
  },
  {
    title: "Branded PDF",
    description:
      "Client-ready quotes with your logo, colors, and terms. Send a polished document in seconds, not hours.",
    icon: DocumentIcon,
    accent: "teal" as const,
  },
] as const;

const accentStyles = {
  teal: {
    icon: "bg-tquot-teal/10 text-tquot-teal ring-tquot-teal/20",
    dot: "bg-tquot-teal",
  },
  warm: {
    icon: "bg-tquot-warm/10 text-tquot-warm ring-tquot-warm/20",
    dot: "bg-tquot-warm",
  },
  accent: {
    icon: "bg-tquot-accent/10 text-tquot-accent ring-tquot-accent/20",
    dot: "bg-tquot-accent",
  },
};

export default function Home() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-white via-tquot-bg to-tquot-bg text-tquot-text">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
        <Logo variant="light" />
        <nav className="hidden items-center gap-8 text-sm font-medium text-tquot-muted sm:flex">
          <a href="#features" className="transition-colors hover:text-tquot-teal">
            Features
          </a>
          <Link href="/login" className="transition-colors hover:text-tquot-teal">
            Sign in
          </Link>
          <a
            href="#cta"
            className="rounded-full border border-tquot-teal/30 bg-tquot-teal/5 px-5 py-2 text-tquot-teal transition-all hover:border-tquot-teal/50 hover:bg-tquot-teal/10"
          >
            Early access
          </a>
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 text-center lg:px-8 lg:pb-28 lg:pt-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-tquot-border bg-tquot-surface px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-tquot-teal shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-tquot-teal" />
            Built for travel professionals
          </div>

          <h1 className="mx-auto max-w-4xl font-[family-name:var(--font-outfit)] text-4xl font-bold leading-[1.08] tracking-tight text-tquot-text sm:text-5xl md:text-6xl lg:text-7xl">
            The AI quote engine{" "}
            <span className="bg-gradient-to-r from-tquot-text via-tquot-accent to-tquot-teal bg-clip-text text-transparent">
              for travel agencies
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-tquot-muted sm:text-xl">
            Transform any client request into a professional PDF quote in under{" "}
            <span className="font-semibold text-tquot-teal">60 seconds</span>
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="group inline-flex items-center justify-center rounded-full bg-tquot-teal px-8 py-4 text-base font-semibold text-white shadow-sm transition-all hover:bg-[#00b396] hover:shadow-md"
            >
              Get started
              <ArrowIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-full border border-tquot-border bg-tquot-surface px-8 py-4 text-base font-medium text-tquot-text shadow-sm transition-all hover:border-tquot-accent/30 hover:bg-tquot-bg"
            >
              See how it works
            </a>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-20 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center rounded-2xl border border-tquot-border bg-tquot-surface px-6 py-8 shadow-sm"
              >
                <div className="flex items-baseline gap-1 font-[family-name:var(--font-outfit)]">
                  <span className="text-4xl font-bold tracking-tight text-tquot-text sm:text-5xl">
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span className="text-lg font-semibold text-tquot-teal">
                      {stat.unit}
                    </span>
                  )}
                </div>
                <span className="mt-2 text-sm font-medium uppercase tracking-wider text-tquot-muted">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Product preview strip */}
        <section className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-tquot-border bg-tquot-surface p-6 shadow-md sm:p-8">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-tquot-warm" />
              <div className="h-3 w-3 rounded-full bg-tquot-accent" />
              <div className="h-3 w-3 rounded-full bg-tquot-teal" />
              <span className="ml-3 text-xs font-medium text-tquot-muted">
                Quote preview
              </span>
            </div>
            <div className="space-y-3 font-mono text-sm text-tquot-muted">
              <p>
                <span className="text-tquot-teal">→</span> &quot;Family of 4,
                Rome + Florence, 10 nights in June, 4-star hotels, skip-the-line
                Vatican&quot;
              </p>
              <p className="text-tquot-text">
                <span className="text-tquot-accent">✓</span> Flights · Hotels ·
                Transfers · Experiences ·{" "}
                <span className="text-tquot-warm">+18% margin applied</span>
              </p>
              <p>
                <span className="text-tquot-teal">→</span> Generating branded
                PDF…{" "}
                <span className="inline-block text-tquot-teal">████████</span>{" "}
                47s
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="mx-auto max-w-6xl px-6 py-24 lg:px-8 lg:py-32"
        >
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-tquot-teal">
              Platform
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-tquot-text sm:text-4xl">
              Everything you need to quote faster
            </h2>
            <p className="mt-4 text-tquot-muted">
              From messy client briefs to signed proposals—one intelligent
              workflow.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => {
              const style = accentStyles[feature.accent];
              return (
                <article
                  key={feature.title}
                  className="group rounded-2xl border border-tquot-border bg-tquot-surface p-8 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div
                    className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ring-1 ${style.icon}`}
                  >
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-[family-name:var(--font-outfit)] text-xl font-semibold text-tquot-text">
                    {feature.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-tquot-muted">
                    {feature.description}
                  </p>
                  <div
                    className={`mt-6 h-0.5 w-12 rounded-full ${style.dot} opacity-60 transition-all group-hover:w-20 group-hover:opacity-100`}
                  />
                </article>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="mx-auto max-w-6xl px-6 pb-24 lg:px-8 lg:pb-32">
          <div className="overflow-hidden rounded-3xl border border-tquot-teal/20 bg-gradient-to-br from-[#0a1525] to-[#0d2038] px-8 py-16 text-center sm:px-16 sm:py-20">
            <h2 className="font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to quote at the speed of AI?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-white/70">
              Join the waitlist for early access. Limited spots for founding
              agency partners across Europe.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-tquot-teal px-10 py-4 text-base font-bold text-white shadow-sm transition-all hover:bg-[#00b396] hover:shadow-md"
            >
              Get started
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-tquot-teal/20 bg-gradient-to-br from-[#0a1525] to-[#0d2038]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row lg:px-8">
          <Logo variant="dark" />
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} TQuot. All rights reserved.
          </p>
          <Link
            href="https://tquot.io"
            className="text-sm font-medium text-tquot-teal transition-colors hover:text-[#00e5bb]"
          >
            tquot.io
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Logo({ variant = "light" }: { variant?: "light" | "dark" }) {
  const isDark = variant === "dark";

  return (
    <Link href="/" className="group flex items-center gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-tquot-teal shadow-sm transition-transform group-hover:scale-105"
        aria-hidden
      >
        <span className="font-[family-name:var(--font-outfit)] text-xl font-extrabold text-white">
          Q
        </span>
      </div>
      <span
        className={`font-[family-name:var(--font-outfit)] text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-tquot-text"}`}
      >
        T<span className="text-tquot-teal">Quot</span>
      </span>
    </Link>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M6 20l2.5-4.5M18 20l-2.5-4.5M4 8V6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-3 4z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M20 20l-3-3M11 8v6M8 11h6" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5M10 19V9M16 19v-6M22 19V3" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M9 13h6M9 17h4" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

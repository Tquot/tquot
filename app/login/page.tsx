import Link from "next/link";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ redirectTo?: string }>;
};

const BULLETS = [
  {
    title: "Entrada en texto libre",
    description: "Emails, WhatsApp o notas — sin formularios.",
  },
  {
    title: "Búsqueda web con IA",
    description: "Precios en vivo de hoteles, vuelos y tours.",
  },
  {
    title: "PDF con tu marca",
    description: "Cotizaciones profesionales con márgenes automáticos.",
  },
] as const;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo =
    params.redirectTo?.startsWith("/dashboard") ? params.redirectTo : undefined;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative flex flex-col justify-center overflow-hidden bg-gradient-to-br from-tquot-text via-[#0d2038] to-tquot-accent px-8 py-12 lg:px-12 lg:py-16">
        <div
          className="pointer-events-none absolute -right-24 top-1/4 h-64 w-64 rounded-full bg-tquot-teal/10 blur-3xl"
          aria-hidden
        />

        <div className="relative max-w-lg">
          <Link href="/" className="mb-10 inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-tquot-teal text-xl font-extrabold text-white">
              Q
            </span>
            <span className="font-[family-name:var(--font-outfit)] text-xl font-bold tracking-tight text-white">
              T<span className="text-tquot-teal">Quot</span>
            </span>
          </Link>

          <h1 className="font-[family-name:var(--font-outfit)] text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.5rem]">
            De email a cotización en 60 segundos
          </h1>

          <ul className="mt-10 space-y-6">
            {BULLETS.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tquot-teal/20 text-tquot-teal"
                  aria-hidden
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-white/70">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center bg-tquot-bg px-6 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-tquot-border bg-tquot-surface p-8 shadow-md">
            <h2 className="text-center text-2xl font-semibold tracking-tight text-tquot-text">
              Sign in to TQuot
            </h2>
            <p className="mt-2 text-center text-sm text-tquot-muted">
              Access your agency dashboard
            </p>

            <div className="mt-8">
              <LoginForm redirectTo={redirectTo} />
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-tquot-muted">
            <Link
              href="/"
              className="font-medium text-tquot-teal transition-colors hover:text-[#00b396]"
            >
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

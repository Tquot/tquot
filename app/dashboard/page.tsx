import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

const STATS = [
  { label: "Cotizaciones hoy", value: "0" },
  { label: "Cotizaciones este mes", value: "0" },
  { label: "Agencias activas", value: "1" },
  { label: "PDF generados", value: "0" },
] as const;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email ?? "usuario";
  const greeting = getGreeting();

  return (
    <div className="relative min-h-screen bg-[#03080F] text-[#E8EEF7]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(0,201,167,0.12),transparent)]"
        aria-hidden
      />

      <header className="relative border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#00C9A7] text-lg font-extrabold text-[#03080F] shadow-[0_0_20px_-4px_rgba(0,201,167,0.5)]">
              Q
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              T<span className="text-[#00C9A7]">Quot</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-[#8B9CB3] sm:block">{email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-10 sm:py-12">
        <section className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {greeting},{" "}
            <span className="text-[#00C9A7]">{email}</span>
          </h1>
          <p className="mt-2 text-[#8B9CB3]">Motor de cotización inteligente</p>
        </section>

        <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm"
            >
              <p className="text-sm font-medium text-[#8B9CB3]">{stat.label}</p>
              <p className="mt-2 font-[family-name:var(--font-outfit)] text-3xl font-bold text-white">
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        <section className="mb-14 flex justify-center">
          <button
            type="button"
            className="rounded-2xl bg-[#00C9A7] px-12 py-5 text-lg font-semibold text-[#03080F] shadow-[0_0_48px_-8px_rgba(0,201,167,0.55)] transition-all hover:scale-[1.02] hover:bg-[#00E5BB] hover:shadow-[0_0_56px_-8px_rgba(0,201,167,0.7)]"
          >
            Nueva cotización
          </button>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">
            Peticiones recientes
          </h2>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-14 text-center backdrop-blur-sm">
            <p className="text-[#8B9CB3]">No hay peticiones aún</p>
          </div>
        </section>
      </main>
    </div>
  );
}

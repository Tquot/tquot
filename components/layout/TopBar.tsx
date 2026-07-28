import Link from "next/link";
import { logoutAction } from "@/app/dashboard/actions";

const navLinkClass =
  "text-body-sm text-text transition-colors hover:text-ink";

export function TopBar() {
  return (
    <header className="border-b border-border-1 bg-paper">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-6">
        <Link
          href="/dashboard"
          className="font-mono text-mono-md font-semibold tracking-tight text-ink"
        >
          TQUOT
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/dashboard" className={navLinkClass}>
            Resumen
          </Link>
          <Link href="/dashboard/quotes" className={navLinkClass}>
            Cotizaciones
          </Link>
          <Link href="/dashboard/clients" className={navLinkClass}>
            Clientes
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/dashboard/new-quote"
            className="inline-flex h-8 items-center rounded-md bg-ink px-3 text-body-sm font-medium text-paper transition-colors hover:bg-ink-2"
          >
            Nueva cotización
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded-md border border-border-1 px-3 text-body-sm text-text transition-colors hover:border-border-3 hover:text-ink"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

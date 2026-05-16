import Link from "next/link";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ redirectTo?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo =
    params.redirectTo?.startsWith("/dashboard") ? params.redirectTo : undefined;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#03080F] px-6 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,201,167,0.15),transparent)]"
        aria-hidden
      />

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-10 flex items-center justify-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#00C9A7] text-xl font-extrabold text-[#03080F]">
            Q
          </span>
          <span className="text-xl font-bold tracking-tight text-white">
            T<span className="text-[#00C9A7]">Quot</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 backdrop-blur-sm">
          <h1 className="text-center text-2xl font-semibold tracking-tight text-white">
            Sign in to TQuot
          </h1>
          <p className="mt-2 text-center text-sm text-[#8B9CB3]">
            Access your agency dashboard
          </p>

          <div className="mt-8">
            <LoginForm redirectTo={redirectTo} />
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[#8B9CB3]">
          <Link
            href="/"
            className="text-[#00C9A7] transition-colors hover:text-[#00E5BB]"
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

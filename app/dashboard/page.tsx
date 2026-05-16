import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#03080F] text-[#E8EEF7]">
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#00C9A7] text-lg font-extrabold text-[#03080F]">
              Q
            </span>
            <span className="text-lg font-bold text-white">
              T<span className="text-[#00C9A7]">Quot</span>
            </span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Welcome to TQuot
        </h1>
        <p className="mt-3 text-[#8B9CB3]">
          Signed in as{" "}
          <span className="font-medium text-[#00C9A7]">{user.email}</span>
        </p>
      </main>
    </div>
  );
}

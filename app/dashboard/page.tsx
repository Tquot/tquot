import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LanguageToggle, type RecentQuoteRow } from "./language-toggle";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: recentQuotes } = await supabase
    .from("quotes")
    .select(
      "id, reference, origin, destination, departure_date, total_public_price, currency, created_at, status",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <LanguageToggle
      email={user.email ?? "usuario"}
      recentQuotes={(recentQuotes ?? []) as RecentQuoteRow[]}
    />
  );
}

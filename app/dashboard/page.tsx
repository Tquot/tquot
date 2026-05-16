import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardHome } from "./dashboard-home";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "usuario";

  return <DashboardHome email={email} />;
}

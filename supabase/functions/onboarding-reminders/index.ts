/**
 * Onboarding reminder email (Supabase Edge Function stub).
 * Deploy with: supabase functions deploy onboarding-reminders
 *
 * Accent hex for email clients (no CSS tokens): #00897B (teal / text-accent).
 */
const ACCENT = "#00897B";

Deno.serve(async (_req) => {
  // Placeholder: query agencies with incomplete onboarding and send reminders.
  // Real implementation should use Resend/Postmark with ACCENT in HTML.
  return new Response(
    JSON.stringify({
      ok: true,
      note: `Use accent ${ACCENT} in email HTML (not umber #B85C38).`,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});

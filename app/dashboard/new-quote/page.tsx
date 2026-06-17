import { loadBookingConfig } from "@/lib/booking-handoff/config";
import { QuoteConversation } from "./QuoteConversation";

export default async function NewQuotePage() {
  const agencyConfig = await loadBookingConfig();
  return <QuoteConversation agencyConfig={agencyConfig} />;
}

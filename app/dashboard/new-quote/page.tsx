import { QuoteConversation } from "./QuoteConversation";
import { QuoteEngine } from "./QuoteEngine";

type NewQuotePageProps = {
  searchParams?: Promise<{ ui?: string }>;
};

export default async function NewQuotePage({ searchParams }: NewQuotePageProps) {
  const resolved = (await searchParams) ?? {};

  if (resolved.ui === "conversation") {
    return <QuoteConversation />;
  }

  return <QuoteEngine />;
}

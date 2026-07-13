import { notFound } from "next/navigation";
import { PublicQuoteView } from "@/components/public-quote/PublicQuoteView";
import { resolveShare } from "@/lib/sharing/resolve-share";

interface Props {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

export default async function PublicQuotePage({ params }: Props) {
  const { token } = await params;
  const { quote, branding, shareExpired, shareRevoked } =
    await resolveShare(token);

  if (shareRevoked || shareExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-xl font-semibold">
            {shareExpired ? "Enlace caducado" : "Enlace deshabilitado"}
          </h1>
          <p className="text-sm text-neutral-600">
            Pide a tu agencia un enlace nuevo para ver esta cotización.
          </p>
        </div>
      </div>
    );
  }

  if (!quote) notFound();

  return <PublicQuoteView quote={quote} branding={branding} />;
}

export async function generateMetadata({ params }: Props) {
  await params;
  return {
    title: "Tu cotización de viaje",
    description: "Cotización personalizada",
    robots: "noindex, nofollow",
  };
}

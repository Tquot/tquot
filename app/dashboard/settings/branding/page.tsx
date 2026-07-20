import Link from "next/link";
import { loadBranding } from "@/lib/branding/loader";
import { updateBranding } from "@/lib/branding/update";
import { BrandingForm } from "./BrandingForm";

export default async function BrandingSettingsPage() {
  const branding = await loadBranding();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex text-sm text-neutral-500 hover:text-neutral-800"
      >
        ← Volver al dashboard
      </Link>
      <h1 className="mb-1 text-xl font-semibold">Identidad visual</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Configura los colores, logo y datos que aparecen en tus PDF.
      </p>
      <BrandingForm initial={branding} action={updateBranding} />
    </div>
  );
}

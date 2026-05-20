"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDashboardLanguage } from "../dashboard-language-provider";
import { LocaleToggleButtons } from "../locale-toggle-buttons";
import {
  type AgencyProfile,
  DEFAULT_AGENCY_PROFILE,
  readAgencyProfile,
  writeAgencyProfile,
} from "./agency-profile";

export default function AgencyPage() {
  const { t } = useDashboardLanguage();
  const [profile, setProfile] = useState<AgencyProfile>(DEFAULT_AGENCY_PROFILE);
  const [saved, setSaved] = useState(false);

  const fields = useMemo(
    () =>
      [
        { key: "agencyName" as const, label: t.agencyName },
        { key: "email" as const, label: t.agencyEmail, type: "email" },
        { key: "phone" as const, label: t.agencyPhone },
        { key: "address" as const, label: t.agencyAddress },
        { key: "website" as const, label: t.agencyWebsite, type: "url" },
      ],
    [t],
  );

  useEffect(() => {
    setProfile(readAgencyProfile());
  }, []);

  function updateField(key: keyof AgencyProfile, value: string) {
    setSaved(false);
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function handleLogoUpload(file: File | undefined) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateField("logoBase64", String(reader.result ?? ""));
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    writeAgencyProfile(profile);
    setSaved(true);
  }

  return (
    <div className="relative min-h-screen bg-[#03080F] px-6 py-10 text-[#E8EEF7]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(0,201,167,0.12),transparent)]"
        aria-hidden
      />

      <main className="relative mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-[#8B9CB3] transition-colors hover:text-[#00C9A7]"
          >
            ← {t.backToDashboard}
          </Link>
          <LocaleToggleButtons className="bg-white/[0.04]" />
        </div>

        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#00C9A7]">
            {t.agencyEyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t.agencyPdfDataTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-[#8B9CB3]">{t.agencyPdfDataSubtitle}</p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-2 block text-sm font-medium text-[#E8EEF7]">
                    {field.label}
                  </span>
                  <input
                    type={field.type ?? "text"}
                    value={profile[field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#03080F]/60 px-4 py-3 text-[#E8EEF7] outline-none transition-colors focus:border-[#00C9A7]/50 focus:ring-2 focus:ring-[#00C9A7]/20"
                  />
                </label>
              ))}
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium text-[#E8EEF7]">
                {t.agencyLogoUpload}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                className="block w-full rounded-xl border border-white/10 bg-[#03080F]/60 px-4 py-3 text-sm text-[#8B9CB3] file:mr-4 file:rounded-lg file:border-0 file:bg-[#00C9A7] file:px-4 file:py-2 file:font-semibold file:text-[#03080F]"
              />
            </label>

            <div className="mt-6 flex items-center gap-4">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-[#00C9A7] px-8 py-3 text-sm font-semibold text-[#03080F] shadow-[0_0_32px_-8px_rgba(0,201,167,0.5)] transition-all hover:bg-[#00E5BB]"
              >
                {t.agencySaveShort}
              </button>
              {saved ? (
                <p className="text-sm font-medium text-[#00C9A7]">{t.agencySavedShort}</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-semibold text-white">
              {t.agencyPdfHeaderPreview}
            </h2>
            <div className="rounded-2xl bg-white p-6 text-[#03080F] shadow-2xl">
              <div className="flex items-start gap-4 border-b border-slate-200 pb-5">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-[#03080F] text-sm font-bold text-[#00C9A7]">
                  {profile.logoBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.logoBase64}
                      alt={t.agencyLogoUrl}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "LOGO"
                  )}
                </div>
                <div>
                  <p className="text-xl font-bold">
                    {profile.agencyName || t.agencyName}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{profile.email}</p>
                  <p className="text-sm text-slate-600">{profile.phone}</p>
                  <p className="text-sm text-slate-600">{profile.address}</p>
                  <p className="text-sm font-medium text-[#00A98D]">
                    {profile.website}
                  </p>
                </div>
              </div>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-[#00A98D]">
                {t.pdfClientProposal}
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

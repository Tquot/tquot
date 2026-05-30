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

const backLinkClass =
  "inline-flex items-center rounded-lg border border-tquot-border bg-tquot-surface px-4 py-2 text-sm text-tquot-muted shadow-sm transition-colors hover:bg-tquot-bg hover:text-tquot-accent";

const inputClass =
  "w-full rounded-xl border border-tquot-border bg-tquot-surface px-4 py-3 text-tquot-text outline-none transition-colors focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20";

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
    <div className="min-h-screen px-6 py-10 text-tquot-text">
      <main className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/dashboard" className={backLinkClass}>
            ← {t.backToDashboard}
          </Link>
          <LocaleToggleButtons />
        </div>

        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-tquot-teal">
            {t.agencyEyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-tquot-text sm:text-4xl">
            {t.agencyPdfDataTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-tquot-muted">{t.agencyPdfDataSubtitle}</p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-xl border border-tquot-border bg-tquot-surface p-6 shadow-md">
            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-2 block text-sm font-medium text-tquot-text">
                    {field.label}
                  </span>
                  <input
                    type={field.type ?? "text"}
                    value={profile[field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    className={inputClass}
                  />
                </label>
              ))}
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium text-tquot-text">
                {t.agencyLogoUpload}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                className="block w-full rounded-xl border border-tquot-border bg-tquot-surface px-4 py-3 text-sm text-tquot-muted file:mr-4 file:rounded-lg file:border-0 file:bg-tquot-teal file:px-4 file:py-2 file:font-semibold file:text-white"
              />
            </label>

            <div className="mt-6 flex items-center gap-4">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-tquot-teal px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#00b396]"
              >
                {t.agencySaveShort}
              </button>
              {saved ? (
                <p className="text-sm font-medium text-tquot-teal">{t.agencySavedShort}</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-tquot-border bg-tquot-surface p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-tquot-text">
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

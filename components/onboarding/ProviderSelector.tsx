"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eyebrow } from "@/components/ui/Eyebrow";
import {
  ONBOARDING_PROVIDERS,
  type ProviderKey,
} from "@/lib/onboarding/constants";
import { useSiteLanguage } from "@/app/language-provider";
import { formatMessage } from "@/app/dashboard/format-message";
import type { DashboardTranslation } from "@/app/dashboard/translations";

function providerCopy(key: ProviderKey, t: DashboardTranslation) {
  switch (key) {
    case "hotelbeds":
      return {
        category: t.onboardingProviderHotelbedsCategory,
        description: t.onboardingProviderHotelbedsDesc,
        unlocks: [
          t.onboardingProviderHotelbedsUnlock1,
          t.onboardingProviderHotelbedsUnlock2,
          t.onboardingProviderHotelbedsUnlock3,
        ],
      };
    case "duffel":
      return {
        category: t.onboardingProviderDuffelCategory,
        description: t.onboardingProviderDuffelDesc,
        unlocks: [t.onboardingProviderDuffelUnlock1],
      };
    case "booking":
      return {
        category: t.onboardingProviderBookingCategory,
        description: t.onboardingProviderBookingDesc,
        unlocks: [t.onboardingProviderBookingUnlock1],
      };
  }
}

interface Props {
  initialConnected?: ProviderKey[];
}

export function ProviderSelector({ initialConnected = [] }: Props) {
  const router = useRouter();
  const { t } = useSiteLanguage();
  const [connected, setConnected] = useState<ProviderKey[]>(initialConnected);
  const [selected, setSelected] = useState<ProviderKey | null>(null);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  const provider = ONBOARDING_PROVIDERS.find((p) => p.key === selected);
  const selectedCopy = selected ? providerCopy(selected, t) : null;

  async function testAndSave() {
    if (!selected) return;
    setPending(true);
    setMessage(null);
    setOk(null);
    try {
      const res = await fetch("/api/onboarding/test-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selected,
          credentials: creds,
          save: true,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      setOk(Boolean(data.ok));
      setMessage(data.message ?? (data.ok ? "OK" : "Error"));
      if (data.ok) {
        setConnected((prev) =>
          prev.includes(selected) ? prev : [...prev, selected],
        );
        setSelected(null);
        setCreds({});
      }
    } catch {
      setOk(false);
      setMessage(t.onboardingServerUnreachable);
    } finally {
      setPending(false);
    }
  }

  async function continueNext() {
    setPending(true);
    await fetch("/api/onboarding/step-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: "providers",
        data: { connectedProviders: connected },
      }),
    });
    router.push("/onboarding/first-quote");
  }

  if (selected && provider && selectedCopy) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <Eyebrow className="block">
          {formatMessage(t.onboardingProvidersStepEyebrow, {
            name: provider.name,
          })}
        </Eyebrow>
        <h1
          className="font-serif text-h1 text-ink"
          style={{ fontWeight: 500 }}
        >
          {formatMessage(t.onboardingConnectProvider, { name: provider.name })}
        </h1>
        <p className="text-body text-text-2">{selectedCopy.description}</p>

        <div className="space-y-3">
          {provider.fields.map((field) => (
            <label key={field.key} className="block space-y-1.5">
              <span className="text-body-sm font-medium text-ink">
                {field.label}
              </span>
              <input
                type={field.type}
                value={creds[field.key] ?? ""}
                onChange={(e) =>
                  setCreds((c) => ({ ...c, [field.key]: e.target.value }))
                }
                className="h-11 w-full rounded-md border border-border-1 bg-paper px-3 text-body outline-none focus:border-border-3"
                autoComplete="off"
              />
            </label>
          ))}
        </div>

        {message ? (
          <p
            className={
              ok ? "text-body-sm text-success" : "text-body-sm text-danger"
            }
          >
            {message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={testAndSave}
            disabled={pending}
            className="inline-flex h-11 items-center rounded-md bg-ink px-5 text-body-sm font-medium text-paper hover:bg-ink-2 disabled:opacity-50"
          >
            {pending ? t.onboardingTesting : t.onboardingTestAndSave}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setCreds({});
              setMessage(null);
            }}
            className="inline-flex h-11 items-center rounded-md border border-border-1 px-5 text-body-sm text-ink"
          >
            {t.onboardingCancel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Eyebrow className="mb-4 block">{t.onboardingProvidersEyebrow}</Eyebrow>
        <h1
          className="font-serif text-h1 text-ink"
          style={{ fontWeight: 500 }}
        >
          {t.onboardingProvidersTitle}
        </h1>
        <p className="mt-3 text-body text-text-2">
          {t.onboardingProvidersSubtitle}
        </p>
      </div>

      <ul className="space-y-3">
        {ONBOARDING_PROVIDERS.map((p) => {
          const isConnected = connected.includes(p.key);
          const copy = providerCopy(p.key, t);
          return (
            <li
              key={p.key}
              className="rounded-lg border border-border-1 bg-paper p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2
                      className="font-serif text-h3 text-ink"
                      style={{ fontWeight: 500 }}
                    >
                      {p.name}
                    </h2>
                    {p.recommended ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
                        {t.onboardingRecommended}
                      </span>
                    ) : null}
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        {t.onboardingConnected}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-body-sm text-text-3">{copy.category}</p>
                  <p className="mt-2 text-body-sm text-text-2">{copy.description}</p>
                  <ul className="mt-3 space-y-1">
                    {copy.unlocks.map((u) => (
                      <li
                        key={u}
                        className="flex items-start gap-2 text-[12px] text-text-2"
                      >
                        <span className="mt-0.5 text-accent">+</span>
                        <span>{u}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {!isConnected ? (
                  <button
                    type="button"
                    onClick={() => setSelected(p.key)}
                    className="shrink-0 rounded-md border border-border-2 px-3 py-2 text-body-sm text-ink hover:border-border-3"
                  >
                    {t.onboardingConnect}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={continueNext}
          disabled={pending || connected.length === 0}
          className="inline-flex h-12 items-center rounded-md bg-ink px-6 text-body font-medium text-paper hover:bg-ink-2 disabled:opacity-50"
        >
          {formatMessage(
            connected.length === 1
              ? t.onboardingContinueWithProviderOne
              : t.onboardingContinueWithProviderMany,
            { count: connected.length },
          )}
        </button>
        {connected.length > 0 ? (
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex h-12 items-center rounded-md border border-border-1 px-6 text-body text-ink"
          >
            {t.onboardingConnectAnother}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void (async () => {
              await fetch("/api/onboarding/step-complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  step: "providers",
                  data: { connectedProviders: connected, demo: true },
                }),
              });
              router.push("/onboarding/first-quote?demo=1");
            })();
          }}
          className="inline-flex h-12 items-center rounded-md px-4 text-body-sm text-text-3 underline-offset-2 hover:underline"
        >
          {t.onboardingContinueDemoNoConnect}
        </button>
      </div>
    </div>
  );
}

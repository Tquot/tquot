"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AgencyMarginCategory } from "@/lib/quotes/build-quote";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useDashboardLanguage } from "../dashboard-language-provider";
import { formatMessage } from "../format-message";
import { LocaleToggleButtons } from "../locale-toggle-buttons";

type MarginField = {
  category: AgencyMarginCategory;
  label: string;
  defaultPercent: number;
};

const MARGIN_FIELDS: MarginField[] = [
  { category: "vuelos", label: "Vuelos", defaultPercent: 8 },
  { category: "hoteles", label: "Hoteles", defaultPercent: 12 },
  { category: "experiencias", label: "Experiencias", defaultPercent: 22 },
  { category: "transfers", label: "Transfers", defaultPercent: 15 },
  { category: "seguros", label: "Seguros", defaultPercent: 20 },
];

const backLinkClass =
  "inline-flex items-center rounded-lg border border-tquot-border bg-tquot-surface px-4 py-2 text-sm text-tquot-muted shadow-sm transition-colors hover:bg-tquot-bg hover:text-tquot-accent";

const inputClass =
  "w-full rounded-xl border border-tquot-border bg-tquot-surface px-4 py-3 pr-10 text-tquot-text outline-none transition-colors focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20";

function defaultMargins(): Record<AgencyMarginCategory, number> {
  return MARGIN_FIELDS.reduce(
    (values, field) => {
      values[field.category] = field.defaultPercent;
      return values;
    },
    {} as Record<AgencyMarginCategory, number>,
  );
}

export default function MarginsPage() {
  const { t } = useDashboardLanguage();
  const [margins, setMargins] = useState(defaultMargins);
  const [isLoading, setIsLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState<AgencyMarginCategory | null>(
    null,
  );
  const [error, setError] = useState("");

  const loadMargins = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated.");
      setIsLoading(false);
      return;
    }

    const { data, error: loadError } = await supabase
      .from("agency_margins")
      .select("category, margin_percent")
      .eq("user_id", user.id);

    if (loadError) {
      setError(loadError.message);
      setIsLoading(false);
      return;
    }

    const next = defaultMargins();
    for (const row of data ?? []) {
      const category = row.category as AgencyMarginCategory;
      if (category in next) {
        next[category] = Number(row.margin_percent);
      }
    }

    setMargins(next);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadMargins();
  }, [loadMargins]);

  async function saveMargin(category: AgencyMarginCategory, marginPercent: number) {
    if (!Number.isFinite(marginPercent) || marginPercent < 0) {
      return;
    }

    setSavingCategory(category);
    setError("");

    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated.");
      setSavingCategory(null);
      return;
    }

    const { error: saveError } = await supabase.from("agency_margins").upsert(
      {
        user_id: user.id,
        category,
        margin_percent: marginPercent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,category" },
    );

    if (saveError) {
      setError(saveError.message);
    }

    setSavingCategory(null);
  }

  function handleMarginChange(category: AgencyMarginCategory, rawValue: string) {
    const marginPercent = Number(rawValue);
    setMargins((current) => ({ ...current, [category]: marginPercent }));

    if (Number.isFinite(marginPercent) && marginPercent >= 0) {
      void saveMargin(category, marginPercent);
    }
  }

  return (
    <div className="min-h-screen px-6 py-10 text-tquot-text">
      <main className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/dashboard" className={backLinkClass}>
            ← {t.backToDashboard}
          </Link>
          <LocaleToggleButtons />
        </div>

        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-tquot-teal">
            TQuot
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-tquot-text sm:text-4xl">
            {t.marginsTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-tquot-muted">{t.marginsSubtitle}</p>
        </section>

        <section className="rounded-xl border border-tquot-border bg-tquot-surface p-6 shadow-md">
          {isLoading ? (
            <p className="text-sm text-tquot-muted">{t.marginsLoading}</p>
          ) : (
            <div className="space-y-5">
              {MARGIN_FIELDS.map((field) => (
                <label key={field.category} className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-tquot-text">
                      {field.label}
                    </span>
                    <span className="text-xs text-tquot-muted">
                      {savingCategory === field.category
                        ? t.marginsSaving
                        : formatMessage(t.marginsDefaultHint, {
                            percent: String(field.defaultPercent),
                          })}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={margins[field.category]}
                      onChange={(event) =>
                        handleMarginChange(field.category, event.target.value)
                      }
                      className={inputClass}
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-tquot-muted">
                      %
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}

          {error ? (
            <p className="mt-4 text-sm font-medium text-tquot-warm">{error}</p>
          ) : null}
        </section>
      </main>
    </div>
  );
}

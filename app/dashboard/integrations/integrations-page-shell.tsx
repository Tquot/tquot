"use client";

import Link from "next/link";
import { Suspense } from "react";
import type {
  AgencyConnectionRow,
  ProviderCatalogRow,
} from "@/lib/connectors/storage";
import { useDashboardLanguage } from "../dashboard-language-provider";
import { IntegrationsClient } from "./components/IntegrationsClient";

const backLinkClass =
  "mb-8 inline-flex items-center rounded-lg border border-tquot-border bg-tquot-surface px-4 py-2 text-sm text-tquot-muted shadow-sm transition-colors hover:bg-tquot-bg hover:text-tquot-accent";

type Props = {
  agencyNotConfigured?: boolean;
  catalog?: (ProviderCatalogRow & { is_implemented_real: boolean })[];
  connections?: AgencyConnectionRow[];
};

export function IntegrationsPageShell({
  agencyNotConfigured = false,
  catalog = [],
  connections = [],
}: Props) {
  const { t } = useDashboardLanguage();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/dashboard" className={backLinkClass}>
        ← {t.backToDashboard}
      </Link>

      {agencyNotConfigured ? (
        <p className="text-sm text-tquot-muted">{t.integrationsAgencyNotConfigured}</p>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-tquot-text">{t.integrations}</h1>
            <p className="mt-1 text-sm text-tquot-muted">{t.integrationsSubtitle}</p>
          </div>

          <Suspense fallback={<div className="text-sm text-tquot-muted">{t.integrationsLoading}</div>}>
            <IntegrationsClient catalog={catalog} connections={connections} />
          </Suspense>
        </>
      )}
    </div>
  );
}

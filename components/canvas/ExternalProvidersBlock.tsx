import { Eyebrow } from "@/components/ui/Eyebrow";
import { ProviderContactCard } from "@/components/quote/ProviderContactCard";
import { buildCacheKey } from "@/lib/recommendations/providers/cache-key";
import { CATEGORY_ES } from "@/lib/recommendations/providers/categories";
import type { ProviderBlock } from "@/lib/recommendations/providers/types";

export function ExternalProvidersBlock({
  block,
  quoteId,
}: {
  block: ProviderBlock;
  quoteId: string;
}) {
  const cacheKey = buildCacheKey(block.category, block.destination);

  return (
    <section className="space-y-3">
      <div>
        <Eyebrow className="block mb-1">
          {CATEGORY_ES[block.category]} · {block.destination}
        </Eyebrow>
        <p className="text-[12px] text-text-2">
          No tienes proveedor conectado para esto. Estos operadores trabajan con
          agencias.
        </p>
      </div>

      {block.providers.length === 0 ? (
        <div className="bg-paper-2 border border-border-1 rounded-lg p-4">
          <p className="text-body-sm text-text-2 leading-relaxed">
            {block.noResultsReason}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {block.providers.map((p) => (
            <ProviderContactCard
              key={p.id}
              provider={p}
              quoteId={quoteId}
              cacheKey={cacheKey}
            />
          ))}
        </div>
      )}
    </section>
  );
}

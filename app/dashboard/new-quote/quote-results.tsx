import type { QuoteItem, QuoteItemSource } from "@/lib/quotes/build-quote";

const sourceStyles: Record<QuoteItemSource, string> = {
  mock: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  inventory: "border-[#00C9A7]/30 bg-[#00C9A7]/10 text-[#00C9A7]",
  api: "border-purple-400/30 bg-purple-400/10 text-purple-300",
};

const TYPE_LABELS: Record<QuoteItem["type"], string> = {
  flight: "Vuelo",
  hotel: "Hotel",
  experience: "Experiencia",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#00C9A7]">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-lg font-bold text-white">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-[#8B9CB3]">{subtitle}</p>
    </div>
  );
}

function QuoteItemCard({ item }: { item: QuoteItem }) {
  return (
    <article className="rounded-3xl border border-white/[0.08] bg-[#03080F]/60 p-4 shadow-[0_16px_44px_rgba(0,0,0,0.24)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8B9CB3]">
              {TYPE_LABELS[item.type]}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${sourceStyles[item.source]}`}
            >
              [{item.source}]
            </span>
          </div>
          <h4 className="font-semibold text-white">{item.title}</h4>
          <p className="mt-1 text-sm text-[#8B9CB3]">{item.provider}</p>
        </div>
        <p className="text-xl font-black text-[#00C9A7]">{formatCurrency(item.finalPrice)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-[#4A6A85]">Base</p>
          <p className="font-semibold text-[#E8EEF7]">{formatCurrency(item.price)}</p>
        </div>
        <div>
          <p className="text-[#4A6A85]">Margen</p>
          <p className="font-semibold text-[#F5C518]">{formatCurrency(item.markup)}</p>
        </div>
        <div className="text-right">
          <p className="text-[#4A6A85]">Cliente</p>
          <p className="font-semibold text-[#00C9A7]">{formatCurrency(item.finalPrice)}</p>
        </div>
      </div>
    </article>
  );
}

export function QuoteItemsSection({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string;
  title: string;
  items: QuoteItem[];
}) {
  return (
    <section>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        subtitle={`${items.length} línea${items.length === 1 ? "" : "s"} · cotización determinista`}
      />
      <div className="space-y-3">
        {items.map((item) => (
          <QuoteItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

import type { QuoteItem, QuoteItemSource } from "@/lib/quotes/build-quote";
import { getItemMarginPercent, getQuoteSelectionGroup } from "@/lib/quotes/build-quote";

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

function QuoteItemCard({
  item,
  onSelect,
  onMarginChange,
}: {
  item: QuoteItem;
  onSelect?: (itemId: string) => void;
  onMarginChange?: (itemId: string, marginPercent: number) => void;
}) {
  const selectionGroup = getQuoteSelectionGroup(item.id);
  const isSelectable = selectionGroup !== null && Boolean(onSelect);
  const isSelected = isSelectable && !item.alternative;
  const marginPercent = getItemMarginPercent(item);

  return (
    <article
      role={isSelectable ? "button" : undefined}
      tabIndex={isSelectable && !isSelected ? 0 : undefined}
      onClick={() => {
        if (isSelectable && !isSelected) {
          onSelect?.(item.id);
        }
      }}
      onKeyDown={(event) => {
        if (
          isSelectable &&
          !isSelected &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          onSelect?.(item.id);
        }
      }}
      className={`rounded-3xl border bg-[#03080F]/60 p-4 shadow-[0_16px_44px_rgba(0,0,0,0.24)] transition-all ${
        isSelected
          ? "border-[#00C9A7]/55 ring-1 ring-[#00C9A7]/35"
          : isSelectable
            ? "cursor-pointer border-white/[0.08] hover:border-[#00C9A7]/25"
            : "border-white/[0.08]"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8B9CB3]">
              {TYPE_LABELS[item.type]}
            </span>
            {isSelectable ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  isSelected
                    ? "border-[#00C9A7]/40 bg-[#00C9A7]/15 text-[#00C9A7]"
                    : "border-amber-400/30 bg-amber-400/10 text-amber-200"
                }`}
              >
                {isSelected ? "Incluido" : "Alternativa"}
              </span>
            ) : null}
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${sourceStyles[item.source]}`}
            >
              [{item.source}]
            </span>
          </div>
          <h4 className="font-semibold text-white">{item.title}</h4>
          <p className="mt-1 text-sm text-[#8B9CB3]">{item.provider}</p>
        </div>
        <p
          className={`text-xl font-black ${isSelected || !isSelectable ? "text-[#00C9A7]" : "text-[#8B9CB3]"}`}
        >
          {formatCurrency(item.finalPrice)}
        </p>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
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

      <div className="flex flex-wrap items-end gap-3">
        {onMarginChange ? (
          <label className="flex min-w-[7rem] flex-col gap-1 text-xs">
            <span className="text-[#4A6A85]">Margen %</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={marginPercent}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  onMarginChange(item.id, Number.isFinite(next) ? next : 0);
                }}
                onClick={(event) => event.stopPropagation()}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-[#00C9A7]/50"
              />
              <span className="text-[#8B9CB3]">%</span>
            </div>
          </label>
        ) : null}

        {isSelectable ? (
          <button
            type="button"
            onClick={() => onSelect?.(item.id)}
            disabled={isSelected}
            className={`ml-auto rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              isSelected
                ? "cursor-default border border-[#00C9A7]/30 bg-[#00C9A7]/10 text-[#00C9A7]"
                : "border border-white/10 bg-white/[0.06] text-[#E8EEF7] hover:border-[#00C9A7]/40 hover:text-[#00C9A7]"
            }`}
          >
            {isSelected ? "Seleccionado" : "Usar en cotización"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function QuoteItemsSection({
  eyebrow,
  title,
  items,
  onSelectItem,
  onMarginChange,
}: {
  eyebrow: string;
  title: string;
  items: QuoteItem[];
  onSelectItem?: (itemId: string) => void;
  onMarginChange?: (itemId: string, marginPercent: number) => void;
}) {
  const selectableCount = items.filter((item) => getQuoteSelectionGroup(item.id)).length;
  const includedCount = items.filter(
    (item) => getQuoteSelectionGroup(item.id) && !item.alternative,
  ).length;

  return (
    <section>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        subtitle={
          selectableCount > 0
            ? `${includedCount} incluido(s) · ${items.length} opción${items.length === 1 ? "" : "es"}`
            : `${items.length} línea${items.length === 1 ? "" : "s"}`
        }
      />
      <div className="space-y-3">
        {items.map((item) => (
          <QuoteItemCard
            key={item.id}
            item={item}
            onSelect={onSelectItem}
            onMarginChange={onMarginChange}
          />
        ))}
      </div>
    </section>
  );
}

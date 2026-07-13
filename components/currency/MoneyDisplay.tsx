"use client";

interface Props {
  amount: number;
  currency: string;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  rateAt?: string;
  compact?: boolean;
  /** Suffix after the amount, e.g. "/noche" */
  suffix?: string;
  className?: string;
}

export function MoneyDisplay({
  amount,
  currency,
  originalAmount,
  originalCurrency,
  exchangeRate,
  rateAt,
  compact = false,
  suffix,
  className,
}: Props) {
  const hasOriginal =
    Boolean(originalCurrency) &&
    originalCurrency!.toUpperCase() !== currency.toUpperCase();

  const main = (
    <span className={className}>
      {Math.round(amount).toLocaleString("es-ES")} {symbolOf(currency)}
      {suffix ? suffix : null}
    </span>
  );

  if (!hasOriginal || compact) return main;

  const tooltip = `Precio original: ${originalAmount?.toLocaleString("es-ES")} ${symbolOf(
    originalCurrency!,
  )} · 1 ${originalCurrency} = ${exchangeRate?.toFixed(4) ?? "?"} ${currency}${
    rateAt ? ` · ${new Date(rateAt).toLocaleDateString("es-ES")}` : ""
  }`;

  return (
    <span className="inline-flex items-center gap-1" title={tooltip}>
      {main}
      <span className="text-[10px] text-neutral-400" aria-hidden>
        ⓘ
      </span>
    </span>
  );
}

export function symbolOf(currency: string): string {
  return (
    (
      {
        EUR: "€",
        USD: "$",
        GBP: "£",
        JPY: "¥",
        CHF: "CHF",
        MXN: "MX$",
        ARS: "AR$",
        BRL: "R$",
        CNY: "¥",
        AUD: "A$",
      } as Record<string, string>
    )[currency.toUpperCase()] ?? currency.toUpperCase()
  );
}

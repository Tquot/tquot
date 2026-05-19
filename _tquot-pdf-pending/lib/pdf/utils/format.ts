/**
 * Formateadores para los PDFs.
 *
 * Usamos Intl con locale es-ES por defecto. Si en el futuro hay agencias en
 * otros locales, pasar el locale por argumento.
 */

const DEFAULT_LOCALE = "es-ES";

export function formatCurrency(
  amount: number,
  currency: "EUR" | "USD" | "GBP" = "EUR",
  locale: string = DEFAULT_LOCALE
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(isoDate: string, locale: string = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(isoDate));
}

export function formatDateShort(isoDate: string, locale: string = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(isoDate));
}

export function formatPercent(value: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function formatDateRange(
  startIso: string,
  endIso: string,
  locale: string = DEFAULT_LOCALE
): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    const startDay = start.getDate();
    const endFmt = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(end);
    return `${startDay} – ${endFmt}`;
  }

  return `${formatDate(startIso, locale)} – ${formatDate(endIso, locale)}`;
}

export function formatPaxCount(adults: number, children: number, infants: number): string {
  const parts: string[] = [];
  parts.push(`${adults} ${adults === 1 ? "adulto" : "adultos"}`);
  if (children > 0) parts.push(`${children} ${children === 1 ? "niño" : "niños"}`);
  if (infants > 0) parts.push(`${infants} ${infants === 1 ? "bebé" : "bebés"}`);
  return parts.join(", ");
}

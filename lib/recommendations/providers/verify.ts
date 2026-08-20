import { parsePhoneNumberFromString } from "libphonenumber-js";
import type {
  RawProvider,
  ExternalProvider,
  ProviderCategory,
  FieldConfidence,
} from "./types";
import { sanitizeAccessibleCopy } from "./terminology";

/** Dominios que nunca son el sitio oficial de un operador local. */
const BLOCKED_DOMAINS = [
  "tripadvisor",
  "getyourguide",
  "viator",
  "civitatis",
  "klook",
  "musement",
  "expedia",
  "booking.com",
  "airbnb",
  "facebook",
  "instagram",
  "linkedin",
  "twitter",
  "x.com",
  "youtube",
  "paginasamarillas",
  "yelp",
  "google.com",
  "wikipedia",
  "blogspot",
  "wordpress.com",
  "wixsite",
  "sites.google",
  "empresite",
  "axesor",
  "infocif",
  "einforma",
];

/** Correos gratuitos: válidos para un operador pequeño, pero bajan la confianza. */
const FREE_MAIL = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "yahoo.es",
  "icloud.com",
  "live.com",
];

/** Patrones de teléfono de plantilla o de ejemplo. */
const FAKE_PHONE = [
  /x{3,}/i,
  /\b0{6,}\b/,
  /\b123\s?456\s?789\b/,
  /\b(\d)\1{6,}\b/, // 111111111
  /\b555\s?\d{4}\b/, // teléfonos de ficción estadounidenses
];

export interface VerifyOpts {
  destination: string;
  /** ISO-2 del país del destino, para validar el teléfono. */
  countryCode: string | null;
}

export function verifyProvider(
  raw: RawProvider,
  category: ProviderCategory,
  opts: VerifyOpts,
): ExternalProvider | null {
  // ── Web: obligatoria ────────────────────────────────────────
  const site = normalizeUrl(raw.website.value);
  if (!site) return null;
  if (isBlocked(site.hostname)) return null;

  // La fuente de la web debe ser la web misma o una búsqueda que apunte a ella
  const siteSource = normalizeUrl(raw.website.source_url);
  if (!siteSource) return null;

  const baseDomain = registrableDomain(site.hostname);

  // ── Email ───────────────────────────────────────────────────
  let email: ExternalProvider["email"] = null;
  if (raw.email) {
    const value = raw.email.value.trim().toLowerCase();
    const src = normalizeUrl(raw.email.source_url);
    const emailDomain = value.split("@")[1] ?? "";

    const shapeOk = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(value);
    // La fuente tiene que ser el propio sitio del proveedor
    const sourceOk =
      !!src &&
      registrableDomain(src.hostname) === baseDomain &&
      !isBlocked(src.hostname);

    if (shapeOk && sourceOk) {
      const sameDomain = registrableDomain(emailDomain) === baseDomain;
      const isFree = FREE_MAIL.includes(emailDomain);
      // Dominio propio → verificado. Correo gratuito leído en su web → probable.
      // Dominio de un tercero → se descarta: casi siempre es una confusión.
      if (sameDomain) {
        email = { value, sourceUrl: src!.href, confidence: "verified" };
      } else if (isFree) {
        email = { value, sourceUrl: src!.href, confidence: "probable" };
      }
    }
  }

  // ── Teléfono ────────────────────────────────────────────────
  let phone: ExternalProvider["phone"] = null;
  if (raw.phone) {
    const rawValue = raw.phone.value.trim();
    const src = normalizeUrl(raw.phone.source_url);
    const sourceOk =
      !!src &&
      registrableDomain(src.hostname) === baseDomain &&
      !isBlocked(src.hostname);
    const looksFake = FAKE_PHONE.some((re) => re.test(rawValue));

    if (sourceOk && !looksFake) {
      const parsedPhone = parsePhoneNumberFromString(
        rawValue,
        (opts.countryCode as any) ?? "ES",
      );
      if (parsedPhone?.isValid()) {
        phone = {
          value: parsedPhone.formatInternational(),
          sourceUrl: src!.href,
          confidence: "verified",
        };
      }
    }
  }

  // ── Confianza agregada ──────────────────────────────────────
  // Sin ningún canal de contacto, el proveedor aporta poco: se descarta.
  if (!email && !phone) return null;

  const trust: FieldConfidence =
    email?.confidence === "verified" && phone?.confidence === "verified"
      ? "verified"
      : email || phone
        ? "probable"
        : "unverified";

  let description = raw.description.trim();
  let signals = raw.signals.filter((s) => s.trim().length > 0).slice(0, 3);
  if (category === "accessible") {
    description = sanitizeAccessibleCopy(description);
    signals = signals.map(sanitizeAccessibleCopy);
  }

  return {
    id: `${category}:${baseDomain}`,
    category,
    destination: opts.destination,
    name: raw.name.trim(),
    description,
    website: {
      value: site.href,
      sourceUrl: siteSource.href,
      confidence: "verified",
    },
    email,
    phone,
    serviceArea: raw.service_area?.trim() ?? null,
    signals,
    checkedAt: new Date().toISOString(),
    trust,
  };
}

export function verifyAll(
  raws: RawProvider[],
  category: ProviderCategory,
  opts: VerifyOpts,
): ExternalProvider[] {
  const out: ExternalProvider[] = [];
  const seen = new Set<string>();
  for (const raw of raws) {
    const v = verifyProvider(raw, category, opts);
    if (!v) continue;
    if (seen.has(v.id)) continue; // mismo dominio dos veces
    seen.add(v.id);
    out.push(v);
  }
  return out.slice(0, 2);
}

// ── Utilidades ────────────────────────────────────────────────

function normalizeUrl(value: string): URL | null {
  try {
    const u = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u;
  } catch {
    return null;
  }
}

function isBlocked(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return BLOCKED_DOMAINS.some((b) => h === b || h.includes(b));
}

/** ejemplo.co.uk → ejemplo.co.uk · www.ejemplo.com → ejemplo.com */
function registrableDomain(hostname: string): string {
  const parts = hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .split(".");
  if (parts.length <= 2) return parts.join(".");
  const twoLevelTlds = [
    "co.uk",
    "com.au",
    "co.jp",
    "com.br",
    "com.mx",
    "com.ar",
    "co.nz",
  ];
  const lastTwo = parts.slice(-2).join(".");
  if (twoLevelTlds.includes(lastTwo)) return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}

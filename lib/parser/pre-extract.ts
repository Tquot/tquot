import {
  TOP_DESTINATIONS,
  lookupDestination,
  normalizePlace,
} from "./destinations";

export interface Hints {
  dates: Array<{
    from?: string;
    to?: string;
    month?: number;
    year?: number;
    raw: string;
  }>;
  nights?: { value: number; raw: string };
  adults?: { value: number; raw: string };
  children?: { ages: number[]; count: number; raw: string };
  budget?: {
    amount: number;
    currency: string;
    per: "person" | "total";
    raw: string;
  };
  places: Array<{ name: string; raw: string }>;
  board?: { code: string; raw: string };
  category?: { stars: number; raw: string };
  flags: string[];
}

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dic: 12,
};

export function preExtract(text: string): Hints {
  const t = text.toLowerCase();
  const hints: Hints = { dates: [], places: [], flags: [] };

  // ── Fechas ────────────────────────────────────────────────────

  const rangeWithMonth = t.match(
    /\bdel?\s*(\d{1,2})\s*(?:al?|[-–a])\s*(\d{1,2})\s*(?:de\s+)?([a-záéíóú]+)(?:\s*(?:de\s*)?(\d{4}|\d{2}))?/,
  );
  if (rangeWithMonth) {
    const month = MONTHS[rangeWithMonth[3]];
    if (month) {
      const year = resolveYear(rangeWithMonth[4], month);
      hints.dates.push({
        from: iso(year, month, parseInt(rangeWithMonth[1], 10)),
        to: iso(year, month, parseInt(rangeWithMonth[2], 10)),
        month,
        year,
        raw: rangeWithMonth[0],
      });
    }
  }

  const numericRange = t.match(
    /\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\s*(?:al?|[-–a])\s*(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/,
  );
  if (numericRange && hints.dates.length === 0) {
    const m1 = parseInt(numericRange[2], 10);
    const y1 = resolveYear(numericRange[3], m1);
    const m2 = parseInt(numericRange[5], 10);
    const y2 = resolveYear(numericRange[6], m2);
    hints.dates.push({
      from: iso(y1, m1, parseInt(numericRange[1], 10)),
      to: iso(y2, m2, parseInt(numericRange[4], 10)),
      month: m1,
      year: y1,
      raw: numericRange[0],
    });
  }

  if (hints.dates.length === 0) {
    for (const [name, num] of Object.entries(MONTHS)) {
      if (name.length < 3) continue;
      const re = new RegExp(`\\b(?:en|para|de|el mes de)?\\s*${name}\\b`);
      const m = t.match(re);
      if (m) {
        hints.dates.push({
          month: num,
          year: resolveYear(undefined, num),
          raw: m[0].trim(),
        });
        break;
      }
    }
  }

  const relative: Array<[RegExp, () => { month: number; year: number }]> = [
    [/\bsemana santa\b/, () => easterWeek()],
    [
      /\bnavidad(es)?\b/,
      () => ({ month: 12, year: resolveYear(undefined, 12) }),
    ],
    [
      /\bnochevieja|fin de a[nñ]o\b/,
      () => ({ month: 12, year: resolveYear(undefined, 12) }),
    ],
    [/\bpuente de mayo\b/, () => ({ month: 5, year: resolveYear(undefined, 5) })],
    [
      /\bpuente del pilar\b/,
      () => ({ month: 10, year: resolveYear(undefined, 10) }),
    ],
    [/\bverano\b/, () => ({ month: 7, year: resolveYear(undefined, 7) })],
  ];
  if (hints.dates.length === 0) {
    for (const [re, fn] of relative) {
      const m = t.match(re);
      if (m) {
        const { month, year } = fn();
        hints.dates.push({ month, year, raw: m[0] });
        break;
      }
    }
  }

  // ── Noches / días ─────────────────────────────────────────────
  const nightsMatch = t.match(/\b(\d{1,2})\s*(noches?|d[ií]as?)\b/);
  if (nightsMatch) {
    const n = parseInt(nightsMatch[1], 10);
    const isNights = /noche/.test(nightsMatch[2]);
    hints.nights = {
      value: isNights ? n : Math.max(1, n - 1),
      raw: nightsMatch[0],
    };
  }
  if (/\bfin de semana\b/.test(t) && !hints.nights) {
    hints.nights = { value: 2, raw: "fin de semana" };
  }
  if (/\bpuente\b/.test(t) && !hints.nights) {
    hints.nights = { value: 3, raw: "puente" };
  }
  if (/\b(una|1)\s*semana\b/.test(t) && !hints.nights) {
    hints.nights = { value: 7, raw: "una semana" };
  }
  if (/\bquince d[ií]as|dos semanas\b/.test(t) && !hints.nights) {
    hints.nights = { value: 14, raw: "dos semanas" };
  }

  // ── Viajeros ──────────────────────────────────────────────────

  const childAges = [
    ...t.matchAll(
      /\b(?:ni[nñ]os?|peques?|cr[ií]os?|hijos?|menores?)\s*(?:de\s*)?((?:\d{1,2}(?:\s*(?:,|y|e)\s*)?)+)\s*(?:a[nñ]os?)?/g,
    ),
  ];
  const ages: number[] = [];
  for (const m of childAges) {
    for (const num of m[1].match(/\d{1,2}/g) ?? []) {
      const age = parseInt(num, 10);
      if (age >= 0 && age <= 17) ages.push(age);
    }
  }
  const childCount = t.match(
    /\b(\d{1,2}|un|una|dos|tres|cuatro)\s*(ni[nñ]os?|peques?|menores?)\b/,
  );
  if (ages.length > 0) {
    hints.children = {
      ages,
      count: ages.length,
      raw: childAges.map((m) => m[0]).join("; "),
    };
  } else if (childCount) {
    hints.children = {
      ages: [],
      count: word2num(childCount[1]),
      raw: childCount[0],
    };
  }

  const adultsMatch = t.match(
    /\b(\d{1,2}|un|una|dos|tres|cuatro|cinco|seis|siete|ocho)\s*(adultos?|mayores?)\b/,
  );
  if (adultsMatch) {
    hints.adults = { value: word2num(adultsMatch[1]), raw: adultsMatch[0] };
  } else {
    const peopleMatch = t.match(
      /\b(?:somos\s*|para\s*|)(\d{1,2})\s*(personas?|pax|viajeros?)\b/,
    );
    if (peopleMatch) {
      const total = parseInt(peopleMatch[1], 10);
      const kids = hints.children?.count ?? 0;
      hints.adults = {
        value: Math.max(1, total - kids),
        raw: peopleMatch[0],
      };
    } else if (/\bpareja|mi mujer|mi marido|novi[ao]\b/.test(t)) {
      hints.adults = { value: 2, raw: "pareja" };
    } else if (/\bfamilia\b/.test(t) && hints.children) {
      hints.adults = { value: 2, raw: "familia" };
    }
  }

  // ── Presupuesto ───────────────────────────────────────────────
  const budgetMatch = t.match(
    /(?:presupuesto|m[aá]ximo|max|sobre|unos|around|hasta|no m[aá]s de|gastar)?\s*(\d{1,3}(?:[.\s]\d{3})*|\d+)\s*(?:€|eur(?:os)?)\s*(?:\/\s*|por\s+|p\.?\s?p\.?|)(persona|pax|cabeza|total|todo)?/,
  );
  if (budgetMatch) {
    const amount = parseInt(budgetMatch[1].replace(/[.\s]/g, ""), 10);
    if (amount >= 100 && amount <= 100_000) {
      const perRaw = budgetMatch[2] ?? "";
      const per = /persona|pax|cabeza|p\.?p\.?/.test(perRaw)
        ? ("person" as const)
        : ("total" as const);
      hints.budget = {
        amount,
        currency: "EUR",
        per,
        raw: budgetMatch[0].trim(),
      };
    }
  }

  // ── Régimen ───────────────────────────────────────────────────
  const boardPatterns: Array<[RegExp, string]> = [
    [/\btodo incluido|all inclusive\b/, "TI"],
    [/\bpensi[oó]n completa\b/, "PC"],
    [/\bmedia pensi[oó]n\b/, "MP"],
    [/\b(con\s+)?desayuno(\s+incluido)?\b/, "AD"],
    [/\bsolo alojamiento|sin desayuno\b/, "SA"],
  ];
  for (const [re, code] of boardPatterns) {
    const m = t.match(re);
    if (m) {
      hints.board = { code, raw: m[0] };
      break;
    }
  }

  // ── Categoría ─────────────────────────────────────────────────
  const starsMatch = t.match(/\b([2345])\s*(?:estrellas?|\*|estrella)\b/);
  if (starsMatch) {
    hints.category = {
      stars: parseInt(starsMatch[1], 10),
      raw: starsMatch[0],
    };
  } else if (/\blujo|lujoso|5 ?\*|gran lujo\b/.test(t)) {
    hints.category = { stars: 5, raw: "lujo" };
  } else if (/\bbarato|econ[oó]mico|low cost|ajustado de precio\b/.test(t)) {
    hints.category = { stars: 3, raw: "económico" };
  }

  // ── Flags de contexto ─────────────────────────────────────────
  const flagPatterns: Array<[RegExp, string]> = [
    [/\bplaya|primera l[ií]nea|frente al mar|beach\b/, "beach"],
    [
      /\bluna de miel|honeymoon|reci[eé]n casados|viaje de novios\b/,
      "honeymoon",
    ],
    [
      /\bgrupo|incentivo|empresa|congreso|convenci[oó]n|\b(1\d|[2-9]\d)\s*personas\b/,
      "group",
    ],
    [/\bsilla de ruedas|accesible|movilidad reducida|pmr\b/, "accessible"],
    [/\btodo incluido|all inclusive\b/, "allInclusive"],
    [/\bc[eé]ntrico|centro|casco antiguo\b/, "central"],
    [/\bfamiliar|con ni[nñ]os|kids club\b/, "family"],
    [/\bescapada|escapadita\b/, "shortBreak"],
  ];
  for (const [re, flag] of flagPatterns) {
    if (re.test(t)) hints.flags.push(flag);
  }

  hints.places = extractPlaceCandidates(text);

  return hints;
}

export function resolveYear(
  raw: string | undefined,
  month: number,
): number {
  const now = new Date();
  if (raw) {
    const n = parseInt(raw, 10);
    return n < 100 ? 2000 + n : n;
  }
  const y = now.getFullYear();
  return month < now.getMonth() + 1 ? y + 1 : y;
}

export function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function word2num(w: string): number {
  const map: Record<string, number> = {
    un: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
  };
  return map[w] ?? parseInt(w, 10) ?? 1;
}

/** Computus — Domingo de Pascua gregoriano. Semana Santa ≈ mes de Pascua. */
export function easterWeek(year = new Date().getFullYear()): {
  month: number;
  year: number;
} {
  const y = year;
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  // Si Pascua ya pasó este año, usar el siguiente
  const now = new Date();
  const easter = new Date(y, month - 1, day);
  if (easter < now) return easterWeek(y + 1);
  return { month, year: y };
}

const DESTINATION_ENTRIES: Array<[string, string]> = (() => {
  const map = new Map<string, string>();
  for (const name of TOP_DESTINATIONS) {
    const key = normalizePlace(name);
    if (!map.has(key)) map.set(key, name);
  }
  return [...map.entries()].sort((a, b) => b[0].length - a[0].length);
})();

export function extractPlaceCandidates(
  text: string,
): Array<{ name: string; raw: string }> {
  const found: Array<{ name: string; raw: string }> = [];
  const seen = new Set<string>();
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  for (const [norm, canonical] of DESTINATION_ENTRIES) {
    if (norm.length < 3) continue;
    const re = new RegExp(`\\b${escapeRegExp(norm)}\\b`, "i");
    const m = lower.match(re);
    if (!m) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    found.push({ name: canonical, raw: m[0] });
  }

  // Capitalized tokens not in the list still help the model (via places hint)
  const tokens =
    text.match(
      /[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+){0,2}/g,
    ) ?? [];
  for (const token of tokens) {
    const hit = lookupDestination(token);
    if (!hit) continue;
    const key = normalizePlace(hit);
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ name: hit, raw: token });
  }

  return found;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

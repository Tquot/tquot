export type QuoteStatus =
  | "draft"
  | "sent"
  | "confirmed"
  | "accepted"
  | "in_progress"
  | "reserved"
  | "cancelled"
  | "expired";

const TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["confirmed", "accepted", "cancelled", "expired"],
  confirmed: ["accepted", "cancelled"],
  accepted: ["in_progress", "reserved", "cancelled"],
  in_progress: ["reserved", "cancelled"],
  reserved: ["cancelled"],
  cancelled: [],
  expired: ["sent"],
};

export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAllowedTransitions(from: QuoteStatus): QuoteStatus[] {
  return TRANSITIONS[from] ?? [];
}

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  confirmed: "Confirmada",
  accepted: "Aceptada",
  in_progress: "En reserva",
  reserved: "Reservada",
  cancelled: "Cancelada",
  expired: "Caducada",
};

/** Colores del chip de estado en el selector y listados. */
export const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: "bg-paper-2 text-text-2",
  sent: "bg-sky-100 text-sky-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  accepted: "bg-green-100 text-green-800",
  in_progress: "bg-amber-100 text-amber-800",
  reserved: "bg-orange-100 text-orange-900",
  cancelled: "bg-red-100 text-red-800",
  expired: "bg-yellow-100 text-yellow-800",
};

export const STATUS_BADGE_TONE: Record<
  QuoteStatus,
  "neutral" | "info" | "success" | "umber" | "danger" | "warning"
> = {
  draft: "neutral",
  sent: "info",
  confirmed: "success",
  accepted: "success",
  in_progress: "warning",
  reserved: "umber",
  cancelled: "danger",
  expired: "warning",
};

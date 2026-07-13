export type QuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "reserved"
  | "cancelled"
  | "expired";

const TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["accepted", "cancelled", "expired"],
  accepted: ["reserved", "cancelled"],
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
  accepted: "Aceptada",
  reserved: "Reservada",
  cancelled: "Cancelada",
  expired: "Caducada",
};

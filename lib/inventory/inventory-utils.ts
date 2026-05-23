export function normalizeInventoryPlace(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function resolveInventoryNetPrice(data: Record<string, string>): number {
  const raw = data.price_net ?? data.netPrice ?? "";
  const parsed = Number.parseFloat(String(raw).replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

export function resolveInventoryProvider(data: Record<string, string>): string {
  return (
    data.provider?.trim() ||
    data.supplier?.trim() ||
    "Inventario propio"
  );
}

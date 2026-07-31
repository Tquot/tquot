/** Same thousands style as the canvas (`toLocaleString("es-ES")`). */
export function fmtEur(n: number): string {
  return `${Math.round(n).toLocaleString("es-ES")} €`;
}

export function fmtAmount(n: number): string {
  return Math.round(n).toLocaleString("es-ES");
}

export function legNights(arrivalDate: string, departureDate: string): number {
  const arr = new Date(arrivalDate).getTime();
  const dep = new Date(departureDate).getTime();
  if (!Number.isFinite(arr) || !Number.isFinite(dep) || dep <= arr) return 1;
  return Math.max(1, Math.round((dep - arr) / 86_400_000));
}

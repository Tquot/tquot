/** Parse free-text duration (ES/EN) into hours, or null if unset/unparseable. */
export function parseDurationHours(value: string | undefined): number | null {
  if (!value?.trim()) return null;

  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (
    /(dia completo|full day|jornada completa|todo el dia|all day)/.test(
      normalized,
    )
  ) {
    return 8;
  }

  if (/(medio dia|half day)/.test(normalized)) {
    return 4;
  }

  const hourMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hour|hours|hora|horas)\b/);
  if (hourMatch) {
    const hours = Number.parseFloat(hourMatch[1].replace(",", "."));
    return Number.isFinite(hours) ? hours : null;
  }

  const bareNumber = normalized.match(/^(\d+(?:[.,]\d+)?)$/);
  if (bareNumber) {
    const hours = Number.parseFloat(bareNumber[1].replace(",", "."));
    return Number.isFinite(hours) ? hours : null;
  }

  return null;
}

export function matchesExperienceDurationForTrip(
  durationHours: number | null,
  durationDays: number,
): boolean {
  if (durationDays <= 3) {
    return durationHours === null || durationHours <= 4;
  }
  if (durationDays <= 7) {
    return durationHours === null || durationHours < 8;
  }
  return true;
}

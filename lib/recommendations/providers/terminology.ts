export function sanitizeAccessibleCopy(text: string): string {
  return text
    .replace(/\bdiversidad funcional\b/gi, "personas con discapacidad")
    .replace(/\bdiscapacitados\b/gi, "personas con discapacidad")
    .replace(/\badaptado\b/gi, "accesible")
    .replace(/\binclusi[oó]n\b/gi, "igualdad de oportunidades");
}

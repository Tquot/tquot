/**
 * ─────────────────────────────────────────────────────────────
 *  TQuot — Sistema de tema premium para PDFs
 * ─────────────────────────────────────────────────────────────
 *
 *  Toda la marca visual de los PDFs vive aquí.
 *  Cambia un valor, cambia toda la marca.
 *
 *  Filosofía:
 *  - Oscuro pero no plano. Negro absoluto = barato. Usamos azul-tinta profundo.
 *  - Un acento dorado para detalles premium (separadores, números, iconos).
 *  - Tipografía serif para títulos (carácter editorial), sans elegante para cuerpo.
 *  - Espaciados generosos. El lujo se nota en el aire entre elementos.
 */

// ─────────────────────────────────────────────────────────────
// Paleta
// ─────────────────────────────────────────────────────────────

export const colors = {
  // Fondos
  ink: "#0B1220",          // Azul tinta profundo - fondo principal cliente
  inkSoft: "#141C2F",      // Para tarjetas internas
  inkLight: "#1E2A44",     // Bordes y separadores oscuros
  paper: "#FAF8F3",        // Crema cálido - fondo cliente alternativo y agente
  paperSoft: "#F2EFE7",    // Crema más cálido para zonas internas

  // Texto
  textOnDark: "#F5F2EA",   // Crema claro sobre oscuro
  textOnDarkMuted: "#A8B0C2",
  textOnLight: "#1A1F2E",
  textOnLightMuted: "#5C6478",

  // Acentos
  gold: "#C9A961",         // Dorado champagne, no chillón
  goldSoft: "#E8D4A4",
  accent: "#3D5A80",       // Azul polvo para llamadas de atención sutiles

  // Funcionales
  success: "#5B8A6B",
  warning: "#C97B3D",
  danger: "#A14848",

  // Marcadores de fuente (solo PDF agente)
  sourceInvProprio: "#5B8A6B",    // Verde - producto propio
  sourceCorporativo: "#3D5A80",   // Azul - tarifa corporativa
  sourceWeb: "#8B7355",            // Marrón - precio web público
} as const;

// ─────────────────────────────────────────────────────────────
// Tipografía
// ─────────────────────────────────────────────────────────────
//
// Usamos Google Fonts vía Font.register en fonts.ts.
// Cormorant Garamond: serif de carácter editorial para títulos.
// Inter: sans neutro y legible para cuerpo (excepción justificada al consejo
// general de evitar Inter — en PDF a tamaño pequeño rinde mejor que alternativas).
//

export const fonts = {
  display: "CormorantGaramond",
  body: "Inter",
  mono: "Courier",
} as const;

export const fontSize = {
  micro: 7,
  tiny: 8,
  small: 9,
  base: 10,
  body: 11,
  lead: 13,
  h4: 14,
  h3: 18,
  h2: 24,
  h1: 32,
  hero: 44,
} as const;

export const fontWeight = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// ─────────────────────────────────────────────────────────────
// Espaciado (sistema de 4pt)
// ─────────────────────────────────────────────────────────────

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

// ─────────────────────────────────────────────────────────────
// Composición de página
// ─────────────────────────────────────────────────────────────

export const page = {
  // A4 en puntos: 595.28 × 841.89
  width: 595.28,
  height: 841.89,

  // Márgenes diferenciados
  client: {
    paddingTop: 0,    // El cliente quiere edge-to-edge con cabecera de marca
    paddingBottom: 56,
    paddingX: 48,
  },
  agent: {
    paddingTop: 36,
    paddingBottom: 56,
    paddingX: 44,
  },
} as const;

// ─────────────────────────────────────────────────────────────
// Bordes y radios
// ─────────────────────────────────────────────────────────────

export const radius = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 6,
  xl: 10,
} as const;

export const borderWidth = {
  hair: 0.5,
  thin: 1,
  medium: 1.5,
  thick: 2,
} as const;

// ─────────────────────────────────────────────────────────────
// Etiquetas de fuente (PDF agente)
// ─────────────────────────────────────────────────────────────

export const sourceLabels = {
  INV_PROPIO: {
    label: "[INV-PROPIO]",
    color: colors.sourceInvProprio,
    description: "Inventario propio de la agencia",
  },
  CORPORATIVO: {
    label: "[CORPORATIVO]",
    color: colors.sourceCorporativo,
    description: "Tarifa corporativa negociada",
  },
  WEB: {
    label: "[WEB]",
    color: colors.sourceWeb,
    description: "Precio público web",
  },
} as const;

export type PriceSource = keyof typeof sourceLabels;

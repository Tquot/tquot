/**
 * Registro de fuentes para @react-pdf/renderer.
 *
 * Importante: en runtime serverless de Vercel las fuentes deben ser
 * accesibles vía HTTPS. Usamos Google Fonts directamente.
 *
 * Si tu agencia necesita una tipografía propia, hospédala en Supabase Storage
 * y pasa la URL pública aquí.
 */

import { Font } from "@react-pdf/renderer";

let fontsRegistered = false;

export function registerFonts() {
  if (fontsRegistered) return;

  // Cormorant Garamond — serif editorial para títulos
  Font.register({
    family: "CormorantGaramond",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmX5slCNuHLi8bLeY9MK7whWMhyjornFLsS6V7w.ttf",
        fontWeight: 300,
      },
      {
        src: "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3YmX5slCNuHLi8bLeY9MK7whWMhyjQEHIvMQ.ttf",
        fontWeight: 400,
      },
      {
        src: "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmX5slCNuHLi8bLeY9MK7whWMhyjor3FNsS6V7w.ttf",
        fontWeight: 500,
      },
      {
        src: "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmX5slCNuHLi8bLeY9MK7whWMhyjorrFKsS6V7w.ttf",
        fontWeight: 600,
      },
      {
        src: "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmX5slCNuHLi8bLeY9MK7whWMhyjorbFIsS6V7w.ttf",
        fontWeight: 700,
      },
    ],
  });

  // Inter — sans neutro y legible para cuerpo
  Font.register({
    family: "Inter",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.ttf",
        fontWeight: 400,
      },
      {
        src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7SUc.ttf",
        fontWeight: 500,
      },
      {
        src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.ttf",
        fontWeight: 600,
      },
      {
        src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.ttf",
        fontWeight: 700,
      },
    ],
  });

  // Desactivar guiones automáticos: en PDF de propuesta queda mejor sin ellos
  Font.registerHyphenationCallback((word: string) => [word]);

  fontsRegistered = true;
}

/**
 * Registro de fuentes para @react-pdf/renderer.
 *
 * Títulos y cuerpo usan fuentes PDF built-in (Helvetica, Helvetica-Bold, Courier).
 * No se descargan fuentes externas en runtime.
 */

import { Font } from "@react-pdf/renderer";

let fontsRegistered = false;

export function registerFonts() {
  if (fontsRegistered) return;

  // Desactivar guiones automáticos: en PDF de propuesta queda mejor sin ellos
  Font.registerHyphenationCallback((word: string) => [word]);

  fontsRegistered = true;
}

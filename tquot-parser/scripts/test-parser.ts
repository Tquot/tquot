/**
 * Script de prueba del parser sin levantar Next.
 *
 * Uso:
 *   pnpm test:parser
 *
 * Edita TEST_INPUT abajo o pasa un argumento por CLI:
 *   pnpm test:parser "Hola, queremos ir a Roma 5 dias en julio..."
 */

import { ParserEngine } from "../lib/parser/engine";

const TEST_INPUT = `Hola! somos pareja, queremos ir a Italia en verano una semana
mas o menos. Mi marido va en silla de ruedas electrica.
Presupuesto 3500€ todo incluido vuelos y hotel. Salimos
de Sevilla.`;

async function main() {
  const input = process.argv[2] ?? TEST_INPUT;
  const engine = new ParserEngine();

  console.log("─".repeat(70));
  console.log("INPUT:");
  console.log(input);
  console.log("─".repeat(70));

  const t0 = Date.now();
  const result = await engine.parse(input);
  const elapsed = Date.now() - t0;

  console.log(`\nRESULT (${elapsed}ms, status=${result.status}):\n`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});

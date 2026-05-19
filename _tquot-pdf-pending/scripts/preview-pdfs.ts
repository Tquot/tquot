/**
 * Genera los dos PDFs con el mock para verlos sin levantar Next.
 *
 * Uso:
 *   pnpm preview:pdfs
 *
 * Output: ./out/agent.pdf  y  ./out/client.pdf
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { renderQuotePdf } from "../lib/pdf/render";
import { mockQuote } from "../lib/pdf/utils/mock-quote";

async function main() {
  await mkdir("out", { recursive: true });

  console.log("Generando PDF agente...");
  const agentBuffer = await renderQuotePdf(mockQuote, "agent");
  await writeFile(join("out", "agent.pdf"), agentBuffer);
  console.log(`✓ out/agent.pdf (${(agentBuffer.length / 1024).toFixed(1)} KB)`);

  console.log("Generando PDF cliente...");
  const clientBuffer = await renderQuotePdf(mockQuote, "client");
  await writeFile(join("out", "client.pdf"), clientBuffer);
  console.log(`✓ out/client.pdf (${(clientBuffer.length / 1024).toFixed(1)} KB)`);

  console.log("\nListo. Abre los PDFs en tu visor para revisar el diseño.");
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});

export interface SanitizeResult {
  clean: string;
  /** Qué se ha detectado y quitado, para depurar */
  removed: string[];
  /** Origen inferido del formato */
  channel: "whatsapp" | "email" | "plain";
  /** Si hay varios mensajes en el pegado, en orden cronológico */
  turns: string[];
}

const WHATSAPP_LINE =
  /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2})(:\d{2})?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?\]?\s*[-–]?\s*([^:]{1,40}):\s*/i;
const EMAIL_FORWARD_HEADER =
  /^\s*(de|from|enviado el|sent|para|to|asunto|subject|cc|fecha|date)\s*:/i;
const QUOTED_LINE = /^\s*>+/;
const SIGNATURE_MARKER =
  /^\s*(--+\s*$|__+\s*$|enviado desde mi |sent from my |obtén outlook para|get outlook for)/i;
const SIGNATURE_BLOCK =
  /\n\s*(un saludo|saludos cordiales|atentamente|best regards|kind regards|gracias de antemano)[\s,.!]*\n[\s\S]{0,300}$/i;
const DISCLAIMER =
  /\n\s*(este mensaje y sus? (anexos|archivos)|this (e-?mail|message) (and any )?(attachments?)?|la información contenida)[\s\S]*$/i;
const URL = /https?:\/\/\S+/g;
const PHONE_SIG =
  /\n\s*(tel|tlf|móvil|movil|mob|phone)[\s.:]+[\d\s+()-]{7,}\s*$/gim;

export function sanitize(raw: string): SanitizeResult {
  const removed: string[] = [];
  let text = raw.replace(/\r\n/g, "\n").trim();

  const lines = text.split("\n");
  const whatsappLines = lines.filter((l) => WHATSAPP_LINE.test(l)).length;
  const channel: SanitizeResult["channel"] =
    whatsappLines >= 2
      ? "whatsapp"
      : lines.some((l) => EMAIL_FORWARD_HEADER.test(l))
        ? "email"
        : "plain";

  let turns: string[] = [];

  if (channel === "whatsapp") {
    // Conservar ambos emisores; el modelo desambigua. Filtrar por nombre pierde datos.
    const parsed: Array<{ sender: string; body: string }> = [];
    for (const line of lines) {
      const m = line.match(WHATSAPP_LINE);
      if (m) {
        parsed.push({
          sender: m[5].trim(),
          body: line.replace(WHATSAPP_LINE, "").trim(),
        });
      } else if (parsed.length > 0) {
        parsed[parsed.length - 1].body += " " + line.trim();
      }
    }
    turns = parsed.map((p) => p.body).filter(Boolean);
    text = turns.join("\n");
    removed.push(`whatsapp:${parsed.length} mensajes`);
  }

  if (channel === "email") {
    const cutIdx = lines.findIndex((l, i) => i > 0 && EMAIL_FORWARD_HEADER.test(l));
    if (cutIdx > 0) {
      const above = lines.slice(0, cutIdx).join("\n").trim();
      const below = lines
        .slice(cutIdx)
        .join("\n")
        .replace(/^.*$/m, "")
        .trim();
      text = above.length > 40 ? above : below;
      removed.push("email:cabeceras de reenvío");
    }
  }

  // Citas de respuesta: también en plain (reenvíos sin cabecera completa)
  const beforeQuotes = text;
  text = text
    .split("\n")
    .filter((l) => !QUOTED_LINE.test(l))
    .join("\n");
  if (text !== beforeQuotes) removed.push("quoted-lines");

  const before = text.length;
  text = text.replace(SIGNATURE_BLOCK, "\n").replace(DISCLAIMER, "");
  const sigCut = text.split("\n").findIndex((l) => SIGNATURE_MARKER.test(l));
  if (sigCut > 0) text = text.split("\n").slice(0, sigCut).join("\n");
  text = text.replace(PHONE_SIG, "");
  if (text.length < before) removed.push("firma/disclaimer");

  if (/https?:\/\/\S+/.test(text)) {
    text = text.replace(URL, "");
    removed.push("urls");
  }

  text = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  return {
    clean: text,
    removed,
    channel,
    turns: turns.length > 0 ? turns : [text],
  };
}

"use client";

import type { Message } from "@/lib/quote-engine/types";
import { useDashboardLanguage } from "../../dashboard-language-provider";

function systemEventLabel(
  message: Extract<Message, { role: "system" }>,
  locale: "es" | "en",
): string {
  const section = message.payload.section as string | undefined;
  const sectionLabels: Record<string, { es: string; en: string }> = {
    flights: { es: "Vuelos", en: "Flights" },
    hotels: { es: "Hoteles", en: "Hotels" },
    experiences: { es: "Experiencias", en: "Experiences" },
    transfers: { es: "Traslados", en: "Transfers" },
  };

  switch (message.type) {
    case "parsing-started":
      return locale === "es" ? "Analizando petición…" : "Parsing request…";
    case "parsing-completed":
      return locale === "es" ? "Petición interpretada." : "Request parsed.";
    case "building-started":
      return locale === "es"
        ? "Construyendo cotización…"
        : "Building quote…";
    case "section-completed":
      return locale === "es"
        ? `${sectionLabels[section ?? ""]?.es ?? section ?? "Sección"} listos.`
        : `${sectionLabels[section ?? ""]?.en ?? section ?? "Section"} ready.`;
    case "section-error":
      return locale === "es"
        ? `Aviso en ${sectionLabels[section ?? ""]?.es ?? section ?? "una sección"}.`
        : `Warning in ${sectionLabels[section ?? ""]?.en ?? section ?? "a section"}.`;
    case "build-completed":
      return locale === "es" ? "Cotización lista." : "Quote ready.";
    case "refinement-applied":
      return locale === "es" ? "Refinamiento aplicado." : "Refinement applied.";
    case "error":
      return String(message.payload.message ?? message.payload.kind ?? "Error");
    default:
      return message.type;
  }
}

export function MessageBubble({ message }: { message: Message }) {
  const { locale, t } = useDashboardLanguage();

  if (message.role === "system") {
    const isError = message.type === "error";
    return (
      <div className="flex justify-center px-2">
        <p
          className={`max-w-[90%] rounded-full px-3 py-1.5 text-xs font-medium ${
            isError
              ? "border border-amber-200 bg-amber-50 text-amber-900"
              : "border border-tquot-border bg-tquot-bg text-tquot-muted"
          }`}
        >
          {systemEventLabel(message, locale)}
        </p>
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end px-2">
        <div className="max-w-[85%] rounded-xl border border-tquot-accent/20 bg-blue-50 px-4 py-3 text-sm text-tquot-text">
          <span className="font-semibold">{t.chatRoleAgent}:</span> {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start px-2">
      <div
        className={`max-w-[85%] rounded-xl border border-tquot-border bg-tquot-bg px-4 py-3 text-sm text-tquot-text ${
          message.streaming ? "opacity-80" : ""
        }`}
      >
        <span className="font-semibold">{t.chatRoleAi}:</span>{" "}
        <span className="whitespace-pre-wrap">{message.content}</span>
      </div>
    </div>
  );
}

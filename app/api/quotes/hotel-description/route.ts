import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/app/api/parser/_auth";
import { callPlainText } from "@/lib/parser/anthropic-client";

const BodySchema = z.object({
  name: z.string().min(1).max(200),
  stars: z.string().max(20).optional(),
  location: z.string().max(300).optional(),
  roomType: z.string().max(200).optional(),
  locale: z.enum(["es", "en"]),
});

function buildPrompt(
  body: z.infer<typeof BodySchema>,
): { system: string; userMessage: string } {
  const language = body.locale === "es" ? "Spanish" : "English";
  const lines = [
    `Hotel name: ${body.name}`,
    `Stars: ${body.stars?.trim() || "not specified"}`,
    `Location: ${body.location?.trim() || "not specified"}`,
    `Room type: ${body.roomType?.trim() || "not specified"}`,
  ];

  return {
    system: `You write short hotel copy for travel agents. Write exactly 2 professional sentences in ${language}. No bullet points, markdown, or headings. Do not invent specific amenities unless they are typical for the hotel category.`,
    userMessage: lines.join("\n"),
  };
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (auth.response) return auth.response;

  if (!process.env["ANTHROPIC_API_KEY"]) {
    return NextResponse.json(
      { error: "Servicio de descripción no disponible." },
      { status: 503 },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Body inválido", details: (err as Error).message },
      { status: 400 },
    );
  }

  try {
    const { system, userMessage } = buildPrompt(body);
    const description = await callPlainText({ system, userMessage, maxTokens: 150 });
    return NextResponse.json({ description });
  } catch (err) {
    console.warn("[hotel-description] generation failed", err);
    return NextResponse.json(
      { error: "No se pudo generar la descripción." },
      { status: 500 },
    );
  }
}

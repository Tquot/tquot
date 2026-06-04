import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";

export type ExperienceOption = {
  name: string;
  price: number;
  providerName?: string;
  activityCode?: string;
  connectionId?: string;
  imageUrl?: string;
};

const BodySchema = z.object({
  destination: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  agencyId: z.string().optional(),
});

function fallbackExperiences(message: string) {
  return NextResponse.json({
    experiences: [] as ExperienceOption[],
    fallback: true,
    error: message,
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserAndAgency(request);
    if ("response" in auth) return auth.response;

    BodySchema.parse(await request.json());

    return fallbackExperiences(
      "Hotelbeds Activities no activado. La búsqueda de actividades estará disponible próximamente.",
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected Hotelbeds activities search error.";
    return fallbackExperiences(message);
  }
}

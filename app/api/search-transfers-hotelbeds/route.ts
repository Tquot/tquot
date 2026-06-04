import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";

export type TransferOption = {
  name: string;
  price: number;
  providerName?: string;
  transferCode?: string;
  connectionId?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
};

const BodySchema = z.object({
  destination: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  pickupLocation: z.string().optional(),
  dropoffLocation: z.string().optional(),
  agencyId: z.string().optional(),
});

function fallbackTransfers(message: string) {
  return NextResponse.json({
    transfers: [] as TransferOption[],
    fallback: true,
    error: message,
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserAndAgency(request);
    if ("response" in auth) return auth.response;

    BodySchema.parse(await request.json());

    return fallbackTransfers(
      "Hotelbeds Transfers no activado. La búsqueda de traslados estará disponible próximamente.",
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected Hotelbeds transfers search error.";
    return fallbackTransfers(message);
  }
}

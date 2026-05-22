import { NextResponse } from "next/server";
import {
  countDuffelFlights,
  parseDuffelPayload,
  requestDuffelOfferSearch,
} from "@/lib/duffel/flights";

export async function GET() {
  const duffelApiKey = process.env.DUFFEL_API_KEY;

  try {
    const result = await requestDuffelOfferSearch(duffelApiKey ?? "", {
      origin: "MAD",
      destination: "FCO",
      date: "2026-09-15",
      adults: 1,
    });

    const rawBodyPreview = result.bodyText.slice(0, 500);

    let flightCount: number | null;
    try {
      const payload = parseDuffelPayload(result.bodyText);
      flightCount = countDuffelFlights(payload);
    } catch {
      flightCount = null;
    }

    return NextResponse.json({
      apiStatus: result.status,
      flightCount,
      rawBodyPreview,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json({
      apiStatus: null,
      flightCount: null,
      rawBodyPreview: "",
      fetchError: message,
    });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import {
  getConnectionWithCredentials,
  listAgencyConnections,
} from "@/lib/connectors/storage";
import { getHotelContent } from "@/lib/providers/hotelbeds/content-cache";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUserAndAgency(request);
  if ("response" in auth) return auth.response;

  const hotelCode = request.nextUrl.searchParams.get("hotelCode")?.trim();
  if (!hotelCode) {
    return NextResponse.json(
      { error: "hotelCode is required" },
      { status: 400 },
    );
  }

  const agencyConnections = await listAgencyConnections(auth.agencyId);
  const hotelbedsConnection = agencyConnections.find(
    (c) => c.provider_id === "hotelbeds",
  );
  if (!hotelbedsConnection) {
    return NextResponse.json(
      { error: "Hotelbeds no conectado", content: null },
      { status: 404 },
    );
  }

  const connectionData = await getConnectionWithCredentials(
    hotelbedsConnection.id,
  );
  if (!connectionData) {
    return NextResponse.json(
      { error: "Credenciales Hotelbeds no disponibles", content: null },
      { status: 404 },
    );
  }

  try {
    const content = await getHotelContent(
      hotelCode,
      connectionData.credentials,
    );
    return NextResponse.json({ content });
  } catch (error) {
    console.error("[hotelbeds-content] failed", error);
    return NextResponse.json(
      { error: "No se pudo cargar el content", content: null },
      { status: 500 },
    );
  }
}

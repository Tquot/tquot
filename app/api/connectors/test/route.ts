import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdapter } from "@/lib/connectors/registry";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import {
  getConnectionWithCredentials,
  listAgencyConnections,
  updateConnectionStatus,
} from "@/lib/connectors/storage";

const BodySchema = z.object({
  connectionId: z.string().uuid(),
});

/**
 * POST /api/connectors/test
 *
 * Prueba una conexión guardada. Recupera credenciales descifradas,
 * llama a adapter.testConnection(), y actualiza el estado en BD.
 *
 * Útil cuando el agente acaba de meter sus credenciales y le da
 * al botón "Probar conexión".
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserAndAgency(req);
    if ("response" in auth) return auth.response;

    const { connectionId } = BodySchema.parse(await req.json());

    const connections = await listAgencyConnections(auth.agencyId);
    if (!connections.some((c) => c.id === connectionId)) {
      return NextResponse.json(
        { error: "Conexión no encontrada" },
        { status: 404 }
      );
    }

    const data = await getConnectionWithCredentials(connectionId);
    if (!data) {
      return NextResponse.json(
        {
          error:
            "No se pudieron cargar las credenciales de la conexión. Comprueba CREDENTIALS_KEY o vuelve a guardar las credenciales.",
        },
        { status: 500 }
      );
    }

    const adapter = getAdapter(data.row.provider_id);
    if (!adapter) {
      return NextResponse.json(
        {
          error: `Proveedor "${data.row.provider_id}" no implementado todavía. Está en el catálogo pero su adaptador es un stub.`,
        },
        { status: 501 }
      );
    }

    const result = await adapter.testConnection(data.credentials);

    await updateConnectionStatus(
      connectionId,
      result.ok ? "active" : "error",
      result.ok ? null : result.error
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Body inválido", details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

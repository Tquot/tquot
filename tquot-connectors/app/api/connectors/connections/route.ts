import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listAgencyConnections,
  upsertConnection,
} from "@/lib/connectors/storage";

// AUTH_TODO: reemplazar este helper por el sistema real de auth de TQuot.
// Debe devolver { userId, agencyId } o null si no autenticado.
async function getCurrentUserAndAgency(
  _req: NextRequest
): Promise<{ userId: string; agencyId: string } | null> {
  // Placeholder. Sonnet debe reemplazar con tu auth real (Supabase Auth + cookies).
  throw new Error(
    "AUTH_TODO: implementar getCurrentUserAndAgency() en este archivo."
  );
}

/**
 * GET /api/connectors/connections
 *
 * Lista las conexiones de la agencia del usuario actual.
 * NO devuelve credenciales (solo estado, display name, etc.).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUserAndAgency(req);
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const connections = await listAgencyConnections(session.agencyId);
    return NextResponse.json({ connections });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/connectors/connections
 *
 * Crea o actualiza una conexión de la agencia a un proveedor.
 * Recibe las credenciales en plano (HTTPS protege el tránsito), las
 * encripta en la BD vía función SQL.
 *
 * Body:
 * {
 *   "providerId": "hotelbeds",
 *   "credentials": { "api_key": "...", "secret": "..." },
 *   "displayName": "Hotelbeds cuenta principal" (opcional),
 *   "config": { "environment": "test" } (opcional)
 * }
 */
const PostBodySchema = z.object({
  providerId: z.string().min(1),
  credentials: z.record(z.string(), z.string()),
  displayName: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUserAndAgency(req);
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = PostBodySchema.parse(await req.json());

    const result = await upsertConnection({
      agencyId: session.agencyId,
      providerId: body.providerId,
      credentials: body.credentials,
      config: body.config,
      displayName: body.displayName,
      createdBy: session.userId,
    });

    return NextResponse.json({ id: result.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Body inválido", details: err.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

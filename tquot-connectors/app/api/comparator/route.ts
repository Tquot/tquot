import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { comparePreReserve } from "@/lib/comparator";
import {
  getConnectionWithCredentials,
  listAgencyConnections,
} from "@/lib/connectors/storage";

// AUTH_TODO
async function getCurrentUserAndAgency(
  _req: NextRequest
): Promise<{ userId: string; agencyId: string } | null> {
  throw new Error("AUTH_TODO");
}

const HotelMappingSchema = z.object({
  connectionId: z.string().uuid(),
  hotelCodes: z.array(z.string()).min(1),
});

const BodySchema = z.object({
  /** Mapeo: para cada conexión que queremos consultar, qué hotel buscar.
   *  Es responsabilidad del frontend mantener este mapeo (en v1 manual). */
  hotelMappings: z.array(HotelMappingSchema).min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rooms: z.array(
    z.object({
      adults: z.number().int().min(1),
      childrenAges: z.array(z.number().int().min(0).max(17)).default([]),
    })
  ).min(1),
  currency: z.string().length(3).optional(),
  language: z.string().min(2).max(5).optional(),
  timeoutMs: z.number().int().min(1000).max(30_000).optional(),
});

/**
 * POST /api/comparator
 *
 * Ejecuta el comparador pre-reserva: consulta en paralelo todos los
 * proveedores indicados y devuelve ranking de precios.
 *
 * Caso de uso: el agente ya ha cotizado, el cliente ha confirmado, y
 * ahora quiere saber EN CUÁL DE SUS SISTEMAS está el mejor precio.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUserAndAgency(req);
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = BodySchema.parse(await req.json());

    // Cargar credenciales para cada mapping (verifica permisos vía RLS interno).
    const providers: Array<{
      providerId: string;
      credentials: Record<string, string>;
      hotelCodes: string[];
    }> = [];

    for (const mapping of body.hotelMappings) {
      const data = await getConnectionWithCredentials(mapping.connectionId);
      if (!data) {
        // Skip silently — la conexión no existe o el usuario no tiene acceso.
        continue;
      }
      // Verificar que pertenece a la agencia del usuario actual.
      if (data.row.agency_id !== session.agencyId) {
        continue;
      }
      providers.push({
        providerId: data.row.provider_id,
        credentials: data.credentials,
        hotelCodes: mapping.hotelCodes,
      });
    }

    if (providers.length === 0) {
      return NextResponse.json(
        {
          error:
            "Ningún proveedor válido para consultar. Verifica que las conexiones existen y pertenecen a tu agencia.",
        },
        { status: 400 }
      );
    }

    const result = await comparePreReserve({
      providers,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      rooms: body.rooms,
      currency: body.currency,
      language: body.language,
      timeoutMs: body.timeoutMs,
    });

    // TODO: persistir comparator_logs aquí cuando estabilicemos.

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

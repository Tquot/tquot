import { NextResponse } from "next/server";
import { listProviderCatalog } from "@/lib/connectors/storage";
import { isProviderImplemented } from "@/lib/connectors/registry";

/**
 * GET /api/connectors/catalog
 *
 * Lista todos los proveedores disponibles en TQuot, marcando cuáles
 * están implementados de verdad (vs stubs pendientes).
 *
 * No requiere agencia — el catálogo es público para todos los usuarios
 * autenticados (RLS lo filtra por auth.role()).
 */

export async function GET() {
  try {
    const catalog = await listProviderCatalog();
    // Sincronizar con el registry: lo que dice la BD vs lo que está realmente registrado.
    // Si la BD dice is_implemented=true pero el registry no lo tiene, devolvemos
    // is_implemented=false para no engañar al usuario.
    const enriched = catalog.map((p) => ({
      ...p,
      is_implemented: p.is_implemented && isProviderImplemented(p.id),
    }));
    return NextResponse.json({ providers: enriched });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

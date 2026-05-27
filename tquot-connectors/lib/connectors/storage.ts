/**
 * Helpers para trabajar con la tabla agency_connections desde el servidor.
 *
 * IMPORTANTE: el archivo asume que TQuot ya tiene un wrapper de Supabase
 * configurado. Si la ruta de import es distinta, ajustar en SUPABASE_IMPORT_TODO.
 */

import { createClient } from "@supabase/supabase-js";
import type { ConnectionStatus, Credentials } from "@/lib/connectors/types";

// SUPABASE_IMPORT_TODO: si tu proyecto tiene un wrapper como
// `import { createClient } from "@/lib/supabase/server"`, sustituir esto
// por ese wrapper para que use cookies + RLS automáticamente.
function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan vars de entorno Supabase");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─────────────────────────────────────────────────────────────
// Tipos de la BD
// ─────────────────────────────────────────────────────────────

export interface AgencyConnectionRow {
  id: string;
  agency_id: string;
  provider_id: string;
  status: ConnectionStatus;
  display_name: string | null;
  notes: string | null;
  config: Record<string, unknown>;
  last_test_at: string | null;
  last_test_error: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderCatalogRow {
  id: string;
  name: string;
  category: string;
  auth_type: string;
  logo_url: string | null;
  description: string | null;
  docs_url: string | null;
  website_url: string | null;
  config_schema: { fields: Array<{ key: string; label: string; type: string; required?: boolean; options?: string[]; default?: string }> };
  is_implemented: boolean;
  is_available: boolean;
}

// ─────────────────────────────────────────────────────────────
// Lectura del catálogo
// ─────────────────────────────────────────────────────────────

export async function listProviderCatalog(): Promise<ProviderCatalogRow[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("provider_catalog")
    .select("*")
    .eq("is_available", true)
    .order("category")
    .order("name");
  if (error) throw error;
  return (data ?? []) as ProviderCatalogRow[];
}

// ─────────────────────────────────────────────────────────────
// Lectura de conexiones de una agencia (SIN credenciales)
// ─────────────────────────────────────────────────────────────

export async function listAgencyConnections(
  agencyId: string
): Promise<AgencyConnectionRow[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("agency_connections")
    .select(
      "id, agency_id, provider_id, status, display_name, notes, config, last_test_at, last_test_error, last_used_at, created_at, updated_at"
    )
    .eq("agency_id", agencyId)
    .order("provider_id");
  if (error) throw error;
  return (data ?? []) as AgencyConnectionRow[];
}

// ─────────────────────────────────────────────────────────────
// Obtener una conexión CON credenciales descifradas
// (usar SOLO desde código de servidor, nunca devolver al cliente)
// ─────────────────────────────────────────────────────────────

export async function getConnectionWithCredentials(
  connectionId: string
): Promise<{ row: AgencyConnectionRow; credentials: Credentials } | null> {
  const sb = supabaseAdmin();

  const { data, error } = await sb.rpc("get_connection_with_credentials", {
    p_connection_id: connectionId,
  });

  if (error || !data || data.length === 0) return null;

  const result = data[0];
  return {
    row: {
      id: result.id,
      agency_id: result.agency_id,
      provider_id: result.provider_id,
      status: result.status,
      // Estos campos no vienen en la función RPC; los rellenamos vacíos
      display_name: null,
      notes: null,
      config: result.config ?? {},
      last_test_at: null,
      last_test_error: null,
      last_used_at: null,
      created_at: "",
      updated_at: "",
    },
    credentials: result.credentials as Credentials,
  };
}

// ─────────────────────────────────────────────────────────────
// Crear / actualizar conexión
// ─────────────────────────────────────────────────────────────

export async function upsertConnection(input: {
  agencyId: string;
  providerId: string;
  credentials: Credentials;
  config?: Record<string, unknown>;
  displayName?: string;
  createdBy: string;
}): Promise<{ id: string }> {
  const sb = supabaseAdmin();

  // Encriptar credenciales usando la función SQL
  const { data: encrypted, error: encError } = await sb.rpc(
    "encrypt_credentials",
    { credentials_json: input.credentials }
  );
  if (encError) throw encError;

  // Upsert: si ya existe (agency_id, provider_id), actualiza
  const { data, error } = await sb
    .from("agency_connections")
    .upsert(
      {
        agency_id: input.agencyId,
        provider_id: input.providerId,
        encrypted_credentials: encrypted,
        config: input.config ?? {},
        display_name: input.displayName ?? null,
        status: "pending",
        created_by: input.createdBy,
      },
      { onConflict: "agency_id,provider_id" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

// ─────────────────────────────────────────────────────────────
// Actualizar estado tras probar
// ─────────────────────────────────────────────────────────────

export async function updateConnectionStatus(
  connectionId: string,
  status: ConnectionStatus,
  errorMessage?: string | null
): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from("agency_connections")
    .update({
      status,
      last_test_at: new Date().toISOString(),
      last_test_error: errorMessage ?? null,
    })
    .eq("id", connectionId);
}

// ─────────────────────────────────────────────────────────────
// Borrar conexión
// ─────────────────────────────────────────────────────────────

export async function deleteConnection(connectionId: string): Promise<void> {
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("agency_connections")
    .delete()
    .eq("id", connectionId);
  if (error) throw error;
}

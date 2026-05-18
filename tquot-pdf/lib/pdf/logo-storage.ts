/**
 * ─────────────────────────────────────────────────────────────
 *  Módulo de logos de agencia
 * ─────────────────────────────────────────────────────────────
 *
 *  Gestiona la subida, validación y recuperación de logos en Supabase Storage.
 *
 *  Convenciones:
 *  - Bucket: `agency-logos` (público, configurar en Supabase)
 *  - Ruta: `agency-logos/{agencyId}/logo.{ext}`
 *  - Formatos aceptados: PNG, JPG, SVG, WebP
 *  - Tamaño máximo: 1 MB (los PDFs no necesitan más)
 *  - Dimensiones recomendadas: 400×160 px o mayor con relación de aspecto similar
 */

import { createClient } from "@supabase/supabase-js";

const BUCKET = "agency-logos";
const MAX_BYTES = 1024 * 1024; // 1 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"] as const;

type AllowedMime = (typeof ALLOWED_TYPES)[number];

// ─────────────────────────────────────────────────────────────
// Cliente Supabase (server-side, con service role)
// ─────────────────────────────────────────────────────────────

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─────────────────────────────────────────────────────────────
// Validación
// ─────────────────────────────────────────────────────────────

export class LogoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LogoValidationError";
  }
}

export function validateLogoFile(file: { size: number; type: string }): void {
  if (!ALLOWED_TYPES.includes(file.type as AllowedMime)) {
    throw new LogoValidationError(
      `Formato no permitido. Acepta: ${ALLOWED_TYPES.join(", ")}.`
    );
  }
  if (file.size > MAX_BYTES) {
    throw new LogoValidationError(
      `Tamaño máximo permitido: ${MAX_BYTES / 1024} KB. Recibido: ${Math.round(file.size / 1024)} KB.`
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Subida
// ─────────────────────────────────────────────────────────────

interface UploadLogoArgs {
  agencyId: string;
  file: Buffer;
  contentType: string;
}

interface UploadLogoResult {
  publicUrl: string;
  path: string;
}

function extensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/svg+xml": "svg",
    "image/webp": "webp",
  };
  return map[mime] ?? "png";
}

export async function uploadAgencyLogo({
  agencyId,
  file,
  contentType,
}: UploadLogoArgs): Promise<UploadLogoResult> {
  validateLogoFile({ size: file.length, type: contentType });

  const supabase = supabaseAdmin();
  const ext = extensionFromMime(contentType);
  const path = `${agencyId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(`Error subiendo logo: ${uploadError.message}`);
  }

  // URL pública (el bucket está configurado como public)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // Persistir en la tabla agencies
  const { error: updateError } = await supabase
    .from("agencies")
    .update({ logo_url: data.publicUrl })
    .eq("id", agencyId);

  if (updateError) {
    throw new Error(`Logo subido pero no se pudo asociar a la agencia: ${updateError.message}`);
  }

  return { publicUrl: data.publicUrl, path };
}

// ─────────────────────────────────────────────────────────────
// Borrado
// ─────────────────────────────────────────────────────────────

export async function deleteAgencyLogo(agencyId: string): Promise<void> {
  const supabase = supabaseAdmin();

  // Listar archivos existentes del agencyId
  const { data: files } = await supabase.storage.from(BUCKET).list(agencyId);
  if (files && files.length > 0) {
    await supabase.storage
      .from(BUCKET)
      .remove(files.map((f) => `${agencyId}/${f.name}`));
  }

  await supabase.from("agencies").update({ logo_url: null }).eq("id", agencyId);
}

// ─────────────────────────────────────────────────────────────
// Recuperación de logo en el momento de generar PDF
// ─────────────────────────────────────────────────────────────
//
// IMPORTANTE: @react-pdf/renderer descarga la imagen desde la URL en tiempo
// de renderizado. Si el bucket no es público, hay que pasar una signed URL.
//

export async function getAgencyLogoUrl(agencyId: string): Promise<string | null> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("agencies")
    .select("logo_url")
    .eq("id", agencyId)
    .single();

  if (error || !data?.logo_url) return null;
  return data.logo_url;
}

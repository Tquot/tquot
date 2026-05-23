import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { InventoryCategory } from "@/app/dashboard/inventory/actions";
import {
  applyColumnMapping,
  buildImportParseResponse,
  isAllowedImportFilename,
  MAX_IMPORT_FILE_BYTES,
  parseSpreadsheet,
} from "@/lib/inventory/import";
import { mapColumnsWithClaude } from "@/lib/inventory/map-columns-with-claude";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const CategorySchema = z.enum([
  "hotels",
  "experiences",
  "suppliers",
  "tour_operators",
]);

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
  }

  if (!isAllowedImportFilename(file.name)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use .xlsx, .xls, or .csv." },
      { status: 400 },
    );
  }

  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_IMPORT_FILE_BYTES / 1024 / 1024} MB).` },
      { status: 413 },
    );
  }

  const defaultCategoryRaw = formData.get("defaultCategory");
  const defaultCategoryParsed = CategorySchema.safeParse(defaultCategoryRaw);
  const defaultCategory: InventoryCategory = defaultCategoryParsed.success
    ? defaultCategoryParsed.data
    : "hotels";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { headers, rows } = parseSpreadsheet(buffer, file.name);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No data rows found in file." },
        { status: 400 },
      );
    }

    const sampleRows = rows.slice(0, 5);
    const { columnMapping, unmappedColumns, categoryDefault } =
      await mapColumnsWithClaude({
        headers,
        sampleRows,
        defaultCategory,
      });

    const { mappedRows, stats } = applyColumnMapping({
      headers,
      rows,
      columnMapping,
      categoryDefault,
    });

    const response = buildImportParseResponse(
      mappedRows,
      unmappedColumns,
      stats,
    );

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Import parsing failed.";
    console.error("[inventory/import]", error);
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes("ANTHROPIC") ? 502 : 400 },
    );
  }
}

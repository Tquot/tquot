import { z } from "zod";
import type { InventoryCategory } from "@/app/dashboard/inventory/actions";
import { callStructured } from "@/lib/parser/anthropic-client";
import type { InventoryImportColumnMapping } from "./types";

const InventoryCategorySchema = z.enum([
  "hotels",
  "experiences",
  "suppliers",
  "tour_operators",
]);

const ImportFieldSchema = z.enum([
  "name",
  "category",
  "price_net",
  "commission_percent",
  "provider",
  "destination",
  "notes",
  "accessible",
  "ignore",
]);

const ColumnMappingResponseSchema = z.object({
  columnMapping: z.record(z.string(), ImportFieldSchema),
  unmappedColumns: z.array(z.string()),
  categoryDefault: InventoryCategorySchema.optional(),
});

export type ColumnMappingResult = {
  columnMapping: InventoryImportColumnMapping;
  unmappedColumns: string[];
  categoryDefault: InventoryCategory;
};

const SYSTEM_PROMPT = `You map spreadsheet column headers to a fixed inventory schema for a travel agency.

Internal fields (use exactly these keys in columnMapping values):
- name: product or hotel name (e.g. "Hotel name", "Nombre hotel", "Nombre", "Producto")
- category: type row — hotels, experiences, suppliers, tour_operators (e.g. "Categoría", "Tipo", "Category")
- price_net: net price (e.g. "Precio neto", "Net price", "PVP neto", "Coste neto")
- commission_percent: commission % (e.g. "Comisión", "Commission", "Comisión %")
- provider: supplier or provider name (e.g. "Proveedor", "Provider", "Operador")
- destination: city or destination (e.g. "Destino", "Ciudad", "Destination", "City")
- notes: free text notes (e.g. "Notas", "Observaciones", "Comments")
- accessible: accessibility yes/no (e.g. "Accesible", "Accessible", "PMR")
- ignore: column has no mapping

Rules:
- Map each source header from the spreadsheet to exactly one internal field or "ignore".
- Recognize Spanish and English header variants and abbreviations.
- Put headers you cannot map confidently in unmappedColumns AND map them to "ignore" in columnMapping.
- If there is no category column, set categoryDefault to the best guess from sample data or the user hint.
- categoryDefault must be one of: hotels, experiences, suppliers, tour_operators.`;

export async function mapColumnsWithClaude(params: {
  headers: string[];
  sampleRows: string[][];
  defaultCategory: InventoryCategory;
}): Promise<ColumnMappingResult> {
  const { headers, sampleRows, defaultCategory } = params;

  const userMessage = JSON.stringify(
    {
      headers,
      sampleRows,
      defaultCategoryHint: defaultCategory,
    },
    null,
    2,
  );

  const result = await callStructured({
    schema: ColumnMappingResponseSchema,
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 2048,
    retries: 2,
  });

  const columnMapping: InventoryImportColumnMapping = {};
  for (const [header, field] of Object.entries(result.columnMapping)) {
    columnMapping[header] = field;
  }

  return {
    columnMapping,
    unmappedColumns: result.unmappedColumns,
    categoryDefault: result.categoryDefault ?? defaultCategory,
  };
}

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
- category: row type column — map headers "Tipo", "Type", "Categoría", "Category", "Clase" here (NOT "Proveedor" unless it only contains type labels)
- price_net: net price (e.g. "Precio neto", "Net price", "PVP neto", "Coste neto")
- commission_percent: commission % (e.g. "Comisión", "Commission", "Comisión %")
- provider: supplier or operator name column (e.g. "Proveedor", "Provider", "Operador") — only when the column holds company names, not product type
- destination: city or destination (e.g. "Destino", "Ciudad", "Destination", "City")
- notes: free text notes (e.g. "Notas", "Observaciones", "Comments")
- accessible: accessibility yes/no (e.g. "Accesible", "Accessible", "PMR")
- ignore: column has no mapping

Header mapping rules:
- Map each source header to exactly one internal field or "ignore".
- Prefer mapping "Tipo" / "Type" to category (not to ignore).
- Recognize Spanish and English header variants.
- Put headers you cannot map confidently in unmappedColumns AND map them to "ignore" in columnMapping.

Category column — cell values (use when reading sampleRows to set categoryDefault):
The category column contains product TYPE labels, not destination names. Interpret sample cell values using this table (Spanish and English, case-insensitive):

→ hotels:
  Hotel, Hotels, Hoteles, Alojamiento, Accommodation, Lodge, Resort, Hostel, Posada, Apartamento (lodging)

→ experiences:
  Experiencia, Experience, Tour, Actividad, Activity, Excursión, Excursion, Entrada, Ticket,
  Transfer, Traslado, Transport, Transporte,
  Seguro, Insurance

→ suppliers:
  Proveedor, Supplier, DMC, Vendor

→ tour_operators:
  Tour operador, Tour Operator, Operador, Operator (only when clearly a tour operator company type, not "Tour" activity)

If there is no category/Tipo column, set categoryDefault from the dominant type in sampleRows or the user hint.
categoryDefault must be one of: hotels, experiences, suppliers, tour_operators.

Do NOT put provider company names into category — provider belongs in the provider field.`;

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

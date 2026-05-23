import * as XLSX from "xlsx";
import type { InventoryCategory } from "@/app/dashboard/inventory/actions";
import type {
  ImportParseResponse,
  ImportParseStats,
  InventoryImportColumnMapping,
  InventoryImportField,
  MappedInventoryRow,
} from "./types";

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 500;

const DATA_FIELDS: InventoryImportField[] = [
  "price_net",
  "commission_percent",
  "provider",
  "destination",
  "notes",
  "accessible",
];

const CATEGORY_ALIASES: Record<InventoryCategory, string[]> = {
  hotels: [
    "hotel",
    "hoteles",
    "hotels",
    "alojamiento",
    "accommodation",
    "lodging",
  ],
  experiences: [
    "experience",
    "experiencias",
    "experiencia",
    "actividad",
    "activities",
    "activity",
  ],
  suppliers: [
    "supplier",
    "proveedor",
    "proveedores",
    "suppliers",
    "vendor",
    "vendors",
  ],
  tour_operators: [
    "tour operator",
    "tour operators",
    "tour_operators",
    "tour operator",
    "operador",
    "operadores",
    "touroperator",
    "dmc",
  ],
};

export type ParsedSpreadsheet = {
  headers: string[];
  rows: string[][];
};

export function parseSpreadsheet(
  buffer: Buffer,
  filename: string,
): ParsedSpreadsheet {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    raw: false,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("El archivo no contiene hojas.");
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    sheet,
    { header: 1, defval: "" },
  );

  if (matrix.length === 0) {
    throw new Error("El archivo está vacío.");
  }

  const headerRow = matrix[0] ?? [];
  const headers = headerRow.map((cell, index) => {
    const label = cellToString(cell).trim();
    return label || `column_${index + 1}`;
  });

  const rows: string[][] = [];
  for (let i = 1; i < matrix.length && rows.length < MAX_IMPORT_ROWS; i++) {
    const raw = matrix[i] ?? [];
    const row = headers.map((_, colIndex) => cellToString(raw[colIndex] ?? ""));
    if (row.every((cell) => !cell.trim())) continue;
    rows.push(row);
  }

  if (headers.every((h) => !h.trim() || h.startsWith("column_"))) {
    throw new Error("No se encontraron cabeceras válidas en la primera fila.");
  }

  return { headers, rows };
}

export function applyColumnMapping(params: {
  headers: string[];
  rows: string[][];
  columnMapping: InventoryImportColumnMapping;
  categoryDefault: InventoryCategory;
}): { mappedRows: MappedInventoryRow[]; stats: ImportParseStats } {
  const { headers, rows, columnMapping, categoryDefault } = params;
  const fieldByIndex = headers.map(
    (header) => columnMapping[header] ?? "ignore",
  );

  const mappedRows: MappedInventoryRow[] = [];
  let skipped = 0;

  for (const row of rows) {
    const draft: Partial<Record<InventoryImportField, string>> = {};
    const warnings: string[] = [];

    headers.forEach((header, index) => {
      const field = fieldByIndex[index];
      if (!field || field === "ignore") return;
      const value = (row[index] ?? "").trim();
      if (!value) return;
      if (field === "name" || field === "category") {
        draft[field] = value;
      } else {
        draft[field] = normalizeDataField(field, value);
      }
    });

    const name = draft.name?.trim();
    if (!name) {
      skipped += 1;
      continue;
    }

    const category = normalizeCategory(draft.category, categoryDefault);
    if (!draft.category) {
      warnings.push(`Categoría por defecto: ${category}`);
    }

    const data: Record<string, string> = {};
    for (const key of DATA_FIELDS) {
      const value = draft[key];
      if (value) data[key] = value;
    }

    mappedRows.push({
      name,
      category,
      data,
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  }

  return {
    mappedRows,
    stats: {
      total: rows.length,
      skipped,
    },
  };
}

export function buildImportParseResponse(
  mappedRows: MappedInventoryRow[],
  unmappedColumns: string[],
  stats: ImportParseStats,
): ImportParseResponse {
  return {
    mappedRows,
    unmappedColumns,
    preview: mappedRows.slice(0, 5),
    stats,
  };
}

function cellToString(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).trim();
}

function normalizeCategory(
  raw: string | undefined,
  fallback: InventoryCategory,
): InventoryCategory {
  if (!raw?.trim()) return fallback;
  const normalized = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  for (const [category, aliases] of Object.entries(CATEGORY_ALIASES) as Array<
    [InventoryCategory, string[]]
  >) {
    if (normalized === category.replace("_", " ") || normalized === category) {
      return category;
    }
    if (aliases.some((alias) => normalized.includes(alias))) {
      return category;
    }
  }

  return fallback;
}

function normalizeDataField(
  field: InventoryImportField,
  value: string,
): string {
  if (field === "accessible") {
    const v = value.toLowerCase().trim();
    if (["yes", "y", "si", "sí", "true", "1", "accessible", "accesible"].includes(v)) {
      return "true";
    }
    if (["no", "n", "false", "0"].includes(v)) {
      return "false";
    }
    return value;
  }
  return value;
}

export function isAllowedImportFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return (
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".csv")
  );
}

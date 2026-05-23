import type { InventoryCategory } from "@/app/dashboard/inventory/actions";

export type InventoryImportField =
  | "name"
  | "category"
  | "price_net"
  | "commission_percent"
  | "provider"
  | "destination"
  | "notes"
  | "accessible";

export type InventoryImportColumnMapping = Record<
  string,
  InventoryImportField | "ignore"
>;

export type MappedInventoryRow = {
  name: string;
  category: InventoryCategory;
  data: Record<string, string>;
  warnings?: string[];
};

export type ImportParseStats = {
  total: number;
  skipped: number;
};

export type ImportParseResponse = {
  mappedRows: MappedInventoryRow[];
  unmappedColumns: string[];
  preview: MappedInventoryRow[];
  stats: ImportParseStats;
};

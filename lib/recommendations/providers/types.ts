import { z } from "zod";

export type ProviderCategory =
  | "accessible"
  | "wine"
  | "gastronomy"
  | "adventure"
  | "nautical"
  | "culture"
  | "transfers"
  | "dmc";

export type FieldConfidence = "verified" | "probable" | "unverified";

/** Un dato de contacto siempre viaja con su procedencia. */
export interface SourcedField<T> {
  value: T;
  /** URL exacta de donde se ha leído. Obligatoria. */
  sourceUrl: string;
  confidence: FieldConfidence;
}

export interface ExternalProvider {
  id: string;
  category: ProviderCategory;
  destination: string;
  name: string;
  /** 1-2 frases. Qué hace y por qué encaja con esta petición. */
  description: string;
  website: SourcedField<string>;
  email: SourcedField<string> | null;
  phone: SourcedField<string> | null;
  /** Ciudad o zona de operación declarada en su web. */
  serviceArea: string | null;
  /** Señales verificables: años en activo, certificaciones, idiomas. */
  signals: string[];
  /** Cuándo se comprobó. Se muestra al agente. */
  checkedAt: string;
  /** Resultado agregado de la verificación. */
  trust: FieldConfidence;
}

const SourcedString = z.object({
  value: z.string().min(1),
  source_url: z.string().url(),
});

export const RawProviderSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(20).max(320),
  website: SourcedString,
  email: SourcedString.nullable(),
  phone: SourcedString.nullable(),
  service_area: z.string().max(120).nullable(),
  signals: z.array(z.string().max(90)).max(4),
});

export const RawSearchResultSchema = z.object({
  /** Hasta 2. Puede venir vacío: es una respuesta legítima. */
  providers: z.array(RawProviderSchema).max(2),
  /** Si no encuentra nada verificable, por qué. Se muestra al agente. */
  no_results_reason: z.string().max(200).nullable(),
});

export type RawProvider = z.infer<typeof RawProviderSchema>;
export type RawSearchResult = z.infer<typeof RawSearchResultSchema>;

export interface ProviderBlock {
  category: ProviderCategory;
  destination: string;
  providers: ExternalProvider[];
  noResultsReason: string | null;
}

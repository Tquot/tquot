import "server-only";
import {
  buildHotelbedsContentHeaders,
  hotelbedsBaseUrl,
  parseHotelbedsCredentials,
  type HotelbedsCredentials,
} from "@/lib/connectors/adapters/hotelbeds";
import type { Credentials } from "@/lib/connectors/types";
import { fetchWithTimeout } from "@/lib/connectors/utils";
import type {
  CancellationPolicy,
  HotelContent,
  HotelFacility,
  HotelImage,
} from "./content-types";
import { logRawHotelContentPayload } from "./content-mapper";

export type {
  CancellationPolicy,
  HotelContent,
  HotelFacility,
  HotelImage,
} from "./content-types";

const LANG = "CAS";

interface FetchInput {
  hotelCode: string;
  credentials: Credentials | HotelbedsCredentials;
  signal?: AbortSignal;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function contentString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  const record = asRecord(value);
  if (typeof record.content === "string" && record.content.trim()) {
    return record.content.trim();
  }
  return undefined;
}

/** Strip HTML tags for safe PDF / plain-text rendering. */
export function stripHtml(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function fetchHotelContentRaw(
  input: FetchInput,
): Promise<HotelContent | null> {
  const creds = parseHotelbedsCredentials(input.credentials as Credentials);
  const url = `${hotelbedsBaseUrl(creds)}/hotel-content-api/1.0/hotels/${encodeURIComponent(input.hotelCode)}/details?language=${LANG}&useSecondaryLanguage=false`;

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: buildHotelbedsContentHeaders(creds),
    timeoutMs: 8_000,
    signal: input.signal,
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`content_api_http_${response.status}`);
  }

  const data = (await response.json()) as { hotel?: unknown };
  const hotel = data.hotel;
  if (!hotel) return null;

  return mapHotelContent(hotel);
}

function mapHotelContent(hotelRaw: unknown): HotelContent {
  const hotel = asRecord(hotelRaw);
  logRawHotelContentPayload(hotel);

  const coordinates = asRecord(hotel.coordinates);
  const lat = Number(coordinates.latitude);
  const lng = Number(coordinates.longitude);

  const descriptionLong = stripHtml(contentString(hotel.description));
  const descriptionShort = stripHtml(
    contentString(hotel.shortDescription) ?? descriptionLong,
  );

  return {
    hotelCode: String(hotel.code ?? ""),
    name: contentString(hotel.name) ?? String(hotel.name ?? "Hotel"),
    descriptionShort,
    descriptionLong,
    categoryCode:
      typeof hotel.categoryCode === "string" ? hotel.categoryCode : undefined,
    categoryLabel:
      typeof hotel.categoryGroupCode === "string"
        ? hotel.categoryGroupCode
        : undefined,
    zoneName: typeof hotel.zoneName === "string" ? hotel.zoneName : undefined,
    destinationName: contentString(hotel.destinationName),
    countryCode:
      typeof hotel.countryCode === "string" ? hotel.countryCode : undefined,
    coordinates:
      Number.isFinite(lat) && Number.isFinite(lng)
        ? { lat, lng }
        : undefined,
    address: contentString(hotel.address),
    phone: extractPhone(asArray(hotel.phones)),
    email: typeof hotel.email === "string" ? hotel.email : undefined,
    website: typeof hotel.web === "string" ? hotel.web : undefined,
    images: mapImages(asArray(hotel.images)),
    facilities: mapFacilities(asArray(hotel.facilities)),
    cancellationPolicies: [],
    fetchedAt: new Date().toISOString(),
  };
}

function extractPhone(phones: unknown[]): string | undefined {
  if (phones.length === 0) return undefined;
  const records = phones.map(asRecord);
  const reception = records.find(
    (p) =>
      p.phoneType === "PHONERESERVATIONS" || p.phoneType === "PHONEHOTEL",
  );
  const number =
    (typeof reception?.phoneNumber === "string"
      ? reception.phoneNumber
      : undefined) ??
    (typeof records[0]?.phoneNumber === "string"
      ? records[0].phoneNumber
      : undefined);
  return number;
}

function mapImages(images: unknown[]): HotelImage[] {
  const TYPE_MAP: Record<string, HotelImage["type"]> = {
    GEN: "main",
    HAB: "room",
    POO: "pool",
    RES: "restaurant",
    GYM: "gym",
    SPA: "spa",
    BEA: "beach",
    LOB: "lobby",
  };

  const mapped: HotelImage[] = [];
  for (const imgRaw of images) {
    const img = asRecord(imgRaw);
    const path = typeof img.path === "string" ? img.path : undefined;
    const url =
      path != null
        ? `https://photos.hotelbeds.com/giata/bigger/${path}`
        : typeof img.url === "string"
          ? img.url
          : undefined;
    if (!url) continue;
    const typeCode =
      typeof img.imageTypeCode === "string" ? img.imageTypeCode : "";
    mapped.push({
      url,
      type: TYPE_MAP[typeCode] ?? "other",
      ...(typeof img.order === "number" ? { order: img.order } : {}),
    });
  }

  return mapped.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

function mapFacilities(facilities: unknown[]): HotelFacility[] {
  return facilities.map((fRaw) => {
    const f = asRecord(fRaw);
    return {
      code: Number(f.facilityCode ?? 0),
      group: Number(f.facilityGroupCode ?? 0),
      description:
        contentString(f.description) ??
        (typeof f.facilityName === "string"
          ? f.facilityName
          : `facility_${f.facilityCode}`),
      number: f.number != null ? Number(f.number) : undefined,
      ageFrom: f.ageFrom != null ? Number(f.ageFrom) : undefined,
      ageTo: f.ageTo != null ? Number(f.ageTo) : undefined,
      voucher: Boolean(f.voucher),
    };
  });
}

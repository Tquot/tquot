import type { HotelLevel } from "@/lib/quotes/build-quote";

export function parseHotelStars(
  data: Record<string, string | number | undefined>,
): number | null {
  const raw = data.stars ?? data.star_rating ?? "";
  const stars = Number.parseInt(String(raw).trim(), 10);
  return Number.isFinite(stars) && stars > 0 ? stars : null;
}

export function hotelLevelBlob(
  data: Record<string, string | number | undefined>,
): string {
  return [
    data.category,
    data.hotel_category,
    data.notes,
    data.description,
    data.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function passesHotelLevelFilter(
  data: Record<string, string | number | undefined>,
  hotelLevel: HotelLevel,
): boolean {
  if (hotelLevel === "budget") return true;

  const stars = parseHotelStars(data);
  const blob = hotelLevelBlob(data);
  const luxuryText =
    blob.includes("luxury") ||
    blob.includes("lujo") ||
    blob.includes("5 estrellas") ||
    blob.includes("5 estrella") ||
    blob.includes("5★") ||
    blob.includes("5 stars");

  if (stars === null) return true;

  switch (hotelLevel) {
    case "luxury":
      return stars >= 5 || luxuryText;
    case "premium":
      return stars >= 4;
    case "standard":
      return stars >= 3;
    default:
      return true;
  }
}

export function passesApiHotelLevelFilter(
  stars: number | string,
  hotelLevel: HotelLevel,
): boolean {
  const parsed =
    typeof stars === "number"
      ? stars
      : Number.parseInt(String(stars).trim(), 10);
  return passesHotelLevelFilter(
    Number.isFinite(parsed) && parsed > 0 ? { stars: parsed } : {},
    hotelLevel,
  );
}

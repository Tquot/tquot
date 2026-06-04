const ROOM_TYPE_PATTERN =
  /\b(habitaci[oó]n|room|suite|doble|double|twin|single|standard|deluxe|superior|estándar|estandar)\b/i;

export function parseHotelNightsFromTitle(title: string): number {
  const match = title.match(
    /—\s*(\d+)\s+(?:noche|noches|night|nights)\b/i,
  );
  if (!match) return 1;
  const nights = Number.parseInt(match[1], 10);
  return Number.isFinite(nights) && nights > 0 ? nights : 1;
}

export function parseHotelRoomTypeFromTitle(title: string): string | null {
  const separator = title.lastIndexOf(" · ");
  if (separator === -1) return null;
  const roomType = title.slice(separator + 3).trim();
  return roomType.length > 0 ? roomType : null;
}

export type ParsedHotelTitleContext = {
  name: string;
  stars: string | null;
  location: string | null;
  roomType: string | null;
};

export function parseHotelContextFromTitle(title: string): ParsedHotelTitleContext {
  const name = title.split(" — ")[0]?.trim() || title;
  const afterEmDash = title.includes(" — ")
    ? title.split(" — ").slice(1).join(" — ").trim()
    : "";
  const segments = afterEmDash
    .split(" · ")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const starsMatch = title.match(/(\d)\s*★/);
  const stars = starsMatch ? `${starsMatch[1]}★` : null;

  const restSegments = segments.slice(1);
  const lastSegment = restSegments[restSegments.length - 1] ?? null;
  const lastLooksLikeRoom =
    Boolean(lastSegment) && ROOM_TYPE_PATTERN.test(lastSegment);

  let roomType: string | null = null;
  let locationParts = restSegments;

  if (lastLooksLikeRoom) {
    roomType = lastSegment;
    locationParts = restSegments.slice(0, -1);
  } else {
    const trailing = parseHotelRoomTypeFromTitle(title);
    if (trailing && ROOM_TYPE_PATTERN.test(trailing)) {
      roomType = trailing;
      if (restSegments[restSegments.length - 1] === trailing) {
        locationParts = restSegments.slice(0, -1);
      }
    }
  }

  const location =
    locationParts
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join(" · ") || null;

  return { name, stars, location, roomType };
}

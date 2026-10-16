export type MapsLink =
  | { kind: "coords"; lat: number; lng: number }
  /** maps.app.goo.gl and goo.gl/maps links redirect, and the browser can't follow them. */
  | { kind: "short" }
  | { kind: "none" };

const NUM = String.raw`(-?\d{1,3}(?:\.\d+)?)`;

// Most precise first: the place's own pin (!3d…!4d…), then a q=/query=/ll=
// parameter, then the map's centre (@lat,lng).
const PATTERNS = [
  new RegExp(String.raw`!3d${NUM}!4d${NUM}`),
  new RegExp(String.raw`[?&](?:q|query|ll|destination|center)=${NUM},\s*${NUM}`),
  new RegExp(String.raw`@${NUM},${NUM}`),
];

/** Reads a pin from a full Google Maps link. */
export function parseMapsUrl(input: string): MapsLink {
  const raw = input.trim();
  if (!raw) return { kind: "none" };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { kind: "none" };
  }
  const host = url.hostname.toLowerCase();
  if (host === "maps.app.goo.gl" || (host === "goo.gl" && url.pathname.startsWith("/maps"))) {
    return { kind: "short" };
  }

  let text: string;
  try {
    text = decodeURIComponent(raw);
  } catch {
    text = raw;
  }
  for (const pattern of PATTERNS) {
    const m = text.match(pattern);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { kind: "coords", lat, lng };
  }
  return { kind: "none" };
}

/** A link that opens a pin in Google Maps, without the paid Maps API. */
export function mapsPinUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

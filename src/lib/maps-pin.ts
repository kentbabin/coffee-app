import "server-only";
import { parseMapsUrl } from "@/lib/maps";

/**
 * The pin in a Google Maps link. Short share links (maps.app.goo.gl) carry no
 * coordinates, so they are followed here on the server, which the browser
 * can't do; the address they lead to has the pin. Null when there is none.
 */
export async function pinFromMapsUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  let link = parseMapsUrl(url);
  if (link.kind === "short") {
    try {
      const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(5000), headers: { "User-Agent": "Mozilla/5.0" } });
      // Where the redirects ended. A consent page keeps the target in its
      // "continue" parameter, which parseMapsUrl reads after decoding.
      link = parseMapsUrl(res.url);
    } catch {
      return null;
    }
  }
  return link.kind === "coords" ? { lat: link.lat, lng: link.lng } : null;
}

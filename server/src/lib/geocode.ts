const cache = new Map<string, string>();

/**
 * Nominatim's usage policy requires a descriptive User-Agent on server-side
 * requests (browser calls get a Referer instead, which is why the client's
 * own geocode.ts doesn't need one).
 */
const USER_AGENT = "FlowWatch/1.0 (flood-reporting hackathon project)";

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("zoom", "16");

  const fallback = `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = data.address ?? {};
    const short =
      a.road || a.suburb || a.neighbourhood || a.city_district || a.village || a.town || a.city;
    const region = a.city || a.county || a.state;
    const label =
      short && region && short !== region ? `${short}, ${region}` : short || region || data.display_name || fallback;
    cache.set(key, label);
    return label;
  } catch {
    return fallback;
  }
}

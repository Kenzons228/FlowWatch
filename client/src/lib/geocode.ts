export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

export async function searchPlace(query: string): Promise<GeocodeResult[]> {
  if (query.trim().length < 3) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return data.map((d) => ({
    label: d.display_name,
    lat: Number(d.lat),
    lng: Number(d.lon),
  }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("zoom", "14");

  const res = await fetch(url);
  if (!res.ok) return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  const data = (await res.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };
  const a = data.address ?? {};
  const short = a.suburb || a.city_district || a.neighbourhood || a.village || a.town || a.city;
  const region = a.city || a.county || a.state;
  if (short && region && short !== region) return `${short}, ${region}`;
  return short || region || data.display_name || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
}

const cache = new Map<string, number>();

export async function getElevation(lat: number, lng: number): Promise<number> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const url = new URL("https://api.open-meteo.com/v1/elevation");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Elevation request failed: ${res.status}`);
  const json = (await res.json()) as { elevation?: number[] };
  const elevation = json.elevation?.[0] ?? 0;
  cache.set(key, elevation);
  return elevation;
}

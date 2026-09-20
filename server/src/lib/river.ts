export interface RiverInfo {
  lat: number;
  lng: number;
  dischargeM3s: number;
  meanM3s: number;
  p75M3s: number;
  level: "normal" | "elevated" | "high";
  available: boolean;
}

const cache = new Map<string, { at: number; data: RiverInfo }>();
const CACHE_MS = 30 * 60 * 1000;

/**
 * River discharge from Open-Meteo's Flood API (backed by the Global Flood
 * Awareness System, GloFAS) — free, no key. Gives a real "is the nearest
 * river running higher than usual" signal instead of guessing from rainfall
 * alone.
 */
export async function getRiverDischarge(lat: number, lng: number): Promise<RiverInfo> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const url = new URL("https://flood-api.open-meteo.com/v1/flood");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("daily", "river_discharge,river_discharge_mean,river_discharge_p75");
  url.searchParams.set("forecast_days", "1");

  const fallback: RiverInfo = {
    lat,
    lng,
    dischargeM3s: 0,
    meanM3s: 0,
    p75M3s: 0,
    level: "normal",
    available: false,
  };

  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const json = (await res.json()) as {
      daily?: { river_discharge?: number[]; river_discharge_mean?: number[]; river_discharge_p75?: number[] };
    };
    const discharge = json.daily?.river_discharge?.[0];
    const mean = json.daily?.river_discharge_mean?.[0];
    const p75 = json.daily?.river_discharge_p75?.[0];
    if (discharge == null || mean == null || p75 == null) return fallback;

    const level: RiverInfo["level"] = discharge >= p75 ? "high" : discharge >= mean * 1.15 ? "elevated" : "normal";
    const data: RiverInfo = { lat, lng, dischargeM3s: discharge, meanM3s: mean, p75M3s: p75, level, available: true };
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    return fallback;
  }
}

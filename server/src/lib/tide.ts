export interface TideInfo {
  lat: number;
  lng: number;
  currentM: number;
  peakM: number;
  trend: "rising" | "falling" | "steady";
  nearPeak: boolean;
  available: boolean;
}

const cache = new Map<string, { at: number; data: TideInfo }>();
const CACHE_MS = 30 * 60 * 1000;

/**
 * Sea-level height from Open-Meteo's Marine API — free, no key. Only
 * meaningful for coastal locations; returns available:false inland (the API
 * itself returns nulls there rather than erroring).
 */
export async function getTide(lat: number, lng: number): Promise<TideInfo> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const url = new URL("https://marine-api.open-meteo.com/v1/marine");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("hourly", "sea_level_height_msl");
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "auto");

  const fallback: TideInfo = {
    lat,
    lng,
    currentM: 0,
    peakM: 0,
    trend: "steady",
    nearPeak: false,
    available: false,
  };

  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const json = (await res.json()) as {
      hourly?: { time?: string[]; sea_level_height_msl?: (number | null)[] };
    };
    const times = json.hourly?.time ?? [];
    const levels = json.hourly?.sea_level_height_msl ?? [];
    const nowIdx = Math.max(0, times.findIndex((t) => new Date(t).getTime() >= Date.now()));
    const current = levels[nowIdx];
    if (current == null) return fallback;

    const next = levels[nowIdx + 1] ?? current;
    const trend: TideInfo["trend"] = next > current + 0.02 ? "rising" : next < current - 0.02 ? "falling" : "steady";
    const window = levels.slice(nowIdx, nowIdx + 24).filter((v): v is number => v != null);
    const peakM = Math.max(current, ...window);
    const nearPeak = trend === "rising" && current >= peakM - 0.08;

    const data: TideInfo = { lat, lng, currentM: current, peakM, trend, nearPeak, available: true };
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    return fallback;
  }
}

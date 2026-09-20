export interface WeatherSnapshot {
  lat: number;
  lng: number;
  currentRainMm: number;
  currentPrecipProbability: number;
  hourly: { time: string; rainMm: number; precipProbability: number }[];
  fetchedAt: string;
}

const cache = new Map<string, { at: number; data: WeatherSnapshot }>();
const CACHE_MS = 5 * 60 * 1000;

export async function getWeather(lat: number, lng: number): Promise<WeatherSnapshot> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("current", "precipitation,rain");
  url.searchParams.set("hourly", "precipitation,precipitation_probability,rain");
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo request failed: ${res.status}`);
  const json = (await res.json()) as {
    current?: { rain?: number; precipitation?: number };
    hourly?: { time?: string[]; rain?: number[]; precipitation_probability?: number[] };
  };

  const times: string[] = json.hourly?.time ?? [];
  const rain: number[] = json.hourly?.rain ?? [];
  const prob: number[] = json.hourly?.precipitation_probability ?? [];

  const nowIdx = Math.max(
    0,
    times.findIndex((t) => new Date(t).getTime() >= Date.now())
  );

  const data: WeatherSnapshot = {
    lat,
    lng,
    currentRainMm: json.current?.rain ?? json.current?.precipitation ?? 0,
    currentPrecipProbability: prob[nowIdx] ?? 0,
    hourly: times.slice(nowIdx, nowIdx + 48).map((t, i) => ({
      time: t,
      rainMm: rain[nowIdx + i] ?? 0,
      precipProbability: prob[nowIdx + i] ?? 0,
    })),
    fetchedAt: new Date().toISOString(),
  };

  cache.set(key, { at: Date.now(), data });
  return data;
}

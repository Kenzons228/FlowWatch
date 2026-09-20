import type {
  ClassifyResult,
  DrainSeverity,
  ElevationInfo,
  FloodStatus,
  LatLng,
  Overview,
  PriorityItem,
  Report,
  RiskZone,
  RiverInfo,
  RouteCheckResult,
  TideInfo,
  WeatherSnapshot,
} from "./types";

// Empty in dev (Vite proxies /api to the local server) and when the client
// and server share an origin in production. Set VITE_API_BASE_URL when
// they're deployed as separate services (e.g. a static site + a web service).
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchReports(): Promise<Report[]> {
  const res = await fetch(`${API_BASE}/api/reports`);
  const data = await json<{ reports: Report[] }>(res);
  return data.reports;
}

export interface NewReportInput {
  kind: "drain" | "flood";
  status?: FloodStatus;
  severity?: DrainSeverity;
  description: string;
  lat: number;
  lng: number;
}

export async function submitReport(input: NewReportInput): Promise<Report> {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await json<{ report: Report }>(res);
  return data.report;
}

export async function voteOnReport(
  id: string,
  voterId: string,
  vote: "confirm" | "dispute"
): Promise<Report> {
  const res = await fetch(`${API_BASE}/api/reports/${id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voterId, vote }),
  });
  const data = await json<{ report: Report }>(res);
  return data.report;
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherSnapshot> {
  const res = await fetch(`${API_BASE}/api/weather?lat=${lat}&lng=${lng}`);
  return json<WeatherSnapshot>(res);
}

export async function fetchRiskZones(): Promise<RiskZone[]> {
  const res = await fetch(`${API_BASE}/api/risk`);
  const data = await json<{ zones: RiskZone[] }>(res);
  return data.zones;
}

export async function checkRoute(origin: LatLng, destination: LatLng): Promise<RouteCheckResult> {
  const res = await fetch(`${API_BASE}/api/route/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination }),
  });
  return json<RouteCheckResult>(res);
}

export async function classifyDescription(
  kind: "drain" | "flood",
  text: string
): Promise<ClassifyResult> {
  const res = await fetch(`${API_BASE}/api/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, text }),
  });
  return json<ClassifyResult>(res);
}

export async function fetchElevation(lat: number, lng: number): Promise<ElevationInfo> {
  const res = await fetch(`${API_BASE}/api/elevation?lat=${lat}&lng=${lng}`);
  return json<ElevationInfo>(res);
}

export async function fetchOverview(lat: number, lng: number, label: string): Promise<Overview> {
  const res = await fetch(
    `${API_BASE}/api/overview?lat=${lat}&lng=${lng}&label=${encodeURIComponent(label)}`
  );
  return json<Overview>(res);
}

export async function fetchPriorityQueue(lat: number, lng: number): Promise<PriorityItem[]> {
  const res = await fetch(`${API_BASE}/api/priority?lat=${lat}&lng=${lng}`);
  const data = await json<{ items: PriorityItem[] }>(res);
  return data.items;
}

export async function fetchEnvironment(
  lat: number,
  lng: number
): Promise<{ river: RiverInfo; tide: TideInfo }> {
  const res = await fetch(`${API_BASE}/api/environment?lat=${lat}&lng=${lng}`);
  return json<{ river: RiverInfo; tide: TideInfo }>(res);
}

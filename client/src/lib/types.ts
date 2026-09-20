export type ReportKind = "drain" | "flood";
export type FloodStatus = "flooded" | "caution";
export type DrainSeverity = "minor" | "moderate" | "severe";
export type ReportSource = "user" | "gdacs";

export interface Report {
  id: string;
  kind: ReportKind;
  status?: FloodStatus;
  severity?: DrainSeverity;
  description: string;
  lat: number;
  lng: number;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  voters: Record<string, "confirm" | "dispute">;
  resolved: boolean;
  source: ReportSource;
  externalId?: string;
  sourceLabel?: string;
  sourceUrl?: string;
}

export interface RiskZone {
  id: string;
  lat: number;
  lng: number;
  radiusM: number;
  score: number;
  level: "low" | "medium" | "high";
  reportCount: number;
  rainMm: number;
  elevationM: number;
  riverLevel: "normal" | "elevated" | "high";
}

export interface RiverInfo {
  lat: number;
  lng: number;
  dischargeM3s: number;
  meanM3s: number;
  p75M3s: number;
  level: "normal" | "elevated" | "high";
  available: boolean;
}

export interface TideInfo {
  lat: number;
  lng: number;
  currentM: number;
  peakM: number;
  trend: "rising" | "falling" | "steady";
  nearPeak: boolean;
  available: boolean;
}

export interface PriorityItem {
  report: Report;
  distanceKm: number;
  score: number;
  reasons: string[];
}

export interface WeatherSnapshot {
  lat: number;
  lng: number;
  currentRainMm: number;
  currentPrecipProbability: number;
  hourly: { time: string; rainMm: number; precipProbability: number }[];
  fetchedAt: string;
}

export interface ElevationInfo {
  lat: number;
  lng: number;
  meters: number;
  level: "low" | "moderate" | "high";
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteIntersection {
  reportId: string;
  status?: FloodStatus;
  description: string;
  lat: number;
  lng: number;
  distanceM: number;
  source?: ReportSource;
  sourceLabel?: string;
}

export interface RouteOption {
  geometry: LatLng[];
  distanceM: number;
  durationS: number;
  intersections: RouteIntersection[];
  severity: "clear" | "caution" | "flooded";
  avoidsHazard?: boolean;
}

export interface RouteCheckResult {
  routes: RouteOption[];
  recommendedIndex: number;
  hasSafeRoute: boolean;
}

export interface ClassifyResult {
  suggested: string | null;
  confidence: "low" | "medium" | "high";
  matchedKeywords: string[];
}

export interface Overview {
  headline: string;
  narrative: string;
  suggestions: string[];
  stats: {
    rainNowMm: number;
    rainPeakMm: number;
    elevationM: number;
    activeFloodCount: number;
    activeDrainCount: number;
    topRiskZone: RiskZone | null;
    river: RiverInfo;
    tide: TideInfo;
  };
}

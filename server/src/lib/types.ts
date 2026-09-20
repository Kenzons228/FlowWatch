export type ReportKind = "drain" | "flood";
export type FloodStatus = "flooded" | "caution";
export type DrainSeverity = "minor" | "moderate" | "severe";
export type ReportSource = "user" | "gdacs";

export interface Report {
  id: string;
  kind: ReportKind;
  status?: FloodStatus; // kind === 'flood'
  severity?: DrainSeverity; // kind === 'drain'
  description: string;
  lat: number;
  lng: number;
  createdAt: string; // ISO
  upvotes: number; // "still there / confirmed"
  downvotes: number; // "cleared / disputed"
  voters: Record<string, "confirm" | "dispute">;
  resolved: boolean;
  source: ReportSource;
  externalId?: string; // set for source==='gdacs', used to upsert/expire on re-sync
  sourceLabel?: string; // e.g. "GDACS · Flood in Nepal" for popup attribution
  sourceUrl?: string;
}

export interface RiskZone {
  id: string;
  lat: number;
  lng: number;
  radiusM: number;
  score: number; // 0-10
  level: "low" | "medium" | "high";
  reportCount: number;
  rainMm: number;
  elevationM: number;
  riverLevel: "normal" | "elevated" | "high";
}

import { listReports } from "./store.js";
import { getWeather } from "./weather.js";
import { haversineMeters } from "./geo.js";
import type { Report } from "./types.js";

export interface PriorityItem {
  report: Report;
  distanceKm: number;
  score: number;
  reasons: string[];
}

const SEVERITY_WEIGHT: Record<string, number> = { minor: 1, moderate: 2, severe: 3 };

/**
 * Ranks unresolved drain reports the way a cleanup crew would prioritize a
 * work list: current blockage severity, how much rain is coming to that
 * exact spot in the next 12h, and how long it's been sitting unresolved.
 * Rule-based and explainable — every score comes with the reasons behind it.
 */
export async function computePriorityQueue(
  lat: number,
  lng: number,
  radiusKm = 30
): Promise<PriorityItem[]> {
  const reports = await listReports();
  const nearbyDrains = reports.filter(
    (r) =>
      r.kind === "drain" &&
      !r.resolved &&
      haversineMeters({ lat, lng }, { lat: r.lat, lng: r.lng }) <= radiusKm * 1000
  );

  const items = await Promise.all(
    nearbyDrains.map(async (report) => {
      const distanceKm = haversineMeters({ lat, lng }, { lat: report.lat, lng: report.lng }) / 1000;

      let rainPeak = 0;
      try {
        const weather = await getWeather(report.lat, report.lng);
        rainPeak = Math.max(0, ...weather.hourly.slice(0, 12).map((h) => h.rainMm));
      } catch {
        rainPeak = 0;
      }

      const ageHours = (Date.now() - new Date(report.createdAt).getTime()) / 3_600_000;
      const severityWeight = SEVERITY_WEIGHT[report.severity ?? "minor"] ?? 1;
      const rainScore = Math.min(4, rainPeak * 0.5);
      const ageBonus = Math.min(2, ageHours / 48);
      const trustBonus = report.upvotes - report.downvotes >= 3 ? 1 : 0;
      const score = Math.round((severityWeight * 2 + rainScore + ageBonus + trustBonus) * 10) / 10;

      const reasons: string[] = [];
      if (rainPeak >= 4) reasons.push(`${rainPeak.toFixed(1)}mm/h rain expected here soon`);
      if (report.severity === "severe") reasons.push("Reported fully blocked");
      if (ageHours > 48) reasons.push(`Unresolved for ${Math.round(ageHours / 24)} day(s)`);
      if (trustBonus > 0) reasons.push("Confirmed by multiple residents");
      if (reasons.length === 0) reasons.push("Routine cleanup");

      return { report, distanceKm, score, reasons };
    })
  );

  return items.sort((a, b) => b.score - a.score);
}

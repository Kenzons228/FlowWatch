import { listReports } from "./store.js";
import { gridKey } from "./geo.js";
import { getWeather } from "./weather.js";
import { getElevation } from "./elevation.js";
import { getRiverDischarge } from "./river.js";
import type { RiskZone } from "./types.js";

export async function computeRiskZones(): Promise<RiskZone[]> {
  const reports = await listReports();
  const drainReports = reports.filter((r) => r.kind === "drain" && !r.resolved);

  const clusters = new Map<string, { lat: number; lng: number; count: number }>();
  for (const r of drainReports) {
    const key = gridKey({ lat: r.lat, lng: r.lng });
    const existing = clusters.get(key);
    if (existing) {
      existing.lat = (existing.lat * existing.count + r.lat) / (existing.count + 1);
      existing.lng = (existing.lng * existing.count + r.lng) / (existing.count + 1);
      existing.count += 1;
    } else {
      clusters.set(key, { lat: r.lat, lng: r.lng, count: 1 });
    }
  }

  const zones: RiskZone[] = [];
  let i = 0;
  for (const [key, cluster] of clusters) {
    i += 1;
    let rainMm = 0;
    try {
      const weather = await getWeather(cluster.lat, cluster.lng);
      rainMm = Math.max(weather.currentRainMm, weather.hourly[0]?.rainMm ?? 0);
    } catch {
      rainMm = 0;
    }

    let elevationM = 20;
    try {
      elevationM = await getElevation(cluster.lat, cluster.lng);
    } catch {
      elevationM = 20;
    }

    let riverLevel: RiskZone["riverLevel"] = "normal";
    try {
      const river = await getRiverDischarge(cluster.lat, cluster.lng);
      if (river.available) riverLevel = river.level;
    } catch {
      riverLevel = "normal";
    }

    // Rule-based score, deliberately simple and explainable (no ML):
    // report density (~6 pts) + live rainfall (~6 pts) + low-lying ground
    // (~2 pts) + a nearby river running above its usual level (~1.5 pts).
    const densityScore = Math.min(cluster.count * 2, 6);
    const rainScore = Math.min(rainMm * 1.5, 6);
    const elevationScore = elevationM < 8 ? 2 : elevationM < 25 ? 1 : 0;
    const riverScore = riverLevel === "high" ? 1.5 : riverLevel === "elevated" ? 0.75 : 0;
    const score = Math.min(
      10,
      Math.round((densityScore + rainScore + elevationScore + riverScore) * 10) / 10
    );

    if (score < 2) continue; // not worth flagging

    const level: RiskZone["level"] = score >= 6.5 ? "high" : score >= 4 ? "medium" : "low";

    zones.push({
      id: `zone-${key}-${i}`,
      lat: cluster.lat,
      lng: cluster.lng,
      radiusM: 350 + cluster.count * 60,
      score,
      level,
      reportCount: cluster.count,
      rainMm,
      elevationM,
      riverLevel,
    });
  }

  return zones;
}

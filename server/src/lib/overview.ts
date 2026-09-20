import { listReports } from "./store.js";
import { computeRiskZones } from "./risk.js";
import { getWeather } from "./weather.js";
import { getElevation } from "./elevation.js";
import { getRiverDischarge } from "./river.js";
import { getTide } from "./tide.js";
import { haversineMeters } from "./geo.js";
import { reverseGeocode } from "./geocode.js";
import type { RiskZone } from "./types.js";
import type { RiverInfo } from "./river.js";
import type { TideInfo } from "./tide.js";

const NEARBY_RADIUS_M = 25000;

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

/**
 * Deterministic, template-based "AI Overview" generator. It reads live
 * weather + elevation + river discharge + tide + crowdsourced report/risk
 * data and writes a short plain-language briefing — no external LLM call,
 * so it's instant, free, and fully explainable from the numbers in `stats`.
 */
export async function generateOverview(lat: number, lng: number, label: string): Promise<Overview> {
  const [weather, zones, reports, elevationM, river, tide] = await Promise.all([
    getWeather(lat, lng),
    computeRiskZones(),
    listReports(),
    getElevation(lat, lng).catch(() => 20),
    getRiverDischarge(lat, lng),
    getTide(lat, lng),
  ]);

  const nearbyZones = zones
    .filter((z) => haversineMeters({ lat, lng }, { lat: z.lat, lng: z.lng }) <= NEARBY_RADIUS_M)
    .sort((a, b) => b.score - a.score);

  const nearbyReports = reports.filter(
    (r) => haversineMeters({ lat, lng }, { lat: r.lat, lng: r.lng }) <= NEARBY_RADIUS_M
  );
  const activeFloodCount = nearbyReports.filter((r) => r.kind === "flood" && !r.resolved).length;
  const activeDrainCount = nearbyReports.filter((r) => r.kind === "drain" && !r.resolved).length;

  const rainNowMm = weather.currentRainMm;
  const rainPeakMm = Math.max(0, ...weather.hourly.slice(0, 12).map((h) => h.rainMm));
  const topRiskZone = nearbyZones[0] ?? null;

  const lowLying = elevationM < 8;
  const riverHigh = river.available && river.level !== "normal";
  const tideRisk = tide.available && tide.nearPeak;

  // Headlines about a specific hazard point (a flooded road, a risk zone)
  // name that hazard's own place, not the broad city/region the user
  // picked at the start — that's the whole point of pinning it on the map.
  let headline: string;
  if (topRiskZone && topRiskZone.level === "high") {
    const zoneLabel = await reverseGeocode(topRiskZone.lat, topRiskZone.lng);
    headline = `${zoneLabel} has a high flood-risk zone active right now.`;
  } else if (activeFloodCount > 0) {
    const activeFloods = nearbyReports
      .filter((r) => r.kind === "flood" && !r.resolved)
      .sort(
        (a, b) =>
          haversineMeters({ lat, lng }, { lat: a.lat, lng: a.lng }) -
          haversineMeters({ lat, lng }, { lat: b.lat, lng: b.lng })
      );
    // Naming one road's street when several are flooded across different
    // parts of town would misleadingly point at just one of them — only
    // get specific when they're all in roughly the same immediate area.
    const spreadM = Math.max(
      0,
      ...activeFloods.map((r) => haversineMeters(activeFloods[0], { lat: r.lat, lng: r.lng }))
    );
    const sameArea = activeFloods.length === 1 || spreadM <= 3000;
    const roadLabel = sameArea ? await reverseGeocode(activeFloods[0].lat, activeFloods[0].lng) : label;
    headline = `${activeFloodCount} road${activeFloodCount > 1 ? "s" : ""} flagged flooded near ${roadLabel}.`;
  } else if (river.level === "high") {
    headline = `River levels near ${label} are running high.`;
  } else if (rainPeakMm >= 8) {
    headline = `Heavy rain expected near ${label} in the next few hours.`;
  } else {
    headline = `${label} looks calm right now.`;
  }

  const narrativeParts: string[] = [];
  narrativeParts.push(
    rainNowMm > 0.2
      ? `It's currently raining ${rainNowMm.toFixed(1)} mm/h at ${label}, with up to ${rainPeakMm.toFixed(
          1
        )} mm/h forecast in the next 12 hours.`
      : `No significant rain right now at ${label}, but up to ${rainPeakMm.toFixed(
          1
        )} mm/h is forecast in the next 12 hours.`
  );

  if (lowLying) {
    narrativeParts.push(
      `The area sits at roughly ${Math.round(
        elevationM
      )}m above sea level — low-lying ground like this drains slower and floods faster than higher districts.`
    );
  }

  if (riverHigh) {
    narrativeParts.push(
      `The nearest modelled river reach is discharging ${river.dischargeM3s.toFixed(0)} m³/s — ${
        river.level === "high" ? "above its usual 75th-percentile range" : "running above its typical level"
      } for this time of year, per the Global Flood Awareness System.`
    );
  }

  if (tideRisk) {
    narrativeParts.push(
      `Sea level is rising toward high tide (${tide.currentM.toFixed(
        1
      )}m), which can back up coastal drains right when rain needs somewhere to go.`
    );
  }

  if (activeDrainCount > 0) {
    narrativeParts.push(
      `There ${activeDrainCount === 1 ? "is" : "are"} ${activeDrainCount} unresolved blocked-drain report${
        activeDrainCount > 1 ? "s" : ""
      } nearby — each one is a preventable flood waiting to happen.`
    );
  }

  if (activeFloodCount > 0) {
    narrativeParts.push(
      `${activeFloodCount} nearby road${activeFloodCount > 1 ? "s are" : " is"} currently reported as flooded or under caution.`
    );
  }

  const suggestions: string[] = [];
  if (topRiskZone) {
    suggestions.push(
      `Elevated flood risk (${topRiskZone.score.toFixed(1)}/10) detected ${Math.round(
        haversineMeters({ lat, lng }, { lat: topRiskZone.lat, lng: topRiskZone.lng }) / 1000
      )}km away — worth checking the map before travelling that direction.`
    );
  }
  if (riverHigh) {
    suggestions.push("River discharge is elevated — clear drains near waterways before the next rain compounds it.");
  }
  if (tideRisk) {
    suggestions.push("High tide is approaching — low coastal roads may drain slower than usual today.");
  }
  if (activeDrainCount > 0) {
    suggestions.push("Report or flag drain cleanups on the map to help lower risk in that area.");
  }
  if (activeFloodCount > 0) {
    suggestions.push("Use Route Check before heading out to avoid roads currently flagged flooded — fewer cars stranded means less wasted fuel too.");
  }
  if (rainPeakMm >= 8 && activeDrainCount === 0 && activeFloodCount === 0 && !riverHigh) {
    suggestions.push("Rain is picking up — keep an eye on the map as new reports come in.");
  }
  if (suggestions.length === 0) {
    suggestions.push("No active hazards nearby — a good time to check for early drain blockages before the next rain.");
  }

  return {
    headline,
    narrative: narrativeParts.join(" "),
    suggestions,
    stats: {
      rainNowMm,
      rainPeakMm,
      elevationM,
      activeFloodCount,
      activeDrainCount,
      topRiskZone,
      river,
      tide,
    },
  };
}

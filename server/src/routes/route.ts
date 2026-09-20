import { Router } from "express";
import { listReports } from "../lib/store.js";
import { bearingDeg, destinationPoint, pointToPolylineMeters, type LatLng } from "../lib/geo.js";
import type { Report } from "../lib/types.js";

const router = Router();

const FLOODED_BUFFER_M = 120;
const CAUTION_BUFFER_M = 70;
// GDACS alerts are a single centroid for a country/region-scale disaster,
// not a precise road point — a road-sized buffer would almost never trigger.
const REGIONAL_ALERT_BUFFER_M = 15000;

interface OsrmRoute {
  geometry: { coordinates: [number, number][] };
  distance: number;
  duration: number;
}

interface RouteOption {
  geometry: LatLng[];
  distanceM: number;
  durationS: number;
  intersections: ReturnType<typeof buildIntersections>;
  severity: "clear" | "caution" | "flooded";
  avoidsHazard?: boolean;
}

function buildIntersections(line: LatLng[], activeFlood: Report[]) {
  return activeFlood
    .map((report) => {
      const distanceM = pointToPolylineMeters({ lat: report.lat, lng: report.lng }, line);
      const buffer =
        report.source === "gdacs"
          ? REGIONAL_ALERT_BUFFER_M
          : report.status === "flooded"
          ? FLOODED_BUFFER_M
          : CAUTION_BUFFER_M;
      return { report, distanceM, hits: distanceM <= buffer };
    })
    .filter((x) => x.hits)
    .sort((a, b) => a.distanceM - b.distanceM)
    .map((x) => ({
      reportId: x.report.id,
      status: x.report.status,
      description: x.report.description,
      lat: x.report.lat,
      lng: x.report.lng,
      distanceM: Math.round(x.distanceM),
      source: x.report.source,
      sourceLabel: x.report.sourceLabel,
    }));
}

function toRouteOption(r: OsrmRoute, activeFlood: Report[]): RouteOption {
  const line: LatLng[] = r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  const intersections = buildIntersections(line, activeFlood);
  const hasFlooded = intersections.some((x) => x.status === "flooded");
  const hasCaution = intersections.some((x) => x.status === "caution");
  return {
    geometry: line,
    distanceM: Math.round(r.distance),
    durationS: Math.round(r.duration),
    intersections,
    severity: hasFlooded ? "flooded" : hasCaution ? "caution" : "clear",
  };
}

async function fetchOsrm(points: LatLng[], alternatives: boolean): Promise<OsrmRoute[] | null> {
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url =
    `https://router.project-osrm.org/route/v1/driving/${coords}` +
    `?alternatives=${alternatives}&overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { code: string; routes?: OsrmRoute[] };
    if (json.code !== "Ok" || !json.routes?.length) return null;
    return json.routes;
  } catch {
    return null;
  }
}

/**
 * OSRM's public server has no "avoid this area" option, so a hazard-avoiding
 * route is approximated by forcing a via-waypoint just off to the side of the
 * blocking hazard — far enough past its buffer that OSRM's shortest path
 * naturally routes around it instead of through it.
 */
async function buildDetourRoute(
  origin: LatLng,
  destination: LatLng,
  hazard: { lat: number; lng: number; status?: string },
  activeFlood: Report[]
): Promise<RouteOption | null> {
  const routeBearing = bearingDeg(origin, destination);
  const buffer = hazard.status === "flooded" ? FLOODED_BUFFER_M : CAUTION_BUFFER_M;
  const offsetM = Math.max(400, buffer * 4);

  for (const perp of [routeBearing + 90, routeBearing - 90]) {
    const via = destinationPoint({ lat: hazard.lat, lng: hazard.lng }, perp, offsetM);
    const osrmRoutes = await fetchOsrm([origin, via, destination], false);
    if (!osrmRoutes?.length) continue;
    const option = toRouteOption(osrmRoutes[0], activeFlood);
    if (option.severity === "clear") {
      return { ...option, avoidsHazard: true };
    }
  }
  return null;
}

router.post("/check", async (req, res) => {
  const { origin, destination } = req.body as { origin?: LatLng; destination?: LatLng };

  if (!origin || !destination) {
    res.status(400).json({ error: "origin and destination ({lat,lng}) are required" });
    return;
  }

  const osrmRoutes = await fetchOsrm([origin, destination], true);
  if (!osrmRoutes) {
    res.status(422).json({ error: "No route found between those points" });
    return;
  }

  const reports = await listReports();
  const activeFlood = reports.filter((r) => r.kind === "flood" && !r.resolved);

  const routes = osrmRoutes.map((r) => toRouteOption(r, activeFlood));

  const hasSafeRoute = routes.some((r) => r.severity === "clear");

  if (!hasSafeRoute) {
    const best = routes.reduce(
      (bestIdx, r, idx, arr) =>
        r.intersections.length < arr[bestIdx].intersections.length ? idx : bestIdx,
      0
    );
    // Only user reports are worth detouring around — a GDACS alert's buffer
    // spans an entire region, so no local via-point detour can escape it.
    const blockingHazards = routes[best].intersections
      .filter((x) => x.source !== "gdacs")
      .slice(0, 2);

    const detours = (
      await Promise.all(
        blockingHazards.map((hazard) => buildDetourRoute(origin, destination, hazard, activeFlood))
      )
    ).filter((r): r is RouteOption => r !== null);

    for (const detour of detours) {
      const isDuplicate = routes.some((r) => Math.abs(r.distanceM - detour.distanceM) < 50);
      if (!isDuplicate) routes.push(detour);
    }
  }

  const safeIndex = routes.findIndex((r) => r.severity === "clear");
  const recommendedIndex =
    safeIndex >= 0
      ? safeIndex
      : routes.reduce(
          (bestIdx, r, idx, arr) =>
            r.intersections.length < arr[bestIdx].intersections.length ? idx : bestIdx,
          0
        );

  res.json({
    routes,
    recommendedIndex,
    hasSafeRoute: safeIndex >= 0,
  });
});

export default router;

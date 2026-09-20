export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Project lat/lng to local flat meters around a reference latitude. Good enough at city scale. */
function toLocalXY(p: LatLng, refLat: number): { x: number; y: number } {
  const mPerDegLat = 110574;
  const mPerDegLng = 111320 * Math.cos((refLat * Math.PI) / 180);
  return { x: p.lng * mPerDegLng, y: p.lat * mPerDegLat };
}

export function pointToSegmentMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const refLat = p.lat;
  const P = toLocalXY(p, refLat);
  const A = toLocalXY(a, refLat);
  const B = toLocalXY(b, refLat);
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((P.x - A.x) * dx + (P.y - A.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = A.x + t * dx;
  const projY = A.y + t * dy;
  return Math.hypot(P.x - projX, P.y - projY);
}

export function pointToPolylineMeters(p: LatLng, line: LatLng[]): number {
  if (line.length === 0) return Infinity;
  if (line.length === 1) return haversineMeters(p, line[0]);
  let min = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const d = pointToSegmentMeters(p, line[i], line[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

/** Simple fixed-size grid clustering, cell size in degrees (~0.0045 deg ~ 500m). */
export function gridKey(p: LatLng, cellDeg = 0.0045): string {
  const gx = Math.round(p.lat / cellDeg);
  const gy = Math.round(p.lng / cellDeg);
  return `${gx}:${gy}`;
}

export function bearingDeg(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Walk `distanceM` from `p` along compass `bearing` (degrees). */
export function destinationPoint(p: LatLng, bearing: number, distanceM: number): LatLng {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const delta = distanceM / EARTH_RADIUS_M;
  const theta = toRad(bearing);
  const lat1 = toRad(p.lat);
  const lng1 = toRad(p.lng);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(delta) + Math.cos(lat1) * Math.sin(delta) * Math.cos(theta)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(lat1),
      Math.cos(delta) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

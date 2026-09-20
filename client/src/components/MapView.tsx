import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Circle, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLng, Report, RiskZone, RouteOption } from "../lib/types";
import ReportPopupContent from "./ReportPopupContent";

export interface MapViewHandle {
  flyTo: (latlng: LatLng, zoom?: number) => void;
  fitBounds: (points: LatLng[]) => void;
}

interface Props {
  center: LatLng;
  reports: Report[];
  riskZones: RiskZone[];
  layers: { flood: boolean; drain: boolean; risk: boolean };
  pickingMode: string | null;
  onMapClick: (latlng: LatLng) => void;
  routes?: RouteOption[];
  selectedRouteIndex?: number;
  routeMarkers?: { origin?: LatLng; destination?: LatLng };
  voterId: string;
  onVoted: (report: Report) => void;
}

// Kept in a cool blue/violet family, deliberately far from the flood
// layer's red/amber palette so the two hazard types never look alike.
function drainColor(severity?: string) {
  if (severity === "severe") return "#7c3aed";
  if (severity === "moderate") return "#2563eb";
  return "#0891b2";
}

function drainIcon(severity: string | undefined) {
  const color = drainColor(severity);
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -18],
  });
}

function ClickCapture({ onClick, active }: { onClick: (latlng: LatLng) => void; active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const handler = (e: L.LeafletMouseEvent) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map, active, onClick]);
  return null;
}

function MapController({ innerRef }: { innerRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    innerRef.current = map;
  }, [map]);
  return null;
}

const riskColor = { low: "#e8a51c", medium: "#e8590c", high: "#d92d20" } as const;

const routeColor = { clear: "#2b8a3e", caution: "#e8a51c", flooded: "#d92d20" } as const;

const MapView = forwardRef<MapViewHandle, Props>(function MapView(
  { center, reports, riskZones, layers, pickingMode, onMapClick, routes, selectedRouteIndex, routeMarkers, voterId, onVoted },
  ref
) {
  const leafletMapRef = useRef<L.Map | null>(null);

  useImperativeHandle(ref, () => ({
    flyTo: (latlng, zoom = 15) => leafletMapRef.current?.flyTo([latlng.lat, latlng.lng], zoom),
    fitBounds: (points) => {
      if (!leafletMapRef.current || points.length === 0) return;
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      leafletMapRef.current.fitBounds(bounds, { padding: [60, 60] });
    },
  }));

  const floodReports = useMemo(
    () => reports.filter((r) => r.kind === "flood" && !r.resolved),
    [reports]
  );
  const drainReports = useMemo(
    () => reports.filter((r) => r.kind === "drain" && !r.resolved),
    [reports]
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      className="map-root"
      zoomControl={false}
    >
      <MapController innerRef={leafletMapRef} />
      <ClickCapture onClick={onMapClick} active={!!pickingMode} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {layers.risk &&
        riskZones.map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.lat, zone.lng]}
            radius={zone.radiusM}
            pathOptions={{
              color: riskColor[zone.level],
              weight: 1,
              fillColor: riskColor[zone.level],
              fillOpacity: 0.14,
              dashArray: "5 4",
            }}
          >
            <Popup>
              <div className="risk-popup">
                <div className="level" style={{ color: riskColor[zone.level] }}>
                  {zone.level} flood risk
                </div>
                <div>Score {zone.score.toFixed(1)} / 10</div>
                <div>{zone.reportCount} unresolved drain report(s) nearby</div>
                <div>{zone.rainMm.toFixed(1)} mm/h rain right now</div>
              </div>
            </Popup>
          </Circle>
        ))}

      {layers.flood &&
        floodReports.map((r) => {
          const isExternal = r.source === "gdacs";
          const color = r.status === "flooded" ? "#d92d20" : "#e8a51c";
          return (
            <Circle
              key={r.id}
              center={[r.lat, r.lng]}
              radius={isExternal ? 12000 : 90}
              pathOptions={{
                color,
                weight: 2,
                fillColor: color,
                fillOpacity: isExternal ? 0.12 : 0.4,
                dashArray: isExternal ? "8 6" : undefined,
              }}
            >
              <Popup minWidth={230}>
                <ReportPopupContent report={r} voterId={voterId} onVoted={onVoted} />
              </Popup>
            </Circle>
          );
        })}

      {layers.drain &&
        drainReports.map((r) => (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={drainIcon(r.severity)}>
            <Popup minWidth={230}>
              <ReportPopupContent report={r} voterId={voterId} onVoted={onVoted} />
            </Popup>
          </Marker>
        ))}

      {routes?.map((route, i) => (
        <Polyline
          key={i}
          positions={route.geometry.map((p) => [p.lat, p.lng])}
          pathOptions={{
            color: i === selectedRouteIndex ? routeColor[route.severity] : "#94a3b8",
            weight: i === selectedRouteIndex ? 6 : 3,
            opacity: i === selectedRouteIndex ? 0.9 : 0.5,
            dashArray: i === selectedRouteIndex ? undefined : "6 6",
          }}
        />
      ))}

      {routeMarkers?.origin && (
        <Circle
          center={[routeMarkers.origin.lat, routeMarkers.origin.lng]}
          radius={40}
          pathOptions={{ color: "#0f5fa8", fillColor: "#0f5fa8", fillOpacity: 0.8 }}
        />
      )}
      {routeMarkers?.destination && (
        <Circle
          center={[routeMarkers.destination.lat, routeMarkers.destination.lng]}
          radius={40}
          pathOptions={{ color: "#1a2330", fillColor: "#1a2330", fillOpacity: 0.8 }}
        />
      )}
    </MapContainer>
  );
});

export default MapView;

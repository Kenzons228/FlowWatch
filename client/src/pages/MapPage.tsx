import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation as useRouterLocation } from "react-router-dom";
import MapView, { type MapViewHandle } from "../components/MapView";
import TopBar from "../components/TopBar";
import Legend from "../components/Legend";
import ReportModal, { type ReportDraft } from "../components/ReportModal";
import RoutePanel from "../components/RoutePanel";
import { checkRoute, fetchReports, fetchRiskZones, fetchWeather, submitReport } from "../lib/api";
import { getVoterId } from "../lib/voterId";
import { reverseGeocode } from "../lib/geocode";
import { useAppStore } from "../store/useAppStore";
import { MapPinIcon } from "../components/icons";
import type { LatLng, Report, RiskZone, RouteCheckResult, WeatherSnapshot } from "../lib/types";

const emptyDraft: ReportDraft = {
  kind: "flood",
  status: "flooded",
  severity: "minor",
  description: "",
  lat: null,
  lng: null,
  locationLabel: null,
  resolvingLocation: false,
};

type Panel = "report" | "route" | null;
type PickingMode = null | "report" | "route-origin" | "route-destination";

export default function MapPage() {
  const appLocation = useAppStore((s) => s.location);
  const routerLocation = useRouterLocation();
  const mapRef = useRef<MapViewHandle>(null);
  const voterId = useRef(getVoterId()).current;
  const initialCenter = useRef<LatLng>({ lat: appLocation.lat, lng: appLocation.lng }).current;

  const [reports, setReports] = useState<Report[]>([]);
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [layers, setLayers] = useState({ flood: true, drain: true, risk: true });

  const [panel, setPanel] = useState<Panel>(null);
  const [picking, setPicking] = useState<PickingMode>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [draft, setDraft] = useState<ReportDraft>(emptyDraft);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [origin, setOrigin] = useState<{ label: string; latlng: LatLng | null }>({
    label: "",
    latlng: null,
  });
  const [destination, setDestination] = useState<{ label: string; latlng: LatLng | null }>({
    label: "",
    latlng: null,
  });
  const [routeResult, setRouteResult] = useState<RouteCheckResult | null>(null);
  const [routeChecking, setRouteChecking] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const refreshReports = useCallback(() => {
    fetchReports().then(setReports).catch(() => {});
  }, []);
  const refreshRisk = useCallback(() => {
    fetchRiskZones().then(setRiskZones).catch(() => {});
  }, []);

  useEffect(() => {
    refreshReports();
    refreshRisk();
    const reportsTimer = setInterval(refreshReports, 25000);
    const riskTimer = setInterval(refreshRisk, 60000);
    return () => {
      clearInterval(reportsTimer);
      clearInterval(riskTimer);
    };
  }, [refreshReports, refreshRisk]);

  const firstLocationRun = useRef(true);
  useEffect(() => {
    fetchWeather(appLocation.lat, appLocation.lng).then(setWeather).catch(() => {});
    if (firstLocationRun.current) {
      firstLocationRun.current = false;
      return;
    }
    mapRef.current?.flyTo({ lat: appLocation.lat, lng: appLocation.lng }, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appLocation.lat, appLocation.lng]);

  useEffect(() => {
    const weatherTimer = setInterval(() => {
      fetchWeather(appLocation.lat, appLocation.lng).then(setWeather).catch(() => {});
    }, 5 * 60000);
    return () => clearInterval(weatherTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appLocation.lat, appLocation.lng]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const navState = routerLocation.state as { openReport?: boolean; openRoute?: boolean } | null;
  useEffect(() => {
    if (navState?.openReport) openReportFlow();
    else if (navState?.openRoute) openRouteFlow();
    // routerLocation.key changes on every navigation, even repeat ones to
    // this same route — that's what makes clicking "Check route"/"Report
    // hazard" from Home work every time, not just the first.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.key]);

  function toggleLayer(key: "flood" | "drain" | "risk") {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleVoted(updated: Report) {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    // A cleared drain report can be the only thing propping up a nearby
    // risk zone — recompute right away instead of waiting for the next
    // periodic refresh so the zone disappears in step with the marker.
    if (updated.kind === "drain") refreshRisk();
  }

  function openReportFlow() {
    setDraft(emptyDraft);
    setSubmitError(null);
    setLocationError(null);
    setPanel("report");
    locateMe();
  }

  function resolveDraftLocation(latlng: LatLng) {
    setDraft((d) => ({ ...d, lat: latlng.lat, lng: latlng.lng, locationLabel: null, resolvingLocation: true }));
    reverseGeocode(latlng.lat, latlng.lng)
      .then((label) => {
        setDraft((d) =>
          d.lat === latlng.lat && d.lng === latlng.lng ? { ...d, locationLabel: label, resolvingLocation: false } : d
        );
      })
      .catch(() => {
        setDraft((d) =>
          d.lat === latlng.lat && d.lng === latlng.lng ? { ...d, resolvingLocation: false } : d
        );
      });
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation isn't available — pick a location on the map instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolveDraftLocation(latlng);
        setLocationError(null);
        setLocating(false);
        mapRef.current?.flyTo(latlng, 16);
      },
      () => {
        setLocationError("Couldn't get your location — pick a spot on the map instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function handlePickOnMap() {
    setPanel(null);
    setPicking("report");
  }

  function handleMapClick(latlng: LatLng) {
    if (picking === "report") {
      resolveDraftLocation(latlng);
      setPicking(null);
      setPanel("report");
    } else if (picking === "route-origin") {
      setOrigin({ label: `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)} — locating…`, latlng });
      setPicking(null);
      setPanel("route");
      reverseGeocode(latlng.lat, latlng.lng).then((label) => {
        setOrigin((o) => (o.latlng === latlng ? { label, latlng } : o));
      });
    } else if (picking === "route-destination") {
      setDestination({ label: `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)} — locating…`, latlng });
      setPicking(null);
      setPanel("route");
      reverseGeocode(latlng.lat, latlng.lng).then((label) => {
        setDestination((d) => (d.latlng === latlng ? { label, latlng } : d));
      });
    }
  }

  async function handleSubmitReport() {
    if (draft.lat === null || draft.lng === null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const report = await submitReport({
        kind: draft.kind,
        status: draft.kind === "flood" ? draft.status : undefined,
        severity: draft.kind === "drain" ? draft.severity : undefined,
        description: draft.description,
        lat: draft.lat,
        lng: draft.lng,
      });
      setReports((prev) => [report, ...prev]);
      setPanel(null);
      setToast("Report submitted — thanks for helping keep this area flowing.");
      mapRef.current?.flyTo({ lat: report.lat, lng: report.lng }, 16);
      refreshRisk();
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleViewWorld() {
    const active = reports.filter((r) => !r.resolved);
    if (active.length === 0) return;
    mapRef.current?.fitBounds(active.map((r) => ({ lat: r.lat, lng: r.lng })));
  }

  function openRouteFlow() {
    setRouteResult(null);
    setRouteError(null);
    setPanel("route");
  }

  async function handleCheckRoute() {
    if (!origin.latlng || !destination.latlng) return;
    setRouteChecking(true);
    setRouteError(null);
    try {
      const result = await checkRoute(origin.latlng, destination.latlng);
      setRouteResult(result);
      setSelectedRouteIndex(result.recommendedIndex);
      const route = result.routes[result.recommendedIndex];
      if (route) mapRef.current?.fitBounds(route.geometry);
    } catch (err) {
      setRouteError((err as Error).message);
    } finally {
      setRouteChecking(false);
    }
  }

  return (
    <div className="page map-page">
      <MapView
        ref={mapRef}
        center={initialCenter}
        reports={reports}
        riskZones={riskZones}
        layers={layers}
        pickingMode={picking}
        onMapClick={handleMapClick}
        routes={routeResult?.routes}
        selectedRouteIndex={selectedRouteIndex}
        routeMarkers={{ origin: origin.latlng ?? undefined, destination: destination.latlng ?? undefined }}
        voterId={voterId}
        onVoted={handleVoted}
      />

      <TopBar
        weather={weather}
        layers={layers}
        onToggleLayer={toggleLayer}
        onOpenRoute={openRouteFlow}
        onViewWorld={handleViewWorld}
        worldReportCount={reports.filter((r) => !r.resolved).length}
      />
      <Legend />

      <div className="fab-stack">
        <button className="fab fab-primary" onClick={openReportFlow}>
          <MapPinIcon size={16} /> Report hazard
        </button>
      </div>

      {picking && (
        <div className="picking-banner">
          {picking === "report" && "Tap the map to drop a pin for your report"}
          {picking === "route-origin" && "Tap the map to set your starting point"}
          {picking === "route-destination" && "Tap the map to set your destination"}
          <button
            onClick={() => {
              setPicking(null);
              setPanel(picking === "report" ? "report" : "route");
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {panel === "report" && (
        <ReportModal
          draft={draft}
          onChange={(partial) => setDraft((d) => ({ ...d, ...partial }))}
          onClose={() => setPanel(null)}
          onPickOnMap={handlePickOnMap}
          onUseMyLocation={locateMe}
          locating={locating}
          locationError={locationError}
          onSubmit={handleSubmitReport}
          submitting={submitting}
          submitError={submitError}
        />
      )}

      {panel === "route" && (
        <RoutePanel
          onClose={() => setPanel(null)}
          origin={origin}
          destination={destination}
          onSetOrigin={(label, latlng) => setOrigin({ label, latlng })}
          onSetDestination={(label, latlng) => setDestination({ label, latlng })}
          onPickOnMap={(which) => {
            setPanel(null);
            setPicking(which === "origin" ? "route-origin" : "route-destination");
          }}
          onCheck={handleCheckRoute}
          checking={routeChecking}
          error={routeError}
          result={routeResult}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRoute={setSelectedRouteIndex}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

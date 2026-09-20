import { useEffect, useRef, useState } from "react";
import type { LatLng, RouteCheckResult } from "../lib/types";
import { searchPlace, type GeocodeResult } from "../lib/geocode";

interface PointState {
  label: string;
  latlng: LatLng | null;
}

interface Props {
  onClose: () => void;
  origin: PointState;
  destination: PointState;
  onSetOrigin: (label: string, latlng: LatLng | null) => void;
  onSetDestination: (label: string, latlng: LatLng | null) => void;
  onPickOnMap: (which: "origin" | "destination") => void;
  onCheck: () => void;
  checking: boolean;
  error: string | null;
  result: RouteCheckResult | null;
  selectedRouteIndex: number;
  onSelectRoute: (index: number) => void;
}

function PlaceField({
  placeholder,
  value,
  onSelect,
  onPick,
}: {
  placeholder: string;
  value: string;
  onSelect: (label: string, latlng: LatLng) => void;
  onPick: () => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setQuery(value), [value]);

  function handleChange(v: string) {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const r = await searchPlace(v);
      setResults(r);
      setOpen(r.length > 0);
    }, 400);
  }

  return (
    <div className="route-input-row">
      <div className="location-box">
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        <button type="button" onClick={onPick}>
          Pin
        </button>
      </div>
      {open && (
        <div className="route-suggestions">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setQuery(r.label);
                onSelect(r.label, { lat: r.lat, lng: r.lng });
                setOpen(false);
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoutePanel({
  onClose,
  origin,
  destination,
  onSetOrigin,
  onSetDestination,
  onPickOnMap,
  onCheck,
  checking,
  error,
  result,
  selectedRouteIndex,
  onSelectRoute,
}: Props) {
  const canCheck = !!origin.latlng && !!destination.latlng && !checking;
  const selected = result?.routes[selectedRouteIndex];

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>Check your route</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="field">
          <label>From</label>
          <PlaceField
            placeholder="Starting point"
            value={origin.label}
            onSelect={onSetOrigin}
            onPick={() => onPickOnMap("origin")}
          />
        </div>

        <div className="field">
          <label>To</label>
          <PlaceField
            placeholder="Destination"
            value={destination.label}
            onSelect={onSetDestination}
            onPick={() => onPickOnMap("destination")}
          />
        </div>

        <button className="btn-block" disabled={!canCheck} onClick={onCheck}>
          {checking ? "Checking…" : "Check route"}
        </button>

        {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}

        {result && selected && (
          <>
            <div className={`route-result-banner ${result.hasSafeRoute ? "safe" : "warn"}`}>
              {selected.severity === "clear"
                ? "✅ This route looks clear of reported floods."
                : selected.severity === "flooded"
                ? "⚠️ This route crosses a road reported as flooded."
                : "⚠️ This route passes a caution zone."}
              {!result.hasSafeRoute && " No fully clear alternative was found — proceed carefully."}
            </div>

            {selected.severity === "clear" && result.routes.some((r) => r.severity !== "clear") && (
              <div className="route-impact-note">
                Avoiding the flooded route means one less vehicle stranded in floodwater — less
                wasted fuel, fewer emissions, and a clearer road for emergency crews.
              </div>
            )}

            {result.routes.length > 1 && (
              <div className="route-alt-list">
                {result.routes.map((r, i) => (
                  <div
                    key={i}
                    className={`route-alt ${i === selectedRouteIndex ? "selected" : ""}`}
                    onClick={() => onSelectRoute(i)}
                  >
                    <div className="route-alt-title">
                      <span>
                        {i === result.recommendedIndex
                          ? "★ Recommended"
                          : r.avoidsHazard
                          ? "Avoids the hazard"
                          : `Alternative ${i + 1}`}
                      </span>
                      <span>{(r.distanceM / 1000).toFixed(1)} km</span>
                    </div>
                    <div className="hint-text">
                      {r.severity === "clear"
                        ? r.avoidsHazard
                          ? "Detours around the reported hazard"
                          : "No reported flooding"
                        : `${r.intersections.length} flood report(s) on this road`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

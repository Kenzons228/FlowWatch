import { useRef, useState } from "react";
import { searchPlace, reverseGeocode, type GeocodeResult } from "../lib/geocode";
import type { AppLocation } from "../store/useAppStore";
import { MapPinIcon } from "./icons";

interface Props {
  onClose: () => void;
  onSelect: (location: AppLocation) => void;
}

export default function LocationModal({ onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(v: string) {
    setQuery(v);
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      const r = await searchPlace(v);
      setResults(r);
      setSearching(false);
    }, 400);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation isn't available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const label = await reverseGeocode(lat, lng);
        setLocating(false);
        onSelect({ label, lat, lng });
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location — search for a city instead.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>Choose a city</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <button className="btn-block" style={{ marginBottom: 14 }} onClick={useMyLocation} disabled={locating}>
          {locating ? (
            "Finding you…"
          ) : (
            <>
              <MapPinIcon size={16} /> Use my current location
            </>
          )}
        </button>

        <div className="field">
          <label>Or search any city</label>
          <input
            type="text"
            placeholder="e.g. Semarang, Manila, Ho Chi Minh City…"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            autoFocus
          />
        </div>

        {error && <div className="error-text">{error}</div>}
        {searching && <div className="hint-text">Searching…</div>}

        <div className="place-results">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              className="place-result"
              onClick={() => onSelect({ label: r.label, lat: r.lat, lng: r.lng })}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

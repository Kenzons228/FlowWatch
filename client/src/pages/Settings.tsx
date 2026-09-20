import { useState } from "react";
import { useAppStore, type Theme } from "../store/useAppStore";
import LocationModal from "../components/LocationModal";

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export default function Settings() {
  const location = useAppStore((s) => s.location);
  const setLocation = useAppStore((s) => s.setLocation);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [showLocation, setShowLocation] = useState(false);

  return (
    <div className="page page-scroll">
      <div className="page-inner settings-page">
      <h2 className="section-title">Settings</h2>

      <section className="stats-card">
        <h3>City</h3>
        <p className="hint-text">
          FlowWatch works anywhere — switch cities to see local weather, elevation and reports for
          that area.
        </p>
        <div className="location-box" style={{ marginTop: 10 }}>
          <span>
            Currently: <strong>{location.label}</strong>
          </span>
          <button type="button" onClick={() => setShowLocation(true)}>
            Change
          </button>
        </div>
      </section>

      <section className="stats-card">
        <h3>Appearance</h3>
        <div className="segmented">
          {THEMES.map((t) => (
            <button
              key={t.value}
              className={theme === t.value ? "active" : ""}
              onClick={() => setTheme(t.value)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="stats-card">
        <h3>About FlowWatch</h3>
        <p className="hint-text">
          FlowWatch is a community-powered flood &amp; drain hazard map. Reports, votes and route
          checks are stored on the FlowWatch server; weather comes from Open-Meteo, elevation from
          Open-Meteo's elevation API, place search from OpenStreetMap Nominatim, and driving routes
          from OSRM — all free, public data sources.
        </p>
        <p className="hint-text">
          The "AI" overview and description classifier are rule-based systems that read live
          weather, elevation and report data — not a hosted LLM — so they run instantly, work
          offline-friendly, and every suggestion is explainable from the numbers behind it.
        </p>
      </section>
      </div>

      {showLocation && (
        <LocationModal
          onClose={() => setShowLocation(false)}
          onSelect={(loc) => {
            setLocation(loc);
            setShowLocation(false);
          }}
        />
      )}
    </div>
  );
}

import type { WeatherSnapshot } from "../lib/types";
import { CloudRainIcon, CompassIcon, GlobeIcon } from "./icons";

interface Props {
  weather: WeatherSnapshot | null;
  layers: { flood: boolean; drain: boolean; risk: boolean };
  onToggleLayer: (key: "flood" | "drain" | "risk") => void;
  onOpenRoute: () => void;
  onViewWorld: () => void;
  worldReportCount: number;
}

export default function TopBar({
  weather,
  layers,
  onToggleLayer,
  onOpenRoute,
  onViewWorld,
  worldReportCount,
}: Props) {
  const rain = weather?.currentRainMm ?? 0;
  return (
    <div className="map-topbar">
      <div className="rain-chip">
        <CloudRainIcon size={15} />
        <strong>{rain.toFixed(1)} mm/h</strong> right now
      </div>

      <button className="fab fab-tertiary" onClick={onViewWorld} title="Zoom out to every report worldwide">
        <GlobeIcon size={16} /> All {worldReportCount} reports worldwide
      </button>

      <div className="topbar-spacer" />

      <div className="layer-toggle">
        <label>
          <input type="checkbox" checked={layers.flood} onChange={() => onToggleLayer("flood")} />
          <span className="dot-flooded" /> Flooded roads
        </label>
        <label>
          <input type="checkbox" checked={layers.drain} onChange={() => onToggleLayer("drain")} />
          <span className="dot-drain" /> Drain reports
        </label>
        <label>
          <input type="checkbox" checked={layers.risk} onChange={() => onToggleLayer("risk")} />
          <span className="dot-risk" /> Risk zones
        </label>
      </div>

      <button className="fab fab-secondary" onClick={onOpenRoute}>
        <CompassIcon size={16} /> Check route
      </button>
    </div>
  );
}

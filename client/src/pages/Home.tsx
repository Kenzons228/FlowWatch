import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { fetchOverview, fetchPriorityQueue } from "../lib/api";
import { formatMm } from "../lib/format";
import type { Overview, PriorityItem } from "../lib/types";
import {
  SparkleIcon,
  DropIcon,
  CloudRainIcon,
  ElevationIcon,
  WavesIcon,
  TrashIcon,
  MapPinIcon,
  CompassIcon,
  ChartIcon,
} from "../components/icons";

const PROBLEMS = [
  {
    icon: TrashIcon,
    color: "#f97316",
    title: "Blocked drains go unreported",
    body: "No easy way to flag a clogged drain before it floods.",
  },
  {
    icon: WavesIcon,
    color: "#ef4444",
    title: "Flood warnings are slow",
    body: "District-level alerts miss which street is flooded right now.",
  },
  {
    icon: CompassIcon,
    color: "#8b5cf6",
    title: "No way to check a route",
    body: "You find out a road is flooded only once you're stuck in it.",
  },
];

const IMPACT_STEPS = [
  {
    icon: TrashIcon,
    color: "#f97316",
    label: "Report",
    impact: "Waste cleared from drains means less human-caused flooding, not just less rain damage.",
  },
  {
    icon: CloudRainIcon,
    color: "#3b82f6",
    label: "Warn",
    impact: "Can't stop the rain — but early warning gives people time to protect property and avoid danger.",
  },
  {
    icon: CompassIcon,
    color: "#10b981",
    label: "Route",
    impact: "Fewer cars stranded in floodwater means less wasted fuel, fewer emissions, and clearer roads for emergency crews.",
  },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Good morning";
  if (h < 16) return "Good afternoon";
  return "Good evening";
}

function riskTone(overview: Overview | null): "calm" | "watch" | "alert" {
  if (!overview) return "calm";
  const { activeFloodCount, topRiskZone } = overview.stats;
  if (activeFloodCount > 0 || topRiskZone?.level === "high") return "alert";
  if (topRiskZone || overview.stats.activeDrainCount > 0) return "watch";
  return "calm";
}

export default function Home() {
  const location = useAppStore((s) => s.location);
  const navigate = useNavigate();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priorityQueue, setPriorityQueue] = useState<PriorityItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchOverview(location.lat, location.lng, location.label)
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    fetchPriorityQueue(location.lat, location.lng)
      .then((items) => {
        if (!cancelled) setPriorityQueue(items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [location.lat, location.lng, location.label]);

  const tone = riskTone(overview);
  const toneLabel = { calm: "All clear", watch: "Worth watching", alert: "Elevated risk" }[tone];
  const river = overview?.stats.river;
  const tide = overview?.stats.tide;

  return (
    <div className="page page-scroll">
      <div className="page-inner home-page">
        <div className="home-hero">
          <div>
            <span className="home-eyebrow">{greeting()}</span>
            <h1 className="home-title">
              <MapPinIcon size={22} /> {location.label}
            </h1>
          </div>
          <div className="home-actions">
            <button
              className="chip-btn primary"
              onClick={() => navigate("/map", { state: { openReport: true } })}
            >
              <MapPinIcon size={16} /> Report hazard
            </button>
            <button
              className="chip-btn green"
              onClick={() => navigate("/map", { state: { openRoute: true } })}
            >
              <CompassIcon size={16} /> Check route
            </button>
          </div>
        </div>

        <section className="ai-overview-card">
          <div className="ai-overview-glow" />
          <div className="ai-overview-top">
            <div className="ai-overview-label">
              <span className="ai-badge">
                <SparkleIcon size={12} /> AI
              </span>
              Overview
            </div>
            <span className="tone-pill">{toneLabel}</span>
          </div>

          {loading && <div className="hint-text">Reading live weather, elevation and reports…</div>}
          {error && <div className="error-text">Couldn't load overview: {error}</div>}
          {overview && (
            <>
              <h2 className="ai-headline">{overview.headline}</h2>
              <p className="ai-narrative">{overview.narrative}</p>

              <div className="ai-suggestions">
                {overview.suggestions.map((s, i) => (
                  <div className="ai-suggestion-row" key={i}>
                    <span className="ai-suggestion-dot" />
                    {s}
                  </div>
                ))}
              </div>

              <div className="stat-tile-row">
                <div className="stat-tile" style={{ ["--accent" as string]: "#3b82f6" }}>
                  <CloudRainIcon size={16} className="stat-tile-icon" />
                  <span className="stat-tile-value">{formatMm(overview.stats.rainNowMm)}</span>
                  <span className="stat-tile-label">mm/h now</span>
                </div>
                <div className="stat-tile" style={{ ["--accent" as string]: "#0ea5e9" }}>
                  <DropIcon size={16} className="stat-tile-icon" />
                  <span className="stat-tile-value">{formatMm(overview.stats.rainPeakMm)}</span>
                  <span className="stat-tile-label">mm/h peak</span>
                </div>
                <div className="stat-tile" style={{ ["--accent" as string]: "#d97706" }}>
                  <ElevationIcon size={16} className="stat-tile-icon" />
                  <span className="stat-tile-value">{Math.round(overview.stats.elevationM)}m</span>
                  <span className="stat-tile-label">elevation</span>
                </div>
                {river?.available && (
                  <div className="stat-tile" style={{ ["--accent" as string]: "#1d4ed8" }}>
                    <WavesIcon size={16} className="stat-tile-icon" />
                    <span className="stat-tile-value">{Math.round(river.dischargeM3s)}</span>
                    <span className="stat-tile-label">m³/s river ({river.level})</span>
                  </div>
                )}
                {tide?.available && (
                  <div className="stat-tile" style={{ ["--accent" as string]: "#06b6d4" }}>
                    <DropIcon size={16} className="stat-tile-icon" />
                    <span className="stat-tile-value">{tide.currentM.toFixed(1)}m</span>
                    <span className="stat-tile-label">tide, {tide.trend}</span>
                  </div>
                )}
                <div className="stat-tile" style={{ ["--accent" as string]: "#ef4444" }}>
                  <WavesIcon size={16} className="stat-tile-icon" />
                  <span className="stat-tile-value">{overview.stats.activeFloodCount}</span>
                  <span className="stat-tile-label">flooded nearby</span>
                </div>
                <div className="stat-tile" style={{ ["--accent" as string]: "#f97316" }}>
                  <TrashIcon size={16} className="stat-tile-icon" />
                  <span className="stat-tile-value">{overview.stats.activeDrainCount}</span>
                  <span className="stat-tile-label">drain reports</span>
                </div>
              </div>
            </>
          )}
        </section>

        {priorityQueue.length > 0 && (
          <section className="stats-card priority-section">
            <h3>
              <ChartIcon size={16} className="stats-card-icon" /> Priority cleanup near you
            </h3>
            <p className="hint-text">
              Ranked the way a cleanup crew would: blockage severity, rain heading that way, and how
              long it's sat unresolved. Clearing the top of this list is the most direct way to
              prevent the next flood.
            </p>
            <div className="priority-list">
              {priorityQueue.slice(0, 4).map((item) => (
                <button
                  key={item.report.id}
                  className="priority-row"
                  onClick={() => navigate("/map")}
                  type="button"
                >
                  <div className="priority-score">{item.score.toFixed(1)}</div>
                  <div className="priority-body">
                    <div className="priority-top">
                      <span className={`badge ${item.report.severity}`}>{item.report.severity}</span>
                      <span className="hint-text">{item.distanceKm.toFixed(1)}km away</span>
                    </div>
                    <div className="priority-reasons">{item.reasons.join(" · ")}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="problems-section">
          <h3 className="section-title">The problem, in three parts</h3>
          <div className="problems-grid">
            {PROBLEMS.map((p) => (
              <div className="problem-card" style={{ ["--accent" as string]: p.color }} key={p.title}>
                <span className="problem-icon" style={{ background: `${p.color}1c`, color: p.color }}>
                  <p.icon size={20} />
                </span>
                <strong>{p.title}</strong>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="impact-section">
          <h3 className="section-title">One pipeline, real environmental impact</h3>
          <div className="impact-flow">
            {IMPACT_STEPS.map((step, i) => (
              <div className="impact-step" key={step.label}>
                <div className="impact-step-top">
                  <span className="impact-step-number" style={{ background: step.color }}>
                    {i + 1}
                  </span>
                  <span className="impact-step-icon" style={{ background: `${step.color}1c`, color: step.color }}>
                    <step.icon size={18} />
                  </span>
                  <strong>{step.label}</strong>
                </div>
                <p>{step.impact}</p>
                {i < IMPACT_STEPS.length - 1 && <span className="impact-arrow">→</span>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

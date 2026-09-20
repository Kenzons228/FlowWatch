import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAppStore } from "../store/useAppStore";
import { fetchElevation, fetchEnvironment, fetchReports, fetchRiskZones, fetchWeather } from "../lib/api";
import { reverseGeocode } from "../lib/geocode";
import { formatMm } from "../lib/format";
import type { ElevationInfo, Report, RiskZone, RiverInfo, TideInfo, WeatherSnapshot } from "../lib/types";
import {
  CloudRainIcon,
  ElevationIcon,
  ChartIcon,
  ShieldIcon,
  WavesIcon,
  TrashIcon,
} from "../components/icons";

const riverLevelColor = { normal: "#2b8a3e", elevated: "#e8a51c", high: "#d92d20" } as const;

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = (b.lat - a.lat) * 111.32;
  const dLng = (b.lng - a.lng) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

const levelColor = { low: "#e8a51c", medium: "#e8590c", high: "#d92d20" } as const;

const INTENSITY = [
  { key: "light", label: "Light", color: "#7dd3fc", max: 2 },
  { key: "moderate", label: "Moderate", color: "#38bdf8", max: 10 },
  { key: "heavy", label: "Heavy", color: "#1d4ed8", max: 30 },
  { key: "violent", label: "Violent", color: "#9333ea", max: Infinity },
] as const;

function intensityFor(mm: number) {
  return INTENSITY.find((b) => mm < b.max) ?? INTENSITY[INTENSITY.length - 1];
}

function xLabel(iso: string): string {
  const d = new Date(iso);
  if (d.getHours() === 0) return d.toLocaleDateString([], { weekday: "short" });
  return String(d.getHours());
}

export default function Stats() {
  const location = useAppStore((s) => s.location);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [elevation, setElevation] = useState<ElevationInfo | null>(null);
  const [river, setRiver] = useState<RiverInfo | null>(null);
  const [tide, setTide] = useState<TideInfo | null>(null);
  const [zones, setZones] = useState<RiskZone[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [zoneLabels, setZoneLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchWeather(location.lat, location.lng),
      fetchElevation(location.lat, location.lng),
      fetchRiskZones(),
      fetchReports(),
      fetchEnvironment(location.lat, location.lng),
    ])
      .then(([w, e, z, r, env]) => {
        if (cancelled) return;
        setWeather(w);
        setElevation(e);
        setZones(z);
        setReports(r);
        setRiver(env.river);
        setTide(env.tide);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location.lat, location.lng]);

  const nearbyZones = useMemo(
    () =>
      zones
        .map((z) => ({ ...z, distanceKm: distanceKm(location, z) }))
        .filter((z) => z.distanceKm <= 60)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6),
    [zones, location]
  );

  useEffect(() => {
    nearbyZones.forEach((z) => {
      if (zoneLabels[z.id]) return;
      reverseGeocode(z.lat, z.lng).then((label) => {
        setZoneLabels((prev) => ({ ...prev, [z.id]: label }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearbyZones]);

  const hourly = weather?.hourly ?? [];
  const chartData = hourly.map((h) => ({
    time: xLabel(h.time),
    rain: Math.round(h.rainMm * 100) / 100,
    color: intensityFor(h.rainMm).color,
  }));

  const rainOutlook = useMemo(() => {
    const totalMm = hourly.reduce((sum, h) => sum + h.rainMm, 0);
    const peak = hourly.reduce((best, h) => (h.rainMm > best.rainMm ? h : best), {
      rainMm: 0,
      time: hourly[0]?.time ?? new Date().toISOString(),
    });
    const peakBucket = intensityFor(peak.rainMm);
    let nextRainLabel = "None expected in 48h";
    if ((weather?.currentRainMm ?? 0) > 0.2) {
      nextRainLabel = "now";
    } else {
      const idx = hourly.findIndex((h) => h.rainMm > 0.2);
      if (idx >= 0) {
        const d = new Date(hourly[idx].time);
        nextRainLabel = `${d.toLocaleDateString([], { weekday: "short" })} ${d.toLocaleTimeString(
          [],
          { hour: "numeric" }
        )}`;
      }
    }
    return { totalMm, peakBucket, nextRainLabel };
  }, [hourly, weather?.currentRainMm]);

  const nearbyReports = reports.filter((r) => distanceKm(location, r) <= 60);
  const activeFlood = nearbyReports.filter((r) => r.kind === "flood" && !r.resolved).length;
  const activeDrain = nearbyReports.filter((r) => r.kind === "drain" && !r.resolved).length;
  const verified = nearbyReports.filter((r) => r.upvotes - r.downvotes >= 3).length;
  const resolved = nearbyReports.filter((r) => r.resolved).length;

  return (
    <div className="page page-scroll">
      <div className="page-inner stats-page">
      <h2 className="section-title">Statistics — {location.label}</h2>
      {loading && <div className="hint-text">Loading live weather &amp; elevation data…</div>}

      <section className="rain-outlook-card">
        <div className="rain-outlook-glow" />
        <div className="rain-outlook-top">
          <div className="rain-outlook-icon">
            <CloudRainIcon size={26} />
          </div>
          <div>
            <div className="rain-outlook-title">Next rain {rainOutlook.nextRainLabel}</div>
            <div className="rain-outlook-sub">
              {rainOutlook.peakBucket.label.toLowerCase()} peak · {formatMm(rainOutlook.totalMm)} mm
              over 48h
            </div>
          </div>
          <div className="rain-outlook-pill">
            <span className="rain-outlook-pill-label">Rain now</span>
            <span className="rain-outlook-pill-value">{formatMm(weather?.currentRainMm ?? 0)} mm/h</span>
          </div>
        </div>
      </section>

      <div className="stat-tile-row plain" style={{ marginBottom: 18 }}>
        <div className="stat-tile plain" style={{ ["--accent" as string]: "#0ea5e9" }}>
          <CloudRainIcon size={16} className="stat-tile-icon" />
          <span className="stat-tile-value">{weather ? formatMm(weather.currentRainMm) : "–"}</span>
          <span className="stat-tile-label">mm/h now</span>
        </div>
        <div className="stat-tile plain" style={{ ["--accent" as string]: "#1d4ed8" }}>
          <ChartIcon size={16} className="stat-tile-icon" />
          <span className="stat-tile-value">
            {formatMm(Math.max(0, ...(hourly.map((h) => h.rainMm) ?? [0])))}
          </span>
          <span className="stat-tile-label">mm/h peak</span>
        </div>
        <div className="stat-tile plain" style={{ ["--accent" as string]: "#22c1c3" }}>
          <CloudRainIcon size={16} className="stat-tile-icon" />
          <span className="stat-tile-value">{weather?.currentPrecipProbability ?? "–"}%</span>
          <span className="stat-tile-label">rain chance</span>
        </div>
      </div>

      <section className="stats-card">
        <div className="stats-card-head">
          <h3>Next 48 hours (mm per hour)</h3>
          <div className="chart-legend">
            {INTENSITY.map((b) => (
              <span className="chart-legend-item" key={b.key}>
                <span className="chart-legend-dot" style={{ background: b.color }} />
                {b.label}
              </span>
            ))}
          </div>
        </div>
        <div className="chart-scroll">
          <div style={{ width: Math.max(600, chartData.length * 30), height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 22, right: 6, left: -20, bottom: 0 }}>
                <XAxis dataKey="time" stroke="var(--ink-soft)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="var(--ink-soft)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, (dataMax: number) => Math.max(2, Math.ceil(dataMax))]}
                />
                <Tooltip
                  cursor={{ fill: "rgba(15,95,168,0.08)" }}
                  contentStyle={{
                    background: "var(--paper)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                  }}
                  formatter={(v) => [`${formatMm(Number(v))} mm/h`, "Rain"]}
                />
                <Bar dataKey="rain" radius={[5, 5, 0, 0]} maxBarSize={18}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                  <LabelList
                    dataKey="rain"
                    position="top"
                    fontSize={10}
                    fill="var(--ink-soft)"
                    formatter={(v) => (Number(v) > 0.05 ? formatMm(Number(v)) : "")}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="stats-card">
        <h3>
          <ElevationIcon size={16} className="stats-card-icon" /> Ground elevation
        </h3>
        <p className="hint-text">
          Low-lying ground drains slower and floods faster — this feeds the risk score as a
          baseline factor alongside rain and drain reports.
        </p>
        {elevation && (
          <div className="elevation-readout">
            <div className={`elevation-badge ${elevation.level}`}>{elevation.level} elevation</div>
            <div className="elevation-value">{Math.round(elevation.meters)}m above sea level</div>
          </div>
        )}
      </section>

      {(river?.available || tide?.available) && (
        <section className="stats-card">
          <h3>
            <WavesIcon size={16} className="stats-card-icon" /> River &amp; tide
          </h3>
          <p className="hint-text">
            Live signals from the Global Flood Awareness System (river discharge) and Open-Meteo
            Marine (tide) — not just rainfall, so a rising river or high tide shows up even on a dry
            day.
          </p>
          <div className="river-tide-row">
            {river?.available && (
              <div className="elevation-readout">
                <div
                  className="elevation-badge"
                  style={{ background: `${riverLevelColor[river.level]}22`, color: riverLevelColor[river.level] }}
                >
                  {river.level} river
                </div>
                <div className="elevation-value">{Math.round(river.dischargeM3s)} m³/s discharge</div>
              </div>
            )}
            {tide?.available && (
              <div className="elevation-readout">
                <div
                  className="elevation-badge"
                  style={{
                    background: tide.nearPeak ? "var(--yellow-bg)" : "rgba(6,182,212,0.14)",
                    color: tide.nearPeak ? "#916008" : "#0e7490",
                  }}
                >
                  tide {tide.trend}
                </div>
                <div className="elevation-value">{tide.currentM.toFixed(1)}m sea level</div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="stats-card">
        <h3>
          <ChartIcon size={16} className="stats-card-icon" /> Report activity within 60km
        </h3>
        <p className="hint-text">Crowdsourced reports and votes near {location.label} right now.</p>
        <div className="stat-tile-row plain" style={{ marginTop: 12 }}>
          <div className="stat-tile plain" style={{ ["--accent" as string]: "#ef4444" }}>
            <WavesIcon size={16} className="stat-tile-icon" />
            <span className="stat-tile-value">{activeFlood}</span>
            <span className="stat-tile-label">active flood</span>
          </div>
          <div className="stat-tile plain" style={{ ["--accent" as string]: "#f97316" }}>
            <TrashIcon size={16} className="stat-tile-icon" />
            <span className="stat-tile-value">{activeDrain}</span>
            <span className="stat-tile-label">active drain</span>
          </div>
          <div className="stat-tile plain" style={{ ["--accent" as string]: "#22c1c3" }}>
            <ShieldIcon size={16} className="stat-tile-icon" />
            <span className="stat-tile-value">{verified}</span>
            <span className="stat-tile-label">verified</span>
          </div>
          <div className="stat-tile plain" style={{ ["--accent" as string]: "#8b5cf6" }}>
            <ShieldIcon size={16} className="stat-tile-icon" />
            <span className="stat-tile-value">{resolved}</span>
            <span className="stat-tile-label">resolved</span>
          </div>
        </div>
      </section>

      <section className="stats-card">
        <h3>
          <ShieldIcon size={16} className="stats-card-icon" /> Highest flood-risk zones nearby
        </h3>
        <p className="hint-text">
          Rule-based score = drain-report density + live rainfall + low elevation + nearby river
          discharge. Not ML — fully explainable from the numbers.
        </p>
        {nearbyZones.length === 0 && !loading && (
          <div className="hint-text">No elevated risk zones detected near {location.label} right now.</div>
        )}
        <div className="risk-list">
          {nearbyZones.map((z) => (
            <div className="risk-row" key={z.id}>
              <div className="risk-row-score" style={{ background: levelColor[z.level] }}>
                {z.score.toFixed(1)}
              </div>
              <div className="risk-row-body">
                <strong>{zoneLabels[z.id] ?? "Locating…"}</strong>
                <div className="hint-text">
                  {z.distanceKm.toFixed(1)}km away · {z.reportCount} drain report(s) ·{" "}
                  {formatMm(z.rainMm)}mm/h rain · {Math.round(z.elevationM)}m elevation
                  {z.riverLevel !== "normal" && <> · river {z.riverLevel}</>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}

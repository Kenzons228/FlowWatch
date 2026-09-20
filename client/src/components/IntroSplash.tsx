import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import LocationModal from "./LocationModal";
import { WavesIcon, TrashIcon, CompassIcon, ShieldIcon } from "./icons";

const BADGES = [
  { icon: TrashIcon, label: "Report blocked drains", color: "#f97316", corner: "tl" },
  { icon: WavesIcon, label: "Live flood map", color: "#ef4444", corner: "tr" },
  { icon: CompassIcon, label: "Route safety check", color: "#3b82f6", corner: "bl" },
  { icon: ShieldIcon, label: "AI risk overview", color: "#8b5cf6", corner: "br" },
] as const;

const DROPS = [
  { top: "12%", left: "10%", size: 10, color: "#3b82f6", duration: 9, delay: 0 },
  { top: "20%", left: "88%", size: 14, color: "#0ea5e9", duration: 11, delay: 1.4 },
  { top: "70%", left: "13%", size: 8, color: "#f97316", duration: 8, delay: 0.8 },
  { top: "78%", left: "90%", size: 12, color: "#ef4444", duration: 10, delay: 2.1 },
  { top: "42%", left: "4%", size: 7, color: "#0ea5e9", duration: 7.5, delay: 1 },
  { top: "88%", left: "52%", size: 9, color: "#8b5cf6", duration: 12, delay: 0.4 },
  { top: "8%", left: "48%", size: 7, color: "#3b82f6", duration: 9.5, delay: 2.4 },
  { top: "58%", left: "80%", size: 11, color: "#8b5cf6", duration: 10.5, delay: 1.2 },
  { top: "32%", left: "30%", size: 6, color: "#0ea5e9", duration: 8.5, delay: 3 },
  { top: "50%", left: "95%", size: 8, color: "#f97316", duration: 9, delay: 1.8 },
] as const;

export default function IntroSplash({ onFinish }: { onFinish: () => void }) {
  const setLocation = useAppStore((s) => s.setLocation);
  const [closing, setClosing] = useState(false);
  const [showLocation, setShowLocation] = useState(false);

  function finish(skip: boolean) {
    if (skip) {
      setClosing(true);
      setTimeout(onFinish, 380);
    } else {
      setShowLocation(true);
    }
  }

  return (
    <div className={`intro${closing ? " intro--closing" : ""}`}>
      <div className="intro__grid" />

      {DROPS.map((p, i) => (
        <span
          key={i}
          className="intro__particle"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {BADGES.map((b, i) => (
        <div
          className={`intro__badge intro__badge--${b.corner}`}
          style={{ animationDelay: `${0.5 + i * 0.12}s` }}
          key={b.label}
        >
          <span className="intro__badge-icon" style={{ background: `${b.color}22`, color: b.color }}>
            <b.icon size={18} />
          </span>
          <span>{b.label}</span>
        </div>
      ))}

      <div className="intro__content">
        <div className="intro__rings">
          <span className="intro__ring intro__ring--outer" />
          <span className="intro__ring intro__ring--inner" />
          <div className="intro__logo">
            <div className="intro__logo-mark">
              <WavesIcon size={34} />
            </div>
          </div>
        </div>

        <span className="intro__eyebrow">Prevention before the flood</span>
        <h1 className="intro__title">FlowWatch</h1>
        <p className="intro__tagline">See the flood before it rises — report, warn, route.</p>

        <div className="intro__mobile-badges">
          {BADGES.map((b, i) => (
            <div className="intro__feature" style={{ animationDelay: `${0.5 + i * 0.12}s` }} key={b.label}>
              <span className="intro__badge-icon" style={{ background: `${b.color}22`, color: b.color }}>
                <b.icon size={18} />
              </span>
              <span>{b.label}</span>
            </div>
          ))}
        </div>

        <button className="intro__start" onClick={() => finish(false)}>
          Start exploring
        </button>
        <button className="intro__skip" onClick={() => finish(true)}>
          Skip — I'll set my city later
        </button>
      </div>

      {showLocation && (
        <LocationModal
          onClose={() => setShowLocation(false)}
          onSelect={(loc) => {
            setLocation(loc);
            onFinish();
          }}
        />
      )}
    </div>
  );
}

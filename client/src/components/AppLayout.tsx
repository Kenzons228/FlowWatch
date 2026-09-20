import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import LocationModal from "./LocationModal";
import { HomeIcon, FoldedMapIcon, ChartIcon, SettingsIcon, MapPinIcon } from "./icons";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: HomeIcon, end: true },
  { to: "/map", label: "Map", icon: FoldedMapIcon, end: false },
  { to: "/stats", label: "Stats", icon: ChartIcon, end: false },
  { to: "/settings", label: "Settings", icon: SettingsIcon, end: false },
];

export default function AppLayout() {
  const location = useAppStore((s) => s.location);
  const setLocation = useAppStore((s) => s.setLocation);
  const [showLocation, setShowLocation] = useState(false);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="dot" />
          FlowWatch
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
            >
              <item.icon size={18} /> {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="sidebar-location" onClick={() => setShowLocation(true)}>
          <MapPinIcon size={16} /> <span>{location.label}</span>
        </button>
      </aside>

      <div className="main-col">
        <header className="mobile-topbar">
          <div className="brand">
            <span className="dot" />
            FlowWatch
          </div>
          <button className="location-chip-btn" onClick={() => setShowLocation(true)}>
            <MapPinIcon size={13} /> <span>{location.label}</span>
          </button>
        </header>

        <div className="content-area">
          <Outlet />
        </div>

        <nav className="bottom-tabs">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => "bottom-tab" + (isActive ? " active" : "")}
            >
              <span className="bottom-tab-icon">
                <item.icon size={20} />
              </span>
              <span className="bottom-tab-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
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

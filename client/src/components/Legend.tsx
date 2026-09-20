export default function Legend() {
  return (
    <div className="legend">
      <h4>Map legend</h4>
      <div className="legend-row">
        <span className="swatch circle" style={{ background: "#d92d20" }} />
        Flooded — impassable
      </div>
      <div className="legend-row">
        <span className="swatch circle" style={{ background: "#e8a51c" }} />
        Caution — partially flooded
      </div>
      <div className="legend-row">
        <span
          className="swatch circle"
          style={{ background: "rgba(217,45,32,0.12)", border: "1.5px dashed #d92d20" }}
        />
        Regional disaster alert (GDACS)
      </div>
      <div className="legend-row">
        <span className="swatch" style={{ background: "#7c3aed", borderRadius: "50% 50% 50% 0" }} />
        Blocked drain (severe)
      </div>
      <div className="legend-row">
        <span className="swatch" style={{ background: "#2563eb", borderRadius: "50% 50% 50% 0" }} />
        Blocked drain (moderate)
      </div>
      <div className="legend-row">
        <span className="swatch" style={{ background: "#0891b2", borderRadius: "50% 50% 50% 0" }} />
        Blocked drain (minor)
      </div>
      <div className="legend-row">
        <span
          className="swatch circle"
          style={{ background: "rgba(232,165,28,0.25)", border: "1.5px dashed #e8590c" }}
        />
        Predicted risk zone
      </div>
    </div>
  );
}

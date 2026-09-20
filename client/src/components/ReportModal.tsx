import { useEffect, useRef, useState } from "react";
import type { DrainSeverity, FloodStatus } from "../lib/types";
import { classifyDescription } from "../lib/api";
import { WavesIcon, TrashIcon } from "./icons";

export interface ReportDraft {
  kind: "flood" | "drain";
  status: FloodStatus;
  severity: DrainSeverity;
  description: string;
  lat: number | null;
  lng: number | null;
  locationLabel: string | null;
  resolvingLocation: boolean;
}

const DRAIN_PRESETS = [
  "Full of plastic bags",
  "Water not draining",
  "Leaves and branches blocking it",
  "Illegal dumping",
  "Grate completely buried in trash",
];

const FLOOD_PRESETS = [
  "Water above knee height",
  "Cars/motorbikes stalling out",
  "Ankle-deep, still passable",
  "Water slowly receding",
  "One lane still flooded",
];

interface Props {
  draft: ReportDraft;
  onChange: (partial: Partial<ReportDraft>) => void;
  onClose: () => void;
  onPickOnMap: () => void;
  onUseMyLocation: () => void;
  locating: boolean;
  locationError: string | null;
  onSubmit: () => Promise<void>;
  submitting: boolean;
  submitError: string | null;
}

export default function ReportModal({
  draft,
  onChange,
  onClose,
  onPickOnMap,
  onUseMyLocation,
  locating,
  locationError,
  onSubmit,
  submitting,
  submitError,
}: Props) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{
    value: string;
    confidence: string;
    keywords: string[];
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const presets = draft.kind === "drain" ? DRAIN_PRESETS : FLOOD_PRESETS;

  useEffect(() => {
    setAiSuggestion(null);
    if (!draft.description.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await classifyDescription(draft.kind, draft.description);
        if (result.suggested) {
          setAiSuggestion({
            value: result.suggested,
            confidence: result.confidence,
            keywords: result.matchedKeywords,
          });
        }
      } catch {
        /* classification is a nice-to-have; ignore failures */
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.description, draft.kind]);

  function applySuggestion() {
    if (!aiSuggestion) return;
    if (draft.kind === "drain") onChange({ severity: aiSuggestion.value as DrainSeverity });
    else onChange({ status: aiSuggestion.value as FloodStatus });
    setAiSuggestion(null);
  }

  async function handleSubmit() {
    if (draft.lat === null || draft.lng === null) {
      setLocalError("Add a location before submitting.");
      return;
    }
    setLocalError(null);
    await onSubmit();
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>Report a hazard</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="field">
          <label>What are you reporting?</label>
          <div className="segmented">
            <button
              className={draft.kind === "flood" ? "active" : ""}
              onClick={() => onChange({ kind: "flood" })}
              type="button"
            >
              <WavesIcon size={16} /> Flooded road
            </button>
            <button
              className={draft.kind === "drain" ? "active" : ""}
              onClick={() => onChange({ kind: "drain" })}
              type="button"
            >
              <TrashIcon size={16} /> Blocked drain
            </button>
          </div>
        </div>

        {draft.kind === "flood" ? (
          <div className="field">
            <label>Severity</label>
            <div className="segmented">
              <button
                className={draft.status === "flooded" ? "active" : ""}
                onClick={() => onChange({ status: "flooded" })}
                type="button"
              >
                Impassable
              </button>
              <button
                className={draft.status === "caution" ? "active" : ""}
                onClick={() => onChange({ status: "caution" })}
                type="button"
              >
                Caution
              </button>
            </div>
          </div>
        ) : (
          <div className="field">
            <label>How blocked is it?</label>
            <div className="segmented">
              <button
                className={draft.severity === "minor" ? "active" : ""}
                onClick={() => onChange({ severity: "minor" })}
                type="button"
              >
                Minor
              </button>
              <button
                className={draft.severity === "moderate" ? "active" : ""}
                onClick={() => onChange({ severity: "moderate" })}
                type="button"
              >
                Moderate
              </button>
              <button
                className={draft.severity === "severe" ? "active" : ""}
                onClick={() => onChange({ severity: "severe" })}
                type="button"
              >
                Fully blocked
              </button>
            </div>
          </div>
        )}

        <div className="field">
          <label>Location</label>
          <div className="location-box">
            {draft.lat !== null && draft.lng !== null ? (
              <span>
                {draft.resolvingLocation ? (
                  "Figuring out where that is…"
                ) : (
                  <strong>{draft.locationLabel ?? "Unknown place"}</strong>
                )}
                <div className="hint-text">
                  {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
                </div>
              </span>
            ) : (
              <span>{locating ? "Finding your location…" : "No location set yet"}</span>
            )}
            <button type="button" onClick={onPickOnMap}>
              Pick on map
            </button>
          </div>
          {locationError && <div className="hint-text">{locationError}</div>}
          {draft.lat !== null && (
            <div className="hint-text">
              <button type="button" className="link-btn" onClick={onUseMyLocation}>
                Use my current location instead
              </button>
            </div>
          )}
        </div>

        <div className="field">
          <label>Description (optional)</label>
          <div className="preset-chips">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                className={`preset-chip ${draft.description === p ? "selected" : ""}`}
                onClick={() => onChange({ description: p })}
              >
                {p}
              </button>
            ))}
          </div>
          <textarea
            rows={3}
            placeholder="Or describe it in your own words…"
            value={draft.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
          {aiSuggestion && (
            <div className="ai-suggest-pill">
              <span className="ai-badge">AI</span> Based on your description, this looks{" "}
              <strong>{aiSuggestion.value}</strong> ({aiSuggestion.confidence} confidence
              {aiSuggestion.keywords.length > 0 ? ` — “${aiSuggestion.keywords[0]}”` : ""}).
              <button type="button" className="link-btn" onClick={applySuggestion}>
                Apply
              </button>
            </div>
          )}
        </div>

        {(localError || submitError) && (
          <div className="error-text">{localError || submitError}</div>
        )}

        <button className="btn-block danger" disabled={submitting} onClick={handleSubmit}>
          {submitting ? "Submitting…" : "Submit report"}
        </button>
      </div>
    </div>
  );
}

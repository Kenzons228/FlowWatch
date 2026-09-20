import { useState } from "react";
import type { Report } from "../lib/types";
import { voteOnReport } from "../lib/api";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function ReportPopupContent({
  report,
  voterId,
  onVoted,
}: {
  report: Report;
  voterId: string;
  onVoted: (report: Report) => void;
}) {
  const [busy, setBusy] = useState(false);
  const net = report.upvotes - report.downvotes;
  const verified = net >= 3;
  const myVote = report.voters[voterId];
  const isExternal = report.source === "gdacs";

  async function vote(kind: "confirm" | "dispute") {
    setBusy(true);
    try {
      const updated = await voteOnReport(report.id, voterId, kind);
      onVoted(updated);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="popup-badges">
        {report.kind === "flood" && report.status && (
          <span className={`badge ${report.status}`}>
            {report.status === "flooded" ? "Flooded" : "Caution"}
          </span>
        )}
        {report.kind === "drain" && report.severity && (
          <span className={`badge ${report.severity}`}>{report.severity} blockage</span>
        )}
        {verified && <span className="badge verified">✓ Verified</span>}
        {report.resolved && <span className="badge resolved">Cleared</span>}
        {isExternal && <span className="badge external">🌐 {report.sourceLabel ?? "External alert"}</span>}
      </div>
      <p className="popup-desc">{report.description || "No description provided."}</p>
      {isExternal && (
        <p className="hint-text" style={{ marginBottom: 8 }}>
          Auto-synced from a global disaster monitor — this marks a broad regional alert, not an
          exact road. It's automatically cleared here once the source no longer lists it as active.{" "}
          {report.sourceUrl && (
            <a href={report.sourceUrl} target="_blank" rel="noreferrer">
              View source
            </a>
          )}
        </p>
      )}
      {!isExternal && (
        <p className="hint-text" style={{ marginBottom: 8 }}>
          Reported by a user, not verified by authorities — may not necessarily be accurate.
          Confirm or dispute below to help keep it current.
        </p>
      )}
      <div className="popup-meta">
        Reported {relativeTime(report.createdAt)} · {report.upvotes} confirm · {report.downvotes}{" "}
        cleared
      </div>
      <div className="popup-votes">
        <button
          className="vote-btn confirm"
          disabled={busy || myVote === "confirm"}
          onClick={() => vote("confirm")}
        >
          {report.kind === "flood" ? "Still flooded" : "Still blocked"}
        </button>
        <button
          className="vote-btn dispute"
          disabled={busy || myVote === "dispute"}
          onClick={() => vote("dispute")}
        >
          {report.kind === "flood" ? "Cleared now" : "Cleaned up"}
        </button>
      </div>
    </div>
  );
}

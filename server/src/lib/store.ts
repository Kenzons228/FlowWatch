import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import type { Report } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "..", "data", "reports.json");

let cache: Report[] | null = null;

async function ensureFile(): Promise<Report[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Report[];
  } catch {
    // No fabricated seed data — the map starts empty of user/drain reports
    // and fills in only from real submissions (plus the live GDACS sync).
    const empty: Report[] = [];
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function load(): Promise<Report[]> {
  if (!cache) cache = await ensureFile();
  return cache;
}

async function persist(): Promise<void> {
  if (!cache) return;
  await fs.writeFile(DATA_FILE, JSON.stringify(cache, null, 2));
}

export async function listReports(): Promise<Report[]> {
  return load();
}

export async function createReport(
  input: Omit<
    Report,
    "id" | "createdAt" | "upvotes" | "downvotes" | "voters" | "resolved" | "source" | "externalId" | "sourceLabel" | "sourceUrl"
  >
): Promise<Report> {
  const reports = await load();
  const report: Report = {
    ...input,
    id: nanoid(8),
    createdAt: new Date().toISOString(),
    upvotes: 0,
    downvotes: 0,
    voters: {},
    resolved: false,
    source: "user",
  };
  reports.unshift(report);
  await persist();
  return report;
}

/**
 * Create-or-update an externally-sourced report (e.g. a GDACS disaster
 * alert), keyed by externalId so re-syncing doesn't duplicate it or wipe
 * out votes users have already cast on it.
 */
export async function upsertExternalReport(
  input: Omit<Report, "id" | "upvotes" | "downvotes" | "voters" | "resolved"> & { externalId: string }
): Promise<Report> {
  const reports = await load();
  const existing = reports.find((r) => r.externalId === input.externalId);

  if (existing) {
    existing.status = input.status;
    existing.severity = input.severity;
    existing.description = input.description;
    existing.lat = input.lat;
    existing.lng = input.lng;
    existing.sourceLabel = input.sourceLabel;
    existing.sourceUrl = input.sourceUrl;
    // A previously-resolved alert that GDACS still reports as active reopens.
    existing.resolved = false;
    await persist();
    return existing;
  }

  const report: Report = {
    ...input,
    id: nanoid(8),
    upvotes: 0,
    downvotes: 0,
    voters: {},
    resolved: false,
  };
  reports.unshift(report);
  await persist();
  return report;
}

/**
 * Resolve (not delete — keeps history + votes, and matches how a
 * community-disputed report already disappears from the active layer)
 * any previously-synced external report whose source no longer lists it
 * as active. This is how "the outside source says it's over" propagates.
 */
export async function resolveStaleExternalReports(
  source: Report["source"],
  activeExternalIds: Set<string>
): Promise<number> {
  const reports = await load();
  let count = 0;
  for (const r of reports) {
    if (r.source === source && r.externalId && !r.resolved && !activeExternalIds.has(r.externalId)) {
      r.resolved = true;
      count += 1;
    }
  }
  if (count > 0) await persist();
  return count;
}

export async function voteReport(
  id: string,
  voterId: string,
  vote: "confirm" | "dispute"
): Promise<Report | null> {
  const reports = await load();
  const report = reports.find((r) => r.id === id);
  if (!report) return null;

  const prev = report.voters[voterId];
  if (prev === vote) return report; // no-op, already voted this way
  if (prev === "confirm") report.upvotes = Math.max(0, report.upvotes - 1);
  if (prev === "dispute") report.downvotes = Math.max(0, report.downvotes - 1);

  report.voters[voterId] = vote;
  if (vote === "confirm") report.upvotes += 1;
  else report.downvotes += 1;

  // A single "cleared/cleaned up" vote resolves it; a single "still there"
  // vote reopens it. Upvote/downvote tallies are still kept (e.g. for the
  // "verified" badge) but no longer gate whether it clears from the map.
  if (vote === "dispute") report.resolved = true;
  else report.resolved = false;

  await persist();
  return report;
}

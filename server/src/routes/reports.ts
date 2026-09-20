import { Router } from "express";
import { createReport, listReports, voteReport } from "../lib/store.js";
import type { DrainSeverity, FloodStatus, ReportKind } from "../lib/types.js";

const router = Router();

router.get("/", async (_req, res) => {
  const reports = await listReports();
  res.json({ reports });
});

router.post("/", async (req, res) => {
  const body = req.body as {
    kind?: ReportKind;
    status?: FloodStatus;
    severity?: DrainSeverity;
    description?: string;
    lat?: number;
    lng?: number;
  };

  const kind = body.kind;
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (kind !== "drain" && kind !== "flood") {
    res.status(400).json({ error: "kind must be 'drain' or 'flood'" });
    return;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat/lng must be valid numbers" });
    return;
  }
  if (kind === "flood" && body.status !== "flooded" && body.status !== "caution") {
    res.status(400).json({ error: "flood reports require status 'flooded' or 'caution'" });
    return;
  }
  if (
    kind === "drain" &&
    body.severity !== "minor" &&
    body.severity !== "moderate" &&
    body.severity !== "severe"
  ) {
    res.status(400).json({ error: "drain reports require a severity" });
    return;
  }

  const report = await createReport({
    kind,
    status: kind === "flood" ? body.status : undefined,
    severity: kind === "drain" ? body.severity : undefined,
    description: (body.description ?? "").slice(0, 300),
    lat,
    lng,
  });

  res.status(201).json({ report });
});

router.post("/:id/vote", async (req, res) => {
  const { id } = req.params;
  const { voterId, vote } = req.body as { voterId?: string; vote?: "confirm" | "dispute" };

  if (!voterId || (vote !== "confirm" && vote !== "dispute")) {
    res.status(400).json({ error: "voterId and vote ('confirm'|'dispute') are required" });
    return;
  }

  const report = await voteReport(id, voterId, vote);
  if (!report) {
    res.status(404).json({ error: "report not found" });
    return;
  }
  res.json({ report });
});

export default router;

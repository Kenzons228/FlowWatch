import { Router } from "express";
import { computePriorityQueue } from "../lib/priority.js";

const router = Router();

router.get("/", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat/lng are required" });
    return;
  }
  const items = await computePriorityQueue(lat, lng);
  res.json({ items: items.slice(0, 8) });
});

export default router;

import { Router } from "express";
import { generateOverview } from "../lib/overview.js";

const router = Router();

router.get("/", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const label = typeof req.query.label === "string" ? req.query.label : "your area";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat/lng are required" });
    return;
  }

  try {
    const overview = await generateOverview(lat, lng, label);
    res.json(overview);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

export default router;

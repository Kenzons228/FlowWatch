import { Router } from "express";
import { getElevation } from "../lib/elevation.js";

const router = Router();

router.get("/", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat/lng are required" });
    return;
  }
  try {
    const meters = await getElevation(lat, lng);
    const level: "low" | "moderate" | "high" =
      meters < 8 ? "low" : meters < 25 ? "moderate" : "high";
    res.json({ lat, lng, meters, level });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

export default router;

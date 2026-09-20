import { Router } from "express";
import { getRiverDischarge } from "../lib/river.js";
import { getTide } from "../lib/tide.js";

const router = Router();

router.get("/", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat/lng are required" });
    return;
  }
  const [river, tide] = await Promise.all([getRiverDischarge(lat, lng), getTide(lat, lng)]);
  res.json({ river, tide });
});

export default router;

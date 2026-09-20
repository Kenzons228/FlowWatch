import { Router } from "express";
import { getWeather } from "../lib/weather.js";

const router = Router();

router.get("/", async (req, res) => {
  const lat = Number(req.query.lat ?? -6.2088);
  const lng = Number(req.query.lng ?? 106.8456);
  try {
    const data = await getWeather(lat, lng);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

export default router;

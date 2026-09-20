import { Router } from "express";
import { computeRiskZones } from "../lib/risk.js";

const router = Router();

router.get("/", async (_req, res) => {
  const zones = await computeRiskZones();
  res.json({ zones });
});

export default router;

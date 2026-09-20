import { Router } from "express";
import { classifyDrainSeverity, classifyFloodStatus } from "../lib/classify.js";

const router = Router();

router.post("/", (req, res) => {
  const { kind, text } = req.body as { kind?: "drain" | "flood"; text?: string };
  if (kind !== "drain" && kind !== "flood") {
    res.status(400).json({ error: "kind must be 'drain' or 'flood'" });
    return;
  }
  if (!text || !text.trim()) {
    res.json({ suggested: null, confidence: "low", matchedKeywords: [] });
    return;
  }
  const result = kind === "drain" ? classifyDrainSeverity(text) : classifyFloodStatus(text);
  res.json(result);
});

export default router;

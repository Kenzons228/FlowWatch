import type { DrainSeverity, FloodStatus } from "./types.js";

/**
 * Lightweight keyword-based text classifier — deliberately not an ML/LLM
 * call (no external API, no key, fully offline and instant). It scans a
 * free-text description for signal words and returns a suggested
 * severity/status the user can accept or override, plus the words that
 * drove the decision so the suggestion is explainable.
 */

interface Rule {
  value: DrainSeverity | FloodStatus;
  weight: number;
  keywords: string[];
}

const DRAIN_RULES: Rule[] = [
  {
    value: "severe",
    weight: 3,
    keywords: [
      "completely",
      "fully blocked",
      "totally blocked",
      "choked",
      "overflowing",
      "not draining",
      "impossible",
      "full of",
      "packed with",
      "illegal dumping",
      "dump",
    ],
  },
  {
    value: "moderate",
    weight: 2,
    keywords: ["partially", "some", "building up", "half", "slow to drain", "leaves", "branches"],
  },
  {
    value: "minor",
    weight: 1,
    keywords: ["small", "little", "minor", "starting to", "bit of", "light"],
  },
];

const FLOOD_RULES: Rule[] = [
  {
    value: "flooded",
    weight: 3,
    keywords: [
      "impassable",
      "can't pass",
      "cannot pass",
      "stalling",
      "stalled",
      "submerged",
      "knee",
      "waist",
      "chest",
      "above knee",
      "cars turning back",
      "avoid",
      "closed",
    ],
  },
  {
    value: "caution",
    weight: 1,
    keywords: [
      "ankle",
      "receding",
      "slowly",
      "passable",
      "shallow",
      "one lane",
      "partially flooded",
      "caution",
    ],
  },
];

function scoreText(text: string, rules: Rule[]) {
  const lower = text.toLowerCase();
  const matches: { value: string; keyword: string; weight: number }[] = [];
  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) {
        matches.push({ value: rule.value, keyword, weight: rule.weight });
      }
    }
  }
  return matches;
}

export interface ClassifyResult<T extends string> {
  suggested: T | null;
  confidence: "low" | "medium" | "high";
  matchedKeywords: string[];
}

export function classifyDrainSeverity(text: string): ClassifyResult<DrainSeverity> {
  const matches = scoreText(text, DRAIN_RULES);
  return summarize(matches) as ClassifyResult<DrainSeverity>;
}

export function classifyFloodStatus(text: string): ClassifyResult<FloodStatus> {
  const matches = scoreText(text, FLOOD_RULES);
  return summarize(matches) as ClassifyResult<FloodStatus>;
}

function summarize(
  matches: { value: string; keyword: string; weight: number }[]
): ClassifyResult<string> {
  if (matches.length === 0) {
    return { suggested: null, confidence: "low", matchedKeywords: [] };
  }
  const tally = new Map<string, number>();
  for (const m of matches) tally.set(m.value, (tally.get(m.value) ?? 0) + m.weight);
  let best: string | null = null;
  let bestScore = -Infinity;
  for (const [value, score] of tally) {
    if (score > bestScore) {
      best = value;
      bestScore = score;
    }
  }
  const confidence = bestScore >= 3 ? "high" : bestScore >= 2 ? "medium" : "low";
  return {
    suggested: best,
    confidence,
    matchedKeywords: matches.filter((m) => m.value === best).map((m) => m.keyword),
  };
}

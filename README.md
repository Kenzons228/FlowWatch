# FlowWatch

A community-powered flood & drain hazard map that works in any city. Residents
report blocked drains and flooded roads, the live map shows what's currently
flooded, crowdsourced upvotes/disputes keep it accurate, and a route-safety
check warns you before you drive into a flooded road.

## App structure

An intro splash (first visit only) lets you use your current location or
search any city, then the app opens into four tabs:

- **Home** — an AI-style overview of your area (live weather + elevation +
  report data, written as a short briefing with suggestions), quick actions,
  and the three-part problem statement below it.
- **Map** — the live hazard map: report a hazard, check a route, toggle
  layers, vote on reports.
- **Stats** — a 12-hour rainfall chart, ground elevation, report activity,
  and the highest flood-risk zones nearby (with reverse-geocoded district
  names).
- **Settings** — switch city, light/dark/system theme, and an explanation of
  every data source the app uses.

## Features

- **Report** — flag a blocked drain (minor/moderate/severe) or a flooded road
  (caution/impassable) with a GPS location (or manual map pin) and a
  description — pick a preset chip or type your own words.
- **AI-assisted classification** — as you type a description, a keyword-based
  classifier suggests a severity/status with a confidence level and the words
  that drove it, which you can accept or override. This is a small rule-based
  NLP model, not a hosted LLM call — instant, free, and fully explainable.
- **Live map** — flooded roads in red/yellow, blocked-drain pins colour-coded
  by severity, all backed by a JSON-file datastore.
- **Community trust layer** — "Still flooded / Cleared now" (or "Still
  blocked / Cleaned up") voting; reports with 3+ net confirmations get a
  **✓ Verified** badge, and reports with enough disputes auto-resolve.
- **Predictive risk layer** — cross-references live rainfall (Open-Meteo) and
  ground elevation (also Open-Meteo) with clusters of unresolved drain
  reports to shade elevated flood-risk zones *before* a flood is reported.
- **Route safety check** — enter an origin/destination (search or pin on the
  map), get real driving routes from OSRM, and see whether any active flood
  report lies on the road — with alternatives ranked by which one is clear.
- **Works anywhere** — city search (OpenStreetMap Nominatim) isn't limited to
  Jakarta; weather, elevation, and risk scoring all run per-location.

## Stack

- **Client:** React + TypeScript + Vite, React Router, Zustand (persisted to
  `localStorage`), React-Leaflet/Leaflet + OpenStreetMap tiles, Recharts,
  Nominatim (search + reverse geocoding) and OSRM (routing) — no API keys.
- **Server:** Express + TypeScript, a JSON-file datastore
  (`server/data/reports.json`), Open-Meteo for rainfall + elevation.

## Getting started

```bash
npm run install:all
npm run dev
```

This starts the API on `http://localhost:8787` and the client (with a dev
proxy to the API) on `http://localhost:5183`.

## Notes

- Report data lives in `server/data/reports.json` (git-ignored, seeded with
  sample Jakarta reports automatically on first run).
- The risk score, the Home "AI Overview", and the description classifier are
  all deliberately rule-based (rain + report density + elevation, and
  keyword matching) — not ML, not a hosted LLM — so every number and
  suggestion is explainable and the app works without any API key or network
  dependency beyond the free public data sources above.
- Route buffers: a route is flagged if it passes within 120m of a "flooded"
  report or 70m of a "caution" report.

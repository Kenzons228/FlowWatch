import express from "express";
import cors from "cors";
import reportsRouter from "./routes/reports.js";
import weatherRouter from "./routes/weather.js";
import riskRouter from "./routes/risk.js";
import routeRouter from "./routes/route.js";
import classifyRouter from "./routes/classify.js";
import elevationRouter from "./routes/elevation.js";
import overviewRouter from "./routes/overview.js";
import priorityRouter from "./routes/priority.js";
import environmentRouter from "./routes/environment.js";
import { syncGdacsFloods } from "./lib/externalFloods.js";

const PORT = Number(process.env.FLOWWATCH_API_PORT ?? 8787);
const GDACS_SYNC_MS = 20 * 60 * 1000;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/reports", reportsRouter);
app.use("/api/weather", weatherRouter);
app.use("/api/risk", riskRouter);
app.use("/api/route", routeRouter);
app.use("/api/classify", classifyRouter);
app.use("/api/elevation", elevationRouter);
app.use("/api/overview", overviewRouter);
app.use("/api/priority", priorityRouter);
app.use("/api/environment", environmentRouter);

app.listen(PORT, () => {
  console.log(`FlowWatch API listening on http://localhost:${PORT}`);
});

syncGdacsFloods().then(({ synced, resolved }) => {
  console.log(`GDACS sync: ${synced} active flood alert(s), ${resolved} cleared`);
});
setInterval(() => {
  syncGdacsFloods().then(({ synced, resolved }) => {
    console.log(`GDACS sync: ${synced} active flood alert(s), ${resolved} cleared`);
  });
}, GDACS_SYNC_MS);

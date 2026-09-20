import { upsertExternalReport, resolveStaleExternalReports } from "./store.js";

// GDACS (Global Disaster Alert and Coordination System, run by the EU Joint
// Research Centre / UN OCHA) publishes a free, public, no-key RSS feed of
// active disasters worldwide, floods included. These are country/region
// scale events (one centroid point per disaster), not street-level reports,
// so they're surfaced on the map as broad "regional alert" circles rather
// than pretending to be a precise road report. Its own JSON search API's
// `iscurrent` flag turned out to be unreliable (always false in testing) —
// the RSS feed is the one GDACS actually keeps live, so we parse that.
const GDACS_RSS_URL = "https://www.gdacs.org/xml/rss.xml";

function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : null;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function countryFromTitle(title: string): string {
  const m = title.match(/flood(?:\s+alert)?\s+in\s+(.+)$/i);
  return m ? m[1].trim().replace(/[.\s]+$/, "") : "Unspecified region";
}

export async function syncGdacsFloods(): Promise<{ synced: number; resolved: number }> {
  try {
    const res = await fetch(GDACS_RSS_URL);
    if (!res.ok) return { synced: 0, resolved: 0 };
    const xml = await res.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

    const activeIds = new Set<string>();
    let synced = 0;

    for (const item of items) {
      if (extractTag(item, "gdacs:eventtype") !== "FL") continue;
      if (extractTag(item, "gdacs:iscurrent") !== "true") continue;

      const eventId = extractTag(item, "gdacs:eventid");
      const alertLevel = extractTag(item, "gdacs:alertlevel");
      const lat = Number(extractTag(item, "geo:lat"));
      const lng = Number(extractTag(item, "geo:long"));
      if (!eventId || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const title = decodeXmlEntities(extractTag(item, "title") ?? "Flood alert");
      const link = decodeXmlEntities(extractTag(item, "link") ?? "https://www.gdacs.org");
      const fromDate = extractTag(item, "gdacs:fromdate");
      const country = countryFromTitle(title);
      const externalId = `gdacs-${eventId}`;

      activeIds.add(externalId);
      await upsertExternalReport({
        kind: "flood",
        status: alertLevel === "Red" ? "flooded" : "caution",
        description: `${title} — tracked by the Global Disaster Alert and Coordination System.`,
        lat,
        lng,
        createdAt: fromDate ? new Date(fromDate).toISOString() : new Date().toISOString(),
        source: "gdacs",
        externalId,
        sourceLabel: `GDACS · ${country}`,
        sourceUrl: link,
      });
      synced += 1;
    }

    const resolved = await resolveStaleExternalReports("gdacs", activeIds);
    return { synced, resolved };
  } catch {
    return { synced: 0, resolved: 0 };
  }
}

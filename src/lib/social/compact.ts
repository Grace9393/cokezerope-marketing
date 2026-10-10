import type { SocialScan } from "./types";

/**
 * Compact form for the agent: no links (Ace cites posts by id) and capped text,
 * so a large scan always fits the /api/agent request limit.
 */
export function scanForAgent(scan: SocialScan) {
  return {
    days: scan.days,
    stats: scan.stats,
    topTopics: scan.topics.slice(0, 15),
    mentions: scan.mentions.slice(0, 24).map((m) => ({
      id: `SOCIAL › ${m.platform} › ${m.brand} › ${m.id}`,
      platform: m.platform,
      brand: m.brand,
      sentiment: m.sentiment,
      level: m.level,
      date: m.date,
      title: m.title.slice(0, 140),
      snippet: m.snippet.slice(0, 320),
      verified: m.verified,
    })),
    errors: scan.errors,
  };
}

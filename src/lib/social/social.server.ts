import { getGemini, aiErrorMessage } from "@/lib/ai/gemini.server";
import { MODELS } from "@/lib/ai/models";
import {
  PLATFORM_DOMAINS,
  SOCIAL_PLATFORMS,
  type BrandStats,
  type Mention,
  type SocialPlatform,
  type SocialScan,
} from "./types";

// Live social listening with Gemini + Google Search grounding. One search per
// brand runs in parallel. Mentions are marked `verified` when their link is a
// Google Search grounding link (or a domain Search cited) — the model is told
// never to invent posts; unverified links are labelled as such in the UI.

const MENTION_SCHEMA = {
  type: "object",
  properties: {
    mentions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          platform: {
            type: "string",
            description:
              "dcard, ptt, instagram, threads, facebook, youtube, mobile01, reddit or other",
          },
          title: { type: "string" },
          snippet: {
            type: "string",
            description: "1-2 sentence paraphrase of what the post says, in English",
          },
          url: {
            type: "string",
            description: "The post's link exactly as given in the search results",
          },
          date: { type: "string", description: "YYYY-MM-DD if known" },
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          level: { type: "number", description: "Intensity 1 (mild) to 3 (strong)" },
          topics: {
            type: "array",
            items: { type: "string" },
            description:
              "2-4 short English topic tags, 1-3 words each, e.g. 'long wear', 'oxidation', 'price', 'packaging'",
          },
        },
        required: ["platform", "title", "snippet", "sentiment", "topics"],
      },
    },
  },
  required: ["mentions"],
};

const hostOf = (u: string | null | undefined) => {
  if (!u) return null;
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\.|^m\./, "");
  } catch {
    return null;
  }
};

function platformOf(raw: string, url: string | null): SocialPlatform {
  const host = hostOf(url);
  if (host) {
    for (const [p, domains] of Object.entries(PLATFORM_DOMAINS))
      if (domains.some((d) => host === d || host.endsWith(`.${d}`))) return p as SocialPlatform;
  }
  const k = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (SOCIAL_PLATFORMS as readonly string[]).includes(k) ? (k as SocialPlatform) : "other";
}

type Step = { type: string; content?: { annotations?: { url?: string; title?: string }[] }[] };

async function scanBrand(
  brand: string,
  brandNo: number,
  platforms: string[],
  days: number,
): Promise<{ mentions: Mention[]; cited: string[] }> {
  const sites = platforms.length ? platforms : [...SOCIAL_PLATFORMS];
  const it = (await getGemini().interactions.create({
    model: MODELS.agent,
    input:
      `Use Google Search to find real social media and forum posts from Taiwan in the last ${days} days that discuss: ${brand}. ` +
      `Look on: ${sites.join(", ")} (Taiwan Chinese posts are expected — search in Traditional Chinese too). ` +
      `Return up to 10 distinct posts you actually found in search results. For url, copy the link exactly as it appears in the search results (grounding redirect links are fine). ` +
      `Never invent posts, URLs, dates or quotes; if you find fewer, return fewer. ` +
      `Classify consumer sentiment toward ${brand} in that post and give 2-4 short English topic tags.`,
    tools: [{ type: "google_search" }],
    response_format: { type: "text", mime_type: "application/json", schema: MENTION_SCHEMA },
  } as never)) as unknown as { output_text?: string | null; steps?: Step[] };

  const cited = new Set<string>();
  for (const s of it.steps ?? [])
    for (const c of s.content ?? [])
      for (const a of c.annotations ?? []) {
        const d = (a.title ?? "").toLowerCase().replace(/^www\./, "");
        if (d.includes(".")) cited.add(d);
      }

  let parsed: { mentions?: Partial<Mention & { level: number }>[] } = {};
  try {
    parsed = JSON.parse(it.output_text ?? "{}");
  } catch {
    parsed = {};
  }

  const mentions: Mention[] = (parsed.mentions ?? [])
    .filter((m) => m && m.snippet && m.title)
    .slice(0, 12)
    .map((m, i) => {
      const url = typeof m.url === "string" && /^https?:\/\//.test(m.url) ? m.url : null;
      const host = hostOf(url);
      // A Google Search grounding link proves the post came from a real search result.
      const grounded = host === "vertexaisearch.cloud.google.com";
      const verified =
        grounded || (!!host && [...cited].some((d) => host === d || host.endsWith(`.${d}`)));
      const level = Math.min(3, Math.max(1, Math.round(Number(m.level) || 2))) as 1 | 2 | 3;
      return {
        id: `b${brandNo}-${i + 1}`,
        platform: platformOf(String(m.platform ?? ""), url),
        brand,
        title: String(m.title).slice(0, 200),
        snippet: String(m.snippet).slice(0, 500),
        url,
        date:
          typeof m.date === "string" && /^\d{4}-\d{2}/.test(m.date) ? m.date.slice(0, 10) : null,
        sentiment:
          m.sentiment === "positive" || m.sentiment === "negative" ? m.sentiment : "neutral",
        level,
        topics: (m.topics ?? [])
          .map((x) => String(x).toLowerCase().trim())
          .filter((x) => x && x.length <= 30)
          .slice(0, 4),
        verified,
      };
    });
  return { mentions, cited: [...cited] };
}

export async function scanSocial(input: {
  brands: string[];
  platforms: string[];
  days: number;
}): Promise<SocialScan> {
  const started = Date.now();
  const brands = [...new Set(input.brands.map((b) => b.trim()).filter(Boolean))].slice(0, 4);
  const results = await Promise.allSettled(
    brands.map((b, i) => scanBrand(b, i + 1, input.platforms, input.days)),
  );

  const errors: string[] = [];
  const seen = new Set<string>();
  const mentions: Mention[] = [];
  const cited = new Set<string>();
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      errors.push(`${brands[i]}: ${aiErrorMessage(r.reason)}`);
      return;
    }
    r.value.cited.forEach((d) => cited.add(d));
    for (const m of r.value.mentions) {
      const key = m.url ?? `${m.brand}|${m.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      mentions.push(m);
    }
  });

  const stats: BrandStats[] = brands.map((brand) => {
    const ms = mentions.filter((m) => m.brand === brand);
    const pos = ms.filter((m) => m.sentiment === "positive").length;
    const neg = ms.filter((m) => m.sentiment === "negative").length;
    return {
      brand,
      total: ms.length,
      positive: pos,
      neutral: ms.length - pos - neg,
      negative: neg,
      netSentiment: ms.length ? Math.round(((pos - neg) / ms.length) * 100) / 100 : 0,
    };
  });

  const topicCounts = new Map<string, number>();
  for (const m of mentions)
    for (const t of m.topics) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
  const topics = [...topicCounts.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 60);

  return {
    scannedAt: new Date().toISOString(),
    days: input.days,
    brands,
    platforms: input.platforms,
    mentions,
    stats,
    topics,
    citedDomains: [...cited].slice(0, 30),
    errors,
    elapsedMs: Date.now() - started,
  };
}

export { scanForAgent } from "./compact";

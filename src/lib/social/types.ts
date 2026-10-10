// Social listening types shared by /api/social, the Ace agent and the v2 page.

export type Sentiment = "positive" | "neutral" | "negative";

export const SOCIAL_PLATFORMS = [
  "dcard",
  "ptt",
  "instagram",
  "threads",
  "facebook",
  "youtube",
  "mobile01",
  "reddit",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number] | "other";

export const PLATFORM_DOMAINS: Record<string, string[]> = {
  dcard: ["dcard.tw"],
  ptt: ["ptt.cc", "pttweb.cc"],
  instagram: ["instagram.com"],
  threads: ["threads.net", "threads.com"],
  facebook: ["facebook.com", "fb.com"],
  youtube: ["youtube.com", "youtu.be"],
  mobile01: ["mobile01.com"],
  reddit: ["reddit.com"],
};

export interface Mention {
  id: string;
  platform: SocialPlatform;
  brand: string;
  title: string;
  snippet: string;
  url: string | null;
  date: string | null;
  sentiment: Sentiment;
  /** 1 = mild, 2 = moderate, 3 = strong (Social Pulse grading). */
  level: 1 | 2 | 3;
  topics: string[];
  /** URL host matches a domain Google Search actually cited for this scan. */
  verified: boolean;
}

export interface BrandStats {
  brand: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  netSentiment: number; // (pos - neg) / total, -1..1
}

export interface SocialScan {
  scannedAt: string;
  days: number;
  brands: string[];
  platforms: string[];
  mentions: Mention[];
  stats: BrandStats[];
  topics: { term: string; count: number }[];
  citedDomains: string[];
  errors: string[];
  elapsedMs: number;
}

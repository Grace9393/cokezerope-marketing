import {
  Facebook,
  Globe,
  Hash,
  Instagram,
  MessageCircle,
  MessagesSquare,
  Smartphone,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Mention, Sentiment, SocialScan } from "@/lib/social/types";

// Ported from Social Pulse Insights (PlatformIcon, SentimentBadge, csv.ts),
// with a fixed class map instead of dynamic Tailwind sizes.

const PLATFORM: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  dcard: { icon: MessagesSquare, label: "Dcard", color: "text-sky-500" },
  ptt: { icon: Globe, label: "PTT", color: "text-teal-500" },
  instagram: { icon: Instagram, label: "Instagram", color: "text-pink-500" },
  threads: { icon: Hash, label: "Threads", color: "text-foreground" },
  facebook: { icon: Facebook, label: "Facebook", color: "text-blue-500" },
  youtube: { icon: Youtube, label: "YouTube", color: "text-red-500" },
  mobile01: { icon: Smartphone, label: "Mobile01", color: "text-emerald-600" },
  reddit: { icon: MessageCircle, label: "Reddit", color: "text-orange-500" },
  other: { icon: Globe, label: "Web", color: "text-muted-foreground" },
};

export function platformLabel(p: string) {
  return (PLATFORM[p] ?? PLATFORM.other).label;
}

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const meta = PLATFORM[platform] ?? PLATFORM.other;
  const Icon = meta.icon;
  return <Icon className={cn("h-4 w-4 shrink-0", meta.color, className)} aria-label={meta.label} />;
}

export const SENTIMENT_STYLE: Record<Sentiment, { label: string; badge: string; fill: string }> = {
  positive: { label: "Positive", badge: "bg-emerald-500/10 text-emerald-700", fill: "#10b981" },
  neutral: { label: "Neutral", badge: "bg-amber-500/10 text-amber-700", fill: "#f59e0b" },
  negative: { label: "Negative", badge: "bg-red-500/10 text-red-700", fill: "#ef4444" },
};

const LEVEL: Record<Sentiment, string[]> = {
  positive: ["Mildly positive", "Moderately positive", "Strongly positive"],
  neutral: ["Slightly positive neutral", "Fully neutral", "Slightly negative neutral"],
  negative: ["Mildly negative", "Moderately negative", "Strongly negative"],
};

export function SentimentBadge({ sentiment, level }: { sentiment: Sentiment; level?: 1 | 2 | 3 }) {
  const s = SENTIMENT_STYLE[sentiment];
  return (
    <span
      className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", s.badge)}
      title={level ? LEVEL[sentiment][level - 1] : s.label}
    >
      {s.label}
      {level ? ` · Lv${level}` : ""}
    </span>
  );
}

/** Prefix formula-like values and quote — prevents CSV formula injection in Excel. */
function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function scanToCsv(scan: SocialScan, mentions: Mention[]): string {
  const rows: unknown[][] = [
    ["=== Share of voice ==="],
    ["Brand", "Mentions", "Positive", "Neutral", "Negative", "Net sentiment"],
    ...scan.stats.map((b) => [b.brand, b.total, b.positive, b.neutral, b.negative, b.netSentiment]),
    [],
    ["=== Top topics ==="],
    ["Topic", "Count"],
    ...scan.topics.slice(0, 30).map((t) => [t.term, t.count]),
    [],
    ["=== Mentions ==="],
    [
      "Brand",
      "Platform",
      "Date",
      "Sentiment",
      "Level",
      "Title",
      "Snippet",
      "Topics",
      "URL",
      "Verified",
    ],
    ...mentions.map((m) => [
      m.brand,
      platformLabel(m.platform),
      m.date ?? "",
      m.sentiment,
      m.level,
      m.title,
      m.snippet,
      m.topics.join("; "),
      m.url ?? "",
      m.verified ? "yes" : "no",
    ]),
  ];
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

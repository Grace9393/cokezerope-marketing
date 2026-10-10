import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Download, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Mention, Sentiment, SocialScan } from "@/lib/social/types";
import { downloadText } from "@/components/agent/exports";
import { PlatformIcon, SentimentBadge, platformLabel, scanToCsv } from "./SocialBits";

/** Filterable feed of scanned posts (Social Pulse "Monitor" view). */
export function MentionFeed({
  scan,
  topic,
  onClearTopic,
  highlightId,
}: {
  scan: SocialScan;
  topic: string | null;
  onClearTopic: () => void;
  highlightId?: string | null;
}) {
  const [brand, setBrand] = useState<string>("all");
  const [platform, setPlatform] = useState<string>("all");
  const [sentiment, setSentiment] = useState<Sentiment | "all">("all");

  const platforms = useMemo(() => [...new Set(scan.mentions.map((m) => m.platform))], [scan]);
  const list = useMemo(
    () =>
      scan.mentions.filter(
        (m) =>
          (brand === "all" || m.brand === brand) &&
          (platform === "all" || m.platform === platform) &&
          (sentiment === "all" || m.sentiment === sentiment) &&
          (!topic || m.topics.includes(topic)),
      ),
    [scan, brand, platform, sentiment, topic],
  );

  const chip = (on: boolean) =>
    cn(
      "rounded-full border px-2.5 py-1 text-xs",
      on
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card hover:bg-accent",
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <button className={chip(brand === "all")} onClick={() => setBrand("all")}>
          All brands
        </button>
        {scan.brands.map((b) => (
          <button key={b} className={chip(brand === b)} onClick={() => setBrand(b)}>
            {b.length > 28 ? b.slice(0, 27) + "…" : b}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button className={chip(platform === "all")} onClick={() => setPlatform("all")}>
          All platforms
        </button>
        {platforms.map((p) => (
          <button
            key={p}
            className={cn(chip(platform === p), "inline-flex items-center gap-1")}
            onClick={() => setPlatform(p)}
          >
            <PlatformIcon platform={p} className="h-3 w-3" /> {platformLabel(p)}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        {(["all", "positive", "neutral", "negative"] as const).map((s) => (
          <button key={s} className={chip(sentiment === s)} onClick={() => setSentiment(s)}>
            {s === "all" ? "Any sentiment" : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
        {topic && (
          <Badge variant="secondary" className="gap-1">
            topic: {topic}
            <button onClick={onClearTopic} aria-label="Clear topic">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        <Button
          size="sm"
          variant="outline"
          className="ml-auto h-7 text-xs"
          onClick={() =>
            downloadText(
              `social-scan-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}.csv`,
              scanToCsv(scan, list),
              "text/csv;charset=utf-8",
            )
          }
        >
          <Download className="mr-1 h-3 w-3" /> Export CSV
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {list.length} of {scan.mentions.length} mentions
      </p>
      <ul className="space-y-2">
        {list.map((m) => (
          <MentionRow key={m.id} m={m} hit={highlightId === m.id} />
        ))}
      </ul>
    </div>
  );
}

function MentionRow({ m, hit }: { m: Mention; hit: boolean }) {
  return (
    <li
      id={`mention-${m.id}`}
      className={cn(
        "rounded-lg border border-border p-3 text-sm",
        hit && "ring-2 ring-primary bg-primary/5",
      )}
    >
      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs">
        <PlatformIcon platform={m.platform} />
        <span className="font-medium">{platformLabel(m.platform)}</span>
        <span className="text-muted-foreground">· {m.brand}</span>
        {m.date && <span className="text-muted-foreground">· {m.date}</span>}
        <SentimentBadge sentiment={m.sentiment} level={m.level} />
        {m.verified ? (
          <span
            className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700"
            title="Link came from Google Search grounding"
          >
            <BadgeCheck className="h-3 w-3" /> search-grounded
          </span>
        ) : (
          <span
            className="text-[10px] text-muted-foreground"
            title="Link reported by the model, not confirmed by search grounding"
          >
            unverified link
          </span>
        )}
      </div>
      <p className="font-medium leading-snug text-foreground">{m.title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{m.snippet}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {m.topics.map((t) => (
          <span
            key={t}
            className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
          >
            {t}
          </span>
        ))}
        {m.url && (
          <a
            href={m.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Open post <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </li>
  );
}

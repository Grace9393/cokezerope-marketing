import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Bot,
  Loader2,
  PlayCircle,
  Radar,
  Sparkles,
  Telescope,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { I18nProvider } from "@/lib/i18n";
import { snapshotEntries, getYears } from "@/lib/dashboard-data";
import { SOCIAL_PLATFORMS, type SocialScan } from "@/lib/social/types";
import { scanForAgent } from "@/lib/social/compact";
import { KpiCards, type Kpi } from "@/components/dashboard/KpiCards";
import { CompetitorResource } from "@/components/dashboard/CompetitorResource";
import { AcePanel } from "@/components/agent/AcePanel";
import type { AceRun } from "@/components/agent/useAce";
import { ProposalCard } from "@/components/agent/ProposalCard";
import { ActivityLog } from "@/components/agent/ActivityLog";
import { PriceAlerts } from "@/components/agent/PriceAlerts";
import { useApprovals } from "@/components/agent/useApprovals";
import { useApproveProposal } from "@/components/agent/useApproveProposal";
import {
  MicButton,
  ReadAloudButton,
  VoiceBar,
  useVoicePrefs,
} from "@/components/agent/VoiceControls";
import { useResearch } from "@/components/agent/useResearch";
import { ResearchCard } from "@/components/agent/ResearchCard";
import { PlatformIcon, platformLabel } from "@/components/social/SocialBits";
import { DemoMaskProvider, useDemoMask } from "@/lib/demo-mask";
import { DemoMaskToggle } from "@/components/DemoMaskToggle";
import { ShareOfVoice } from "@/components/social/ShareOfVoice";
import { WordCloud } from "@/components/social/WordCloud";
import { MentionFeed } from "@/components/social/MentionFeed";

// CokeZerope Marketing · Pulse (POC v2): competitive analysis + social
// listening for a make-up brand in Taiwan. Gemini for all reasoning, Gradium
// for voice. The demo scans three public competitor cushions; our own sales
// are the synthetic "AURUM GOLD" demo data.

const DEFAULT_BRANDS = [
  "Dior Forever cushion foundation",
  "M.A.C cushion foundation",
  "Laura Mercier cushion foundation",
];
const DEMO_COMPETITOR_URL =
  "https://www.momoshop.com.tw/search/searchShop.jsp?keyword=" + encodeURIComponent("氣墊粉餅");
const DEMO_QUESTION =
  "What are Taiwan consumers saying about the leading cushion foundations (Dior, M.A.C, Laura Mercier), how does that line up with our AURUM GOLD Cushion Foundation sales, and what should marketing do this week?";
const STARTERS = [
  "What are Taiwan consumers saying about Dior, M.A.C and Laura Mercier cushions?",
  "Is cushion buzz backing our AURUM GOLD Cushion Foundation growth?",
  "Write this week's marketing action brief (social + competitor prices)",
];

export const Route = createFileRoute("/v2")({
  head: () => ({
    meta: [
      { title: "CokeZerope Marketing · Pulse (v2) | Competitive analysis + social listening" },
      {
        name: "description",
        content:
          "POC v2: Gemini-powered competitive analysis and social listening (Dcard, PTT, Instagram, Threads, YouTube) for Taiwan beauty marketing, with Gradium voice.",
      },
    ],
  }),
  component: () => (
    <I18nProvider forceLang="en">
      <DemoMaskProvider>
        <MarketingPulse />
      </DemoMaskProvider>
    </I18nProvider>
  ),
});

function MarketingPulse() {
  const masker = useDemoMask();
  const [brands, setBrands] = useState<string[]>(DEFAULT_BRANDS);
  const [platforms, setPlatforms] = useState<Set<string>>(new Set(SOCIAL_PLATFORMS));
  const [days, setDays] = useState(90);
  const [scan, setScan] = useState<SocialScan | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const [aceOpen, setAceOpen] = useState(false);
  const [autoAsk, setAutoAsk] = useState<{ question: string; nonce: number } | null>(null);
  const [demoPlay, setDemoPlay] = useState<{ runId: string; nonce: number } | null>(null);
  const [demoQuestion, setDemoQuestion] = useState<string | null>(null);

  const approvals = useApprovals();
  const approveProposal = useApproveProposal(approvals, "en");
  const voicePrefs = useVoicePrefs("en");
  const research = useResearch();
  const year = useMemo(() => getYears(snapshotEntries).slice(-1)[0], []);

  const runScan = async (): Promise<SocialScan | null> => {
    const list = brands.map((b) => b.trim()).filter((b) => b.length >= 2);
    if (!list.length) {
      toast.error("Add at least one brand or product to scan.");
      return null;
    }
    setScanning(true);
    setScanError(null);
    setTopic(null);
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brands: list, platforms: [...platforms], days }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      setScan(j as SocialScan);
      toast.success(`${j.mentions.length} mentions found in ${Math.round(j.elapsedMs / 1000)}s`);
      return j as SocialScan;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setScanError(msg);
      toast.error(msg);
      return null;
    } finally {
      setScanning(false);
    }
  };

  // Demo: live social scan → Ace (marketing mode) with one competitor URL →
  // cited brief → Gradium read-aloud. Errors are shown, never faked.
  const runDemo = async () => {
    const s = scan ?? (await runScan());
    if (!s) return;
    const url = approvals.watchlist[0] ?? DEMO_COMPETITOR_URL;
    const q = `${DEMO_QUESTION} Competitor page: ${url}`;
    setDemoQuestion(q);
    setAceOpen(true);
    setAutoAsk({ question: q, nonce: Date.now() });
  };
  const onRunFinished = (run: AceRun) => {
    if (!demoQuestion || run.question !== demoQuestion) return;
    setDemoQuestion(null);
    if (run.brief?.spokenSummary) setDemoPlay({ runId: run.id, nonce: Date.now() });
  };

  const onCite = (id: string) => {
    if (id.startsWith("SOCIAL › ")) {
      const mentionId = id.split(" › ").slice(3).join(" › ");
      setTopic(null);
      setHighlightId(mentionId);
      setAceOpen(false);
      window.setTimeout(
        () =>
          document
            .getElementById(`mention-${mentionId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        550,
      );
    } else {
      toast.info(`Sales evidence: ${id}`, {
        description: "Open the v1 dashboard to see this row in the detail table.",
      });
    }
  };

  // Demo mask is display-only: Ace still receives the real scan.
  const shown = useMemo(
    () => (scan && masker.theme !== "off" ? masker.deepMask(scan) : scan),
    [scan, masker],
  );

  const kpis: Kpi[] = useMemo(() => {
    if (!shown) return [];
    const n = shown.mentions.length;
    const pos = shown.mentions.filter((m) => m.sentiment === "positive").length;
    const neg = shown.mentions.filter((m) => m.sentiment === "negative").length;
    const ver = shown.mentions.filter((m) => m.verified).length;
    const lead = [...shown.stats].sort((a, b) => b.total - a.total)[0];
    const pct = (x: number) => (n ? `${Math.round((x / n) * 100)}%` : "—");
    return [
      { label: "Mentions", value: String(n), sub: `last ${shown.days} days` },
      { label: "Positive", value: pct(pos), sub: `${pos} posts` },
      { label: "Negative", value: pct(neg), sub: `${neg} posts` },
      {
        label: "Share-of-voice leader",
        value: lead ? lead.brand.split(" ").slice(0, 2).join(" ") : "—",
        sub: lead ? `${lead.total} mentions` : undefined,
      },
      { label: "Search-grounded links", value: pct(ver), sub: `${ver} of ${n}` },
    ];
  }, [shown]);

  const togglePlatform = (p: string) =>
    setPlatforms((cur) => {
      const next = new Set(cur);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  const researchButton = (topicText: string) => (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs"
      disabled={research.running}
      onClick={() => {
        void research.start(topicText, "en");
        window.setTimeout(
          () =>
            document
              .getElementById("research-card")
              ?.scrollIntoView({ behavior: "smooth", block: "center" }),
          100,
        );
      }}
    >
      <Telescope className="mr-1 h-3.5 w-3.5" /> Deep research
    </Button>
  );

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      <header className="top-0 z-10 border-b border-border bg-background/80 backdrop-blur sm:sticky">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Radar className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-foreground">
                CokeZerope Marketing{" "}
                <span className="text-xs font-medium text-muted-foreground">· Pulse (v2)</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Competitive analysis + social listening · Taiwan beauty
                <span className="ml-2 hidden rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary sm:inline">
                  Built with Gemini · Voice by Gradium
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DemoMaskToggle />
            <Button asChild size="sm" variant="ghost" className="h-8">
              <Link to="/">
                <ArrowLeft className="mr-1 h-4 w-4" /> v1 dashboard
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={runDemo}
              disabled={scanning}
            >
              <PlayCircle className="mr-1.5 h-4 w-4" /> Run demo
            </Button>
            <Button size="sm" className="h-8" onClick={() => setAceOpen(true)}>
              <Bot className="mr-1.5 h-4 w-4" /> Ask Ace
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <PriceAlerts alerts={approvals.alerts} onDismiss={approvals.dismissAlert} />

        {/* ---------- social listening controls ---------- */}
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Social listening</h2>
            <span className="text-xs text-muted-foreground">
              Live Gemini + Google Search over Taiwan social media and forums
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {brands.map((b, i) => (
              <Input
                key={i}
                value={masker.theme === "off" ? b : masker.mask(b)}
                readOnly={masker.theme !== "off"}
                title={
                  masker.theme !== "off"
                    ? "Demo mask is on: switch to Real names to edit"
                    : undefined
                }
                placeholder={`Brand / product ${i + 1}`}
                onChange={(e) =>
                  setBrands((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))
                }
                className="h-9 text-sm"
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {SOCIAL_PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
                  platforms.has(p)
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                <PlatformIcon platform={p} className="h-3 w-3" /> {platformLabel(p)}
              </button>
            ))}
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="ml-auto h-8 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[30, 90, 180].map((d) => (
                  <SelectItem key={d} value={String(d)} className="text-xs">
                    Last {d} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8"
              onClick={() => void runScan()}
              disabled={scanning || platforms.size === 0}
            >
              {scanning ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Radar className="mr-1.5 h-4 w-4" />
              )}
              {scanning ? "Scanning…" : "Scan"}
            </Button>
          </div>
          {scanning && (
            <p className="mt-2 text-xs text-muted-foreground">
              Gemini is searching {platforms.size} platforms for {brands.filter(Boolean).length}{" "}
              brands in parallel — usually 45–80 s.
            </p>
          )}
          {scanError && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> {scanError}
            </p>
          )}
          {scan?.errors.map((e) => (
            <p key={e} className="mt-1 text-xs text-amber-700">
              {e}
            </p>
          ))}
        </Card>

        {!scan && !scanning && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Run a scan to see share of voice, sentiment, consumer topics and the posts behind them —
            or press <span className="font-medium text-foreground">Run demo</span>.
          </Card>
        )}

        {shown && (
          <>
            <KpiCards kpis={kpis} />
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-4">
                <h3 className="mb-1 text-sm font-semibold">Share of voice & sentiment</h3>
                <p className="mb-2 text-xs text-muted-foreground">
                  Mentions per brand, stacked by sentiment
                </p>
                <ShareOfVoice stats={shown.stats} />
                <div className="mt-2 grid gap-1 text-xs">
                  {shown.stats.map((s) => (
                    <div key={s.brand} className="flex justify-between gap-2">
                      <span className="truncate text-muted-foreground">{s.brand}</span>
                      <span
                        className={cn(
                          "font-medium tabular-nums",
                          s.netSentiment >= 0 ? "text-emerald-700" : "text-red-700",
                        )}
                      >
                        net {s.netSentiment >= 0 ? "+" : ""}
                        {Math.round(s.netSentiment * 100)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="mb-1 text-sm font-semibold">What consumers talk about</h3>
                <p className="mb-2 text-xs text-muted-foreground">
                  Topics from the scanned posts — click to filter the feed
                </p>
                <WordCloud
                  words={shown.topics}
                  active={topic}
                  onPick={(t) => setTopic((cur) => (cur === t ? null : t))}
                />
              </Card>
            </div>
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Mentions</h3>
              <MentionFeed
                scan={shown}
                topic={topic}
                onClearTopic={() => setTopic(null)}
                highlightId={highlightId}
              />
            </Card>
          </>
        )}

        {/* ---------- competitive analysis ---------- */}
        <CompetitorResource
          watchlist={approvals.watchlist}
          onRemoveWatch={approvals.removeFromWatchlist}
          headerExtras={researchButton("Luxury cushion foundation")}
        />

        {research.job && (
          <div id="research-card">
            <ResearchCard
              job={research.job}
              onCancel={research.cancel}
              onDismiss={research.dismiss}
            />
          </div>
        )}
      </main>

      <AcePanel
        open={aceOpen}
        onOpenChange={setAceOpen}
        onCite={onCite}
        title="Ace · marketing analyst"
        starters={STARTERS}
        ctx={{
          entries: snapshotEntries,
          metric: "value",
          year,
          selectedCategory: "AURUM GOLD",
          lang: "en",
          watchlist: approvals.watchlist,
          researchContext: research.context,
          mode: "marketing",
          socialContext: scan ? JSON.stringify(scanForAgent(scan)) : null,
        }}
        onProposal={(p, run) =>
          approvals.log({
            proposalId: p.id,
            type: p.type,
            title: p.title,
            question: run.displayQuestion ?? run.question,
            decision: "proposed",
          })
        }
        renderProposal={(p, run) => (
          <ProposalCard
            proposal={p}
            status={approvals.status[p.id]}
            onApprove={(edited) => approveProposal(edited, run)}
            onReject={(x) =>
              approvals.log({
                proposalId: x.id,
                type: x.type,
                title: x.title,
                question: run.displayQuestion ?? run.question,
                decision: "rejected",
              })
            }
            onEdited={(x) =>
              approvals.log({
                proposalId: x.id,
                type: x.type,
                title: x.title,
                question: run.displayQuestion ?? run.question,
                decision: "edited",
              })
            }
          />
        )}
        activity={<ActivityLog entries={approvals.activity} />}
        autoAsk={autoAsk}
        onRunFinished={onRunFinished}
        inputExtras={(setInput, disabled) => (
          <MicButton
            lang={voicePrefs.lang}
            vocabulary={["Dior", "AURUM GOLD", "M.A.C", "Laura Mercier", "Dcard", "PTT", "momo"]}
            onTranscript={setInput}
            disabled={disabled}
          />
        )}
        briefExtras={(run) =>
          run.brief?.spokenSummary ? (
            <ReadAloudButton
              text={run.brief.spokenSummary}
              sourceLang={run.lang}
              prefs={voicePrefs}
              autoPlayNonce={demoPlay?.runId === run.id ? demoPlay.nonce : undefined}
            />
          ) : null
        }
        footer={<VoiceBar prefs={voicePrefs} />}
      />
    </div>
  );
}

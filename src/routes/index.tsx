import { useCallback, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, PlayCircle, Sparkles, Telescope } from "lucide-react";
import {
  type Entry,
  type Metric,
  METRIC_LABELS,
  snapshotEntries,
  getYears,
  getCategories,
  categoryTotals,
  grandTotal,
  entryTotal,
  formatMetric,
  yoy,
  entryMonths,
} from "@/lib/dashboard-data";
import { Uploader } from "@/components/dashboard/Uploader";
import { KpiCards, type Kpi } from "@/components/dashboard/KpiCards";
import { CategoryBenchmark } from "@/components/dashboard/CategoryBenchmark";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { CategoryDrilldown } from "@/components/dashboard/CategoryDrilldown";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { DetailTable } from "@/components/dashboard/DetailTable";
import { CompetitorResource } from "@/components/dashboard/CompetitorResource";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { DemoMaskProvider, useDemoMask } from "@/lib/demo-mask";
import { DemoMaskToggle } from "@/components/DemoMaskToggle";
import { researchTopic } from "@/lib/research-topics";
import { Button } from "@/components/ui/button";
import { AcePanel } from "@/components/agent/AcePanel";
import { ProposalCard } from "@/components/agent/ProposalCard";
import { ActivityLog } from "@/components/agent/ActivityLog";
import { PriceAlerts } from "@/components/agent/PriceAlerts";
import { useApprovals } from "@/components/agent/useApprovals";
import { useApproveProposal } from "@/components/agent/useApproveProposal";
import { briefToMarkdown, downloadText, openMailDraft } from "@/components/agent/exports";
import type { AceRun } from "@/components/agent/useAce";
import {
  MicButton,
  ReadAloudButton,
  VoiceBar,
  useVoicePrefs,
} from "@/components/agent/VoiceControls";
import { useResearch } from "@/components/agent/useResearch";
import { ResearchCard } from "@/components/agent/ResearchCard";
import type { Proposal } from "@/lib/agent/types";
import { toast } from "sonner";
import { isAllowedRetailer } from "@/lib/retailers";

// Public momo search page used by "Run demo" when no watchlist URL is saved yet.
const DEMO_COMPETITOR_URL =
  "https://www.momoshop.com.tw/search/searchShop.jsp?keyword=" + encodeURIComponent("氣墊粉餅");

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CokeZerope Marketing · 彩妝品類洞察 | Ace agent" },
      {
        name: "description",
        content:
          "以台灣市場為主的彩妝品類與品牌競爭分析儀表板：金額、數量與單價，含年增率與自動洞察，支援中英文切換。",
      },
      { property: "og:title", content: "CokeZerope Marketing" },
      {
        property: "og:description",
        content: "台灣市場彩妝品類與品牌競爭分析：金額、數量與單價及年增趨勢。",
      },
    ],
  }),
  component: () => (
    <I18nProvider>
      <DemoMaskProvider>
        <Dashboard />
      </DemoMaskProvider>
    </I18nProvider>
  ),
});

function Dashboard() {
  const { t, lang, setLang, monthAt, metricShort } = useI18n();
  const [entries, setEntries] = useState<Entry[]>(snapshotEntries);
  const [metric, setMetric] = useState<Metric>("value");

  const masker = useDemoMask();
  // Demo mask is display-only: the UI renders masked names, Ace gets the real rows.
  const displayEntries = useMemo(
    () =>
      masker.theme === "off"
        ? entries
        : entries.map((e) => ({
            ...e,
            category: masker.mask(e.category),
            brand: masker.mask(e.brand),
          })),
    [entries, masker],
  );
  const rawCatOf = (display: string) =>
    entries.find((e) => masker.mask(e.category) === display)?.category ?? display;

  const years = useMemo(() => getYears(entries), [entries]);
  const [year, setYear] = useState<number>(years[years.length - 1]);
  const cats = useMemo(() => getCategories(displayEntries), [displayEntries]);
  const [selectedCat, setSelectedCat] = useState<string>(cats[0] ?? "");

  // keep selections valid when a new file is loaded
  const activeYear = years.includes(year) ? year : years[years.length - 1];
  const prevYear = years.includes(activeYear - 1) ? activeYear - 1 : null;
  const activeCat = cats.includes(selectedCat) ? selectedCat : (cats[0] ?? "");

  const [aceOpen, setAceOpen] = useState(false);
  const approvals = useApprovals();
  const voicePrefs = useVoicePrefs(lang);
  const research = useResearch();
  const [autoAsk, setAutoAsk] = useState<{ question: string; nonce: number } | null>(null);
  const [demoNonce, setDemoNonce] = useState<number | null>(null);

  // Demo: real question + one saved competitor URL → brief → read aloud. No canned results.
  const runDemo = () => {
    const url = approvals.watchlist[0] ?? DEMO_COMPETITOR_URL;
    const nonce = Date.now();
    setDemoNonce(nonce);
    setAceOpen(true);
    setAutoAsk({
      question: `${t("demo.question")} ${lang === "zh" ? "競品頁面" : "Competitor page"}: ${url}`,
      nonce,
    });
  };
  const [demoPlay, setDemoPlay] = useState<{ runId: string; nonce: number } | null>(null);
  const onRunFinished = (run: AceRun) => {
    if (!demoNonce || !autoAsk || run.question !== autoAsk.question) return;
    setDemoNonce(null);
    // Play through the brief's Read-aloud button so the Stop button is shown.
    if (run.brief?.spokenSummary) setDemoPlay({ runId: run.id, nonce: Date.now() });
  };

  const startResearch = (topic: string) => {
    if (research.running) {
      toast.error(t("research.busy"));
      return;
    }
    void research.start(topic, lang);
    window.setTimeout(
      () =>
        document
          .getElementById("research-card")
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      100,
    );
  };
  const researchButton = (topic: string) => (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs"
      disabled={research.running}
      onClick={() => startResearch(topic)}
    >
      <Telescope className="mr-1 h-3.5 w-3.5" /> {t("research.button")}
    </Button>
  );
  // Product and category names help speech-to-text spell brand names correctly.
  const vocabulary = useMemo(
    () =>
      [...new Set(entries.flatMap((e) => [e.category, e.brand]))]
        .filter((x) => x && x !== "All")
        .slice(0, 80),
    [entries],
  );

  const approveProposal = useApproveProposal(approvals, lang);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Citation chip → select category / metric / year, then scroll to and highlight the row.
  const onCite = useCallback(
    (id: string) => {
      const [cat, product, m, y] = id.split(" › ");
      if (cat && cat !== "All" && cats.includes(cat)) setSelectedCat(cat);
      if (m === "value" || m === "qty" || m === "factor") setMetric(m);
      if (years.includes(Number(y))) setYear(Number(y));
      setHighlightId(id);
      setAceOpen(false);
      window.setTimeout(() => {
        const row = document.querySelector(`[data-row-key="${CSS.escape(`${cat} › ${product}`)}"]`);
        (row ?? document.getElementById("detail-table"))?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 550);
    },
    [cats, years],
  );

  const onData = (e: Entry[]) => {
    setEntries(e);
    setYear(getYears(e).slice(-1)[0]);
    setSelectedCat(getCategories(e)[0] ?? "");
  };

  const kpis: Kpi[] = useMemo(() => {
    const grand = grandTotal(displayEntries);
    const total = grand ? entryTotal(grand, metric, activeYear) : 0;
    const prevTotal = grand && prevYear ? entryTotal(grand, metric, prevYear) : 0;
    const catList = categoryTotals(displayEntries)
      .map((c) => ({ name: c.category, v: entryTotal(c, metric, activeYear) }))
      .sort((a, b) => b.v - a.v);
    const brandList = displayEntries
      .filter((e) => !e.isCategoryTotal && e.category !== "All")
      .map((e) => ({ name: e.brand, cat: e.category, v: entryTotal(e, metric, activeYear) }))
      .sort((a, b) => b.v - a.v);
    let peakIdx = 0;
    if (grand) {
      const m = entryMonths(grand, metric, activeYear);
      m.forEach((v, i) => {
        if ((v ?? 0) > (m[peakIdx] ?? 0)) peakIdx = i;
      });
    }
    return [
      {
        label:
          metric === "factor"
            ? t("kpi.totalFactor")
            : metric === "qty"
              ? t("kpi.totalQty")
              : t("kpi.totalValue"),
        value: formatMetric(
          metric === "factor" && grand ? entryTotal(grand, "factor", activeYear) : total,
          metric,
        ),
        delta: metric === "factor" ? undefined : prevYear ? yoy(total, prevTotal) : undefined,
        sub: prevYear ? t("kpi.vs", { year: prevYear }) : undefined,
      },
      { label: t("kpi.categories"), value: String(cats.length), sub: t("kpi.tracked") },
      {
        label: t("kpi.topCategory"),
        value: catList[0]?.name ?? "—",
        sub: formatMetric(catList[0]?.v ?? null, metric),
      },
      { label: t("kpi.topBrand"), value: brandList[0]?.name ?? "—", sub: brandList[0]?.cat },
      {
        label: t("kpi.peakMonth"),
        value: monthAt(peakIdx),
        sub: t("kpi.seasonality", { year: activeYear }),
      },
    ];
  }, [displayEntries, metric, activeYear, prevYear, cats.length, t, monthAt]);

  const drillEntry = useMemo(
    () => categoryTotals(displayEntries).find((e) => e.category === activeCat),
    [displayEntries, activeCat],
  );

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      <header className="top-0 sm:sticky z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-foreground">
                {t("app.title")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t("app.subtitle")}
                <span className="ml-2 hidden rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary sm:inline">
                  {t("ace.badge")}
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
              <TabsList>
                {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
                  <TabsTrigger key={m} value={m} className="text-xs">
                    {metricShort(m)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Select value={String(activeYear)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-8 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setLang(lang === "zh" ? "en" : "zh")}
            >
              {t("lang.toggle")}
            </Button>
            <Uploader onData={onData} />
            <DemoMaskToggle />
            <Button asChild size="sm" variant="ghost" className="h-8">
              <Link to="/v2">Pulse (v2) · Marketing →</Link>
            </Button>
            <Button size="sm" variant="outline" className="h-8" onClick={runDemo}>
              <PlayCircle className="mr-1.5 h-4 w-4" /> {t("demo.run")}
            </Button>
            <Button size="sm" className="h-8" onClick={() => setAceOpen(true)}>
              <Bot className="mr-1.5 h-4 w-4" /> {t("ace.button")}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <PriceAlerts alerts={approvals.alerts} onDismiss={approvals.dismissAlert} />

        <KpiCards kpis={kpis} />

        <CompetitorResource
          watchlist={approvals.watchlist}
          onRemoveWatch={approvals.removeFromWatchlist}
          headerExtras={researchButton(`${researchTopic(rawCatOf(activeCat))}: competitor brands`)}
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

        <div className="grid gap-4 lg:grid-cols-2">
          <CategoryBenchmark
            entries={displayEntries}
            metric={metric}
            year={activeYear}
            selected={activeCat}
            onSelect={setSelectedCat}
          />
          <TrendChart
            entry={grandTotal(displayEntries)}
            metric={metric}
            title={t("trend.allMakeup")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{t("drillInto")}</span>

          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCat(c)}
              className={
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                (c === activeCat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent")
              }
            >
              {c}
            </button>
          ))}
          <div className="ml-auto">{researchButton(researchTopic(rawCatOf(activeCat)))}</div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <CategoryDrilldown
            entries={displayEntries}
            category={activeCat}
            metric={metric}
            year={activeYear}
            prevYear={prevYear}
          />
          <TrendChart entry={drillEntry} metric={metric} title={activeCat} />
        </div>

        <InsightsPanel
          entries={displayEntries}
          metric={metric}
          year={activeYear}
          prevYear={prevYear}
        />

        <DetailTable
          entries={displayEntries}
          metric={metric}
          year={activeYear}
          prevYear={prevYear}
          category={activeCat}
          highlightId={highlightId}
        />
      </main>

      <AcePanel
        open={aceOpen}
        onOpenChange={setAceOpen}
        onCite={onCite}
        ctx={{
          entries,
          metric,
          year: activeYear,
          selectedCategory: rawCatOf(activeCat),
          lang,
          watchlist: approvals.watchlist,
          researchContext: research.context,
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
            vocabulary={vocabulary}
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

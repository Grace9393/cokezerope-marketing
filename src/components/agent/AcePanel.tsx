import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Database,
  TrendingUp,
  Globe,
  Scale,
  Lightbulb,
  ListChecks,
  Loader2,
  Send,
  Square,
  ImagePlus,
  X,
  AlertTriangle,
  CheckCircle2,
  Telescope,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useDemoMask } from "@/lib/demo-mask";
import type { AgentImage, Proposal } from "@/lib/agent/types";
import {
  useAce,
  fileToAgentImage,
  type AceContext,
  type AceRun,
  type TimelineItem,
} from "./useAce";

const TOOL_ICONS: Record<string, typeof Database> = {
  query_dashboard: Database,
  top_movers: TrendingUp,
  scrape_competitor: Globe,
  compare_prices: Scale,
  propose_action: Lightbulb,
};

export interface AcePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ctx: AceContext;
  /** Citation chip clicked: select the category and highlight the row. */
  onCite: (evidenceId: string) => void;
  /** Render a proposal (Approve / Edit / Reject lives in the parent). */
  renderProposal?: (p: Proposal, run: AceRun) => ReactNode;
  /** Extra controls under a finished brief (e.g. read aloud). */
  briefExtras?: (run: AceRun) => ReactNode;
  /** Controls next to the input (e.g. push-to-talk mic). */
  inputExtras?: (setInput: (v: string) => void, disabled: boolean) => ReactNode;
  /** Activity tab content. */
  activity?: ReactNode;
  /** Ask programmatically (demo mode); bump nonce to re-trigger. */
  autoAsk?: { question: string; nonce: number } | null;
  onRunFinished?: (run: AceRun) => void;
  /** Called once per new proposal as it streams in (for the activity log). */
  onProposal?: (p: Proposal, run: AceRun) => void;
  footer?: ReactNode;
  /** Starter chips (defaults to the category-manager starters). */
  starters?: string[];
  /** Panel title override (e.g. marketing mode). */
  title?: string;
}

export function AcePanel({
  open,
  onOpenChange,
  ctx,
  onCite,
  renderProposal,
  briefExtras,
  inputExtras,
  activity,
  autoAsk,
  onRunFinished,
  onProposal,
  footer,
  starters: startersProp,
  title,
}: AcePanelProps) {
  const { t } = useI18n();
  const masker = useDemoMask();
  const { runs, running, ask, stop, reset } = useAce(masker.theme === "off" ? undefined : masker);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<AgentImage | null>(null);
  const [tab, setTab] = useState("ask");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const submit = async (q?: string) => {
    // typed text may contain themed demo names: map them back to the real ones for Ace
    const question = masker.unmask((q ?? input).trim());
    if (!question || running) return;
    setInput("");
    const img = image;
    setImage(null);
    setTab("ask");
    const run = await ask(question, ctxRef.current, img);
    if (run) onRunFinished?.(run);
  };

  useEffect(() => {
    if (autoAsk?.question) void submit(autoAsk.question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAsk?.nonce]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [runs]);

  const seen = useRef(new Set<string>());
  useEffect(() => {
    for (const run of runs)
      for (const p of run.proposals)
        if (!seen.current.has(p.id)) {
          seen.current.add(p.id);
          onProposal?.(p, run);
        }
  }, [runs, onProposal]);

  const onPickFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      toast.error(t("ace.imageTooBig"));
      return;
    }
    try {
      setImage(await fileToAgentImage(f));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const starters = startersProp ?? [t("ace.starter1"), t("ace.starter2"), t("ace.starter3")];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border p-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> {title ?? t("ace.title")}
          </SheetTitle>
          <SheetDescription className="text-xs">{t("ace.subtitle")}</SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <TabsList className="h-8">
              <TabsTrigger value="ask" className="text-xs">
                {t("ace.tab.ask")}
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                {t("ace.tab.activity")}
              </TabsTrigger>
            </TabsList>
            {runs.length > 0 && !running && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={reset}>
                <RotateCcw className="mr-1 h-3 w-3" /> {t("ace.new")}
              </Button>
            )}
          </div>

          <TabsContent value="ask" className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {runs.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("ace.empty")}</p>
                <div className="flex flex-wrap gap-2">
                  {starters.map((s) => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-xs hover:bg-accent"
                    >
                      {masker.mask(s)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-5">
              {runs.map((run) => (
                <RunView
                  key={run.id}
                  run={run}
                  onCite={onCite}
                  renderProposal={renderProposal}
                  briefExtras={briefExtras}
                />
              ))}
            </div>
            <div ref={endRef} />
          </TabsContent>

          <TabsContent value="activity" className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {activity}
          </TabsContent>
        </Tabs>

        <div className="border-t border-border p-3">
          {image && (
            <div className="mb-2 flex items-center gap-2 text-xs">
              <img
                src={`data:${image.mimeType};base64,${image.data}`}
                alt=""
                className="h-10 w-10 rounded object-cover"
              />
              <span className="text-muted-foreground">{t("ace.imageAttached")}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setImage(null)}
              >
                <X className="mr-1 h-3 w-3" /> {t("ace.remove")}
              </Button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder={t("ace.placeholder")}
              className="min-h-[44px] flex-1 resize-none text-sm"
              rows={2}
            />
            <div className="flex flex-col gap-1">
              {running ? (
                <Button size="sm" variant="secondary" onClick={stop} className="h-8">
                  <Square className="mr-1 h-3.5 w-3.5" /> {t("ace.stop")}
                </Button>
              ) : (
                <Button size="sm" onClick={() => submit()} disabled={!input.trim()} className="h-8">
                  <Send className="mr-1 h-3.5 w-3.5" /> {t("ace.send")}
                </Button>
              )}
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  title={t("ace.attach")}
                  aria-label={t("ace.attach")}
                  onClick={() => fileRef.current?.click()}
                  disabled={running}
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                {inputExtras?.(setInput, running)}
              </div>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              void onPickFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {footer}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RunView({
  run,
  onCite,
  renderProposal,
  briefExtras,
}: {
  run: AceRun;
  onCite: (id: string) => void;
  renderProposal?: (p: Proposal, run: AceRun) => ReactNode;
  briefExtras?: (run: AceRun) => ReactNode;
}) {
  const { t } = useI18n();
  const toolCount = run.timeline.filter((x) => x.kind === "tool").length;
  return (
    <div className="space-y-3">
      <div className="ml-auto w-fit max-w-[90%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
        {run.displayQuestion ?? run.question}
        {run.hadImage && <span className="ml-2 text-xs opacity-80">🖼</span>}
      </div>

      <ol className="space-y-1.5 border-l border-border pl-3">
        {run.timeline.map((item, i) => (
          <TimelineRow key={i} item={item} />
        ))}
        {run.status === "running" && (
          <li className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("ace.working")}
          </li>
        )}
      </ol>

      {run.notices.map((n, i) => (
        <p key={i} className="flex items-start gap-1.5 text-xs text-amber-600">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {n}
        </p>
      ))}

      {run.status === "error" && run.error && !run.brief && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          <span className="font-semibold">{t("ace.error")}:</span> {run.error}
        </div>
      )}

      {run.brief && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p className="text-sm font-semibold leading-snug text-foreground">
              {run.brief.headline}
            </p>
          </div>
          {run.brief.findings.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("ace.findings")}
              </p>
              <ul className="space-y-2">
                {run.brief.findings.map((f, i) => (
                  <li key={i} className="text-sm leading-snug text-foreground">
                    {f.text}
                    {f.evidenceIds.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {f.evidenceIds.map((id) => (
                          <button
                            key={id}
                            onClick={() => onCite(id)}
                            title={t("ace.cite")}
                            className="rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/10"
                          >
                            {id}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {run.brief.suggestDeepResearch && (
            <p className="flex items-center gap-1.5 text-xs text-primary">
              <Telescope className="h-3.5 w-3.5" /> {t("ace.deepResearchHint")}
            </p>
          )}
          {briefExtras?.(run)}
          {run.elapsedMs != null && (
            <p className="text-[11px] text-muted-foreground">
              {t("ace.elapsed", { s: Math.round(run.elapsedMs / 1000), n: toolCount })}
            </p>
          )}
        </div>
      )}

      {run.proposals.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("ace.actions")}
          </p>
          {run.proposals.map((p) =>
            renderProposal ? (
              <div key={p.id}>{renderProposal(p, run)}</div>
            ) : (
              <div key={p.id} className="rounded-md border border-border p-2 text-xs">
                <Badge variant="secondary" className="mb-1">
                  {t(`ace.action.${p.type}`)}
                </Badge>
                <p className="font-medium">{p.title}</p>
                <p className="text-muted-foreground">{p.details}</p>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function TimelineRow({ item }: { item: TimelineItem }) {
  const { t } = useI18n();
  if (item.kind === "plan") {
    return (
      <li className="text-xs">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <ListChecks className="h-3.5 w-3.5 text-primary" /> {t("ace.plan")}
          <Badge variant="outline" className="h-4 px-1 text-[10px]">
            {t(`ace.route.${item.route}`)}
          </Badge>
        </div>
        <ol className="ml-5 mt-1 list-decimal space-y-0.5 text-muted-foreground">
          {item.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </li>
    );
  }
  const Icon = TOOL_ICONS[item.name] ?? Database;
  return (
    <li className="text-xs">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-1.5">
          <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
          {item.done ? (
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          ) : (
            <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
          )}
          <span className="font-medium text-foreground">{t(`ace.tool.${item.name}`)}</span>
          {item.summary && <span className={cn("text-muted-foreground")}>— {item.summary}</span>}
        </summary>
        <div className="ml-8 mt-1 space-y-1">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
            {t("ace.args")}
          </p>
          <pre className="max-h-32 overflow-auto rounded bg-muted p-1.5 text-[10px] leading-tight">
            {JSON.stringify(item.args, null, 1)}
          </pre>
          {item.data !== undefined && (
            <>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                {t("ace.result")}
              </p>
              <pre className="max-h-48 overflow-auto rounded bg-muted p-1.5 text-[10px] leading-tight">
                {JSON.stringify(item.data, null, 1)}
              </pre>
            </>
          )}
        </div>
      </details>
    </li>
  );
}

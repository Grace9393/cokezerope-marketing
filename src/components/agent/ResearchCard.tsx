import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Telescope, Loader2, X, ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useDemoMask } from "@/lib/demo-mask";
import type { ResearchJob } from "./useResearch";

/** Inline renderer for the report's light Markdown (headings, bullets, bold). */
function ReportText({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-foreground">
      {text.split("\n").map((line, i) => {
        const l = line.trim();
        if (!l) return null;
        const clean = l.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[(\d+)\]\([^)]+\)/g, "[$1]");
        if (/^#{1,4}\s/.test(l))
          return (
            <p key={i} className="pt-2 font-semibold">
              {clean.replace(/^#+\s*/, "")}
            </p>
          );
        if (/^[-*•]\s/.test(l))
          return (
            <p key={i} className="pl-4 -indent-3">
              • {clean.replace(/^[-*•]\s*/, "")}
            </p>
          );
        return <p key={i}>{clean}</p>;
      })}
    </div>
  );
}

export function ResearchCard({
  job,
  onCancel,
  onDismiss,
}: {
  job: ResearchJob;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  const { mask } = useDemoMask();
  const running = job.status === "starting" || job.status === "in_progress";
  const mins = Math.max(0, Math.round((Date.now() - job.startedAt) / 60000));
  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Telescope className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{t("research.button")}</h2>
        <span className="text-xs text-muted-foreground">· {mask(job.topic)}</span>
        <Badge
          variant={
            job.status === "completed"
              ? "secondary"
              : job.status === "in_progress"
                ? "outline"
                : "destructive"
          }
          className="text-[10px]"
        >
          {job.status}
        </Badge>
        <span className="text-[11px] text-muted-foreground">deep-research-preview-04-2026</span>
        <div className="ml-auto flex gap-1">
          {running ? (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>
              <X className="mr-1 h-3 w-3" /> {t("research.cancel")}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={onDismiss}
              aria-label={t("alert.dismiss")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {running && (
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("research.running")}{" "}
            {mins > 0 && `(${mins} min)`}
          </p>
          <ol className="space-y-1 border-l border-border pl-3">
            {job.progress.map((p, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                {mask(p)}
              </li>
            ))}
          </ol>
        </div>
      )}

      {job.error && job.status !== "completed" && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {job.error}
        </p>
      )}

      {job.status === "completed" && job.report && (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> {t("research.done")} ·{" "}
            {t("research.useAsContext")}
          </p>
          <div className="max-h-[420px] overflow-y-auto rounded-md border border-border p-3">
            <ReportText text={mask(job.report)} />
          </div>
          {job.sources.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                {t("research.sources")}
              </p>
              <ol className="list-decimal space-y-0.5 pl-5 text-xs">
                {job.sources.map((s, i) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1 text-primary hover:underline"
                    >
                      <span className="truncate">
                        {s.title ? mask(s.title) : `${t("research.sources")} ${i + 1}`}
                      </span>{" "}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

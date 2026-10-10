import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { ActivityEntry } from "./useApprovals";
import { activityToMarkdown, downloadText } from "./exports";

const TONE: Record<ActivityEntry["decision"], string> = {
  proposed: "text-amber-600",
  approved: "text-emerald-600",
  rejected: "text-destructive",
  edited: "text-primary",
};

export function ActivityLog({ entries }: { entries: ActivityEntry[] }) {
  const { t } = useI18n();
  if (!entries.length)
    return <p className="text-sm text-muted-foreground">{t("ace.activity.empty")}</p>;
  return (
    <div className="space-y-3">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={() =>
          downloadText(
            `ace-activity-${new Date().toISOString().slice(0, 10)}.md`,
            activityToMarkdown(entries),
          )
        }
      >
        <Download className="mr-1 h-3 w-3" /> {t("ace.activity.export")}
      </Button>
      <ol className="space-y-2">
        {[...entries].reverse().map((e, i) => (
          <li key={i} className="rounded-md border border-border p-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="tabular-nums text-muted-foreground">
                {new Date(e.ts).toLocaleTimeString()}
              </span>
              <span className={`font-semibold ${TONE[e.decision]}`}>
                {e.decision === "proposed"
                  ? t("ace.activity.proposed")
                  : t(`ace.status.${e.decision}`)}
              </span>
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {t(`ace.action.${e.type}`)}
              </Badge>
            </div>
            <p className="mt-0.5 font-medium text-foreground">{e.title}</p>
            {e.question && <p className="text-muted-foreground">↳ {e.question}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

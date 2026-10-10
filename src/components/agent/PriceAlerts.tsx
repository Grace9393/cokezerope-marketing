import { AlertTriangle, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { PriceAlert } from "./useApprovals";

/** Approved flag_price_gap proposals, pinned above the KPI row. */
export function PriceAlerts({
  alerts,
  onDismiss,
}: {
  alerts: PriceAlert[];
  onDismiss: (id: string) => void;
}) {
  const { t } = useI18n();
  if (!alerts.length) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              {t("alert.priceGap")}
            </p>
            <p className="text-sm font-medium text-foreground">{a.title}</p>
            <p className="text-xs text-muted-foreground">{a.details}</p>
          </div>
          <button
            onClick={() => onDismiss(a.id)}
            className="rounded p-1 text-muted-foreground hover:bg-amber-500/20"
            aria-label={t("alert.dismiss")}
            title={t("alert.dismiss")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

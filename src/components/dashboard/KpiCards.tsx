import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Metric, formatPct } from "@/lib/dashboard-data";

interface Kpi {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
}

export function KpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {kpis.map((k) => {
        const up = (k.delta ?? 0) >= 0;
        return (
          <Card key={k.label} className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {k.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{k.value}</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              {k.delta !== undefined && k.delta !== null && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-medium",
                    up ? "text-emerald-600" : "text-destructive",
                  )}
                >
                  {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {formatPct(k.delta)}
                </span>
              )}
              {k.sub && <span className="truncate">{k.sub}</span>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export type { Kpi };
export type { Metric };

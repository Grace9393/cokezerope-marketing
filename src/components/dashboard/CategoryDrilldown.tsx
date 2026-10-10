import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { colorAt } from "./colors";
import { useI18n } from "@/lib/i18n";
import {
  type Entry,
  type Metric,
  brandsOf,
  entryTotal,
  formatMetric,
  formatCompact,
  formatPct,
  yoy,
} from "@/lib/dashboard-data";

export function CategoryDrilldown({
  entries,
  category,
  metric,
  year,
  prevYear,
}: {
  entries: Entry[];
  category: string;
  metric: Metric;
  year: number;
  prevYear: number | null;
}) {
  const { t } = useI18n();
  const brands = brandsOf(entries, category)
    .map((e) => ({
      name: e.brand,
      total: entryTotal(e, metric, year),
      prev: prevYear ? entryTotal(e, metric, prevYear) : 0,
    }))
    .filter((b) => b.total > 0)
    .sort((a, b) => b.total - a.total);
  const sum = brands.reduce((s, b) => s + b.total, 0);
  const max = brands[0]?.total ?? 1;

  return (
    <Card className="p-4">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        {t("drilldown.breakdown", { cat: category })}{" "}
        <span className="text-muted-foreground">({year})</span>
      </h3>
      {brands.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("drilldown.nodata")}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
          <div className="space-y-2.5">
            {brands.map((b, i) => {
              const g = prevYear ? yoy(b.total, b.prev) : null;
              const up = (g ?? 0) >= 0;
              return (
                <div
                  key={b.name}
                  className="grid grid-cols-[140px_1fr_auto] items-center gap-3 text-sm"
                >
                  <span className="truncate text-foreground" title={b.name}>
                    {b.name}
                  </span>
                  <div className="h-6 rounded bg-muted">
                    <div
                      className="flex h-6 items-center rounded px-2 text-[11px] font-medium text-primary-foreground"
                      style={{
                        width: `${Math.max((b.total / max) * 100, 6)}%`,
                        background: colorAt(i),
                      }}
                    >
                      {formatCompact(b.total, metric)}
                    </div>
                  </div>
                  <span className="w-20 text-right">
                    {metric === "factor" || g === null ? (
                      <span className="text-xs text-muted-foreground">
                        {((b.total / sum) * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "text-xs font-medium",
                          up ? "text-emerald-600" : "text-destructive",
                        )}
                      >
                        {formatPct(g)}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          {metric !== "factor" && (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={brands}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {brands.map((b, i) => (
                      <Cell key={b.name} fill={colorAt(i)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--popover-foreground)",
                    }}
                    formatter={(v: number, n: string) => [formatMetric(v, metric), n]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("drilldown.shareOf", { cat: category })}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

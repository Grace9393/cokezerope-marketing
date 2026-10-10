import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
  LabelList,
} from "recharts";
import { Card } from "@/components/ui/card";
import { colorAt } from "./colors";
import { useI18n } from "@/lib/i18n";
import {
  type Entry,
  type Metric,
  categoryTotals,
  entryTotal,
  formatCompact,
  formatMetric,
} from "@/lib/dashboard-data";

export function CategoryBenchmark({
  entries,
  metric,
  year,
  selected,
  onSelect,
}: {
  entries: Entry[];
  metric: Metric;
  year: number;
  selected: string | null;
  onSelect: (c: string) => void;
}) {
  const { t } = useI18n();
  const cats = categoryTotals(entries)
    .map((e) => ({ name: e.category, total: entryTotal(e, metric, year) }))
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total);
  const grand = cats.reduce((s, c) => s + c.total, 0);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t("benchmark.title", { year })}</h3>
        <span className="text-xs text-muted-foreground">{t("benchmark.hint")}</span>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(220, cats.length * 44)}>
        <BarChart data={cats} layout="vertical" margin={{ left: 8, right: 56 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            formatter={(v: number) => [
              `${formatMetric(v, metric)} · ${((v / grand) * 100).toFixed(1)}%`,
              "",
            ]}
          />
          <Bar
            dataKey="total"
            radius={[0, 6, 6, 0]}
            onClick={(d: { name: string }) => onSelect(d.name)}
            cursor="pointer"
          >
            {cats.map((c, i) => (
              <Cell
                key={c.name}
                fill={colorAt(i)}
                opacity={selected && selected !== c.name ? 0.35 : 1}
              />
            ))}
            <LabelList
              dataKey="total"
              position="right"
              formatter={(v: number) => formatCompact(v, metric)}
              style={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { colorAt } from "./colors";
import { useI18n } from "@/lib/i18n";
import {
  type Entry,
  type Metric,
  MONTHS,
  getYears,
  entryMonths,
  formatMetric,
  formatCompact,
} from "@/lib/dashboard-data";

export function TrendChart({
  entry,
  metric,
  title,
}: {
  entry: Entry | undefined;
  metric: Metric;
  title: string;
}) {
  const { t, monthAt } = useI18n();
  const years = entry ? getYears([entry]) : [];
  const data = MONTHS.map((_, idx) => {
    const row: Record<string, number | string | null> = { month: monthAt(idx) };
    years.forEach((y) => {
      row[String(y)] = entry ? entryMonths(entry, metric, y)[idx] : null;
    });
    return row;
  });

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{t("trend.suffix", { title })}</h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ left: 4, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v: number) => formatCompact(v, metric)}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            formatter={(v: number, name: string) => [formatMetric(v, metric), name]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {years.map((y, i) => (
            <Line
              key={y}
              type="monotone"
              dataKey={String(y)}
              stroke={colorAt(i)}
              strokeWidth={y === years[years.length - 1] ? 2.5 : 1.5}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

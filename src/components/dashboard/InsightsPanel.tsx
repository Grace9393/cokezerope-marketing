import { Card } from "@/components/ui/card";
import { Lightbulb, TrendingUp, TrendingDown, Crown, Calendar, DollarSign } from "lucide-react";
import {
  type Entry,
  type Metric,
  categoryTotals,
  brandsOf,
  entryTotal,
  entryMonths,
  grandTotal,
  formatMetric,
  formatPct,
  yoy,
} from "@/lib/dashboard-data";
import { useI18n } from "@/lib/i18n";

interface Insight {
  icon: React.ReactNode;
  text: React.ReactNode;
}

export function InsightsPanel({
  entries,
  metric,
  year,
  prevYear,
}: {
  entries: Entry[];
  metric: Metric;
  year: number;
  prevYear: number | null;
}) {
  const { t, monthAt, metricLabel } = useI18n();
  const insights: Insight[] = [];
  const cats = categoryTotals(entries).filter((e) => entryTotal(e, metric, year) > 0);
  const grand = grandTotal(entries);

  // top category by share
  const sorted = [...cats].sort(
    (a, b) => entryTotal(b, metric, year) - entryTotal(a, metric, year),
  );
  const grandSum = cats.reduce((s, c) => s + entryTotal(c, metric, year), 0);
  if (sorted[0]) {
    const top = sorted[0];
    insights.push({
      icon: <Crown className="h-4 w-4 text-amber-500" />,
      text: t("insights.leads", {
        cat: top.category,
        value: formatMetric(entryTotal(top, metric, year), metric),
        pct: ((entryTotal(top, metric, year) / grandSum) * 100).toFixed(0),
        metric: metricLabel(metric),
      }),
    });
  }

  // brand-level movers (use all brand entries)
  if (prevYear && metric !== "factor") {
    const allBrands = cats.flatMap((c) => brandsOf(entries, c.category));
    const moves = allBrands
      .map((b) => ({
        b,
        g: yoy(entryTotal(b, metric, year), entryTotal(b, metric, prevYear)),
        cur: entryTotal(b, metric, year),
      }))
      .filter((m) => m.g !== null && m.cur > 0 && entryTotal(m.b, metric, prevYear) > 0);
    const grower = [...moves].sort((a, b) => (b.g ?? 0) - (a.g ?? 0))[0];
    const decliner = [...moves].sort((a, b) => (a.g ?? 0) - (b.g ?? 0))[0];
    if (grower)
      insights.push({
        icon: <TrendingUp className="h-4 w-4 text-emerald-600" />,
        text: (
          <>
            {t("insights.growerLabel")}
            {t("insights.growerText", {
              brand: grower.b.brand,
              cat: grower.b.category,
              pct: formatPct(grower.g),
              year: prevYear,
            })}
          </>
        ),
      });
    if (decliner)
      insights.push({
        icon: <TrendingDown className="h-4 w-4 text-destructive" />,
        text: (
          <>
            {t("insights.declinerLabel")}
            {t("insights.declinerText", {
              brand: decliner.b.brand,
              cat: decliner.b.category,
              pct: formatPct(decliner.g),
              year: prevYear,
            })}
          </>
        ),
      });
  }

  // price premium (highest factor brand)
  const factorBrands = cats
    .flatMap((c) => brandsOf(entries, c.category))
    .map((b) => ({ b, f: entryTotal(b, "factor", year) }))
    .filter((x) => x.f > 0)
    .sort((a, b) => b.f - a.f);
  if (factorBrands[0])
    insights.push({
      icon: <DollarSign className="h-4 w-4 text-primary" />,
      text: (
        <>
          {t("insights.priceLabel")}
          {t("insights.priceText", {
            brand: factorBrands[0].b.brand,
            value: formatMetric(factorBrands[0].f, "factor"),
          })}
        </>
      ),
    });

  // seasonality peak month (grand total)
  if (grand) {
    const months = entryMonths(grand, metric, year);
    let peak = 0;
    months.forEach((v, i) => {
      if ((v ?? 0) > (months[peak] ?? 0)) peak = i;
    });
    if (months[peak])
      insights.push({
        icon: <Calendar className="h-4 w-4 text-sky-500" />,
        text: (
          <>
            {t("insights.peakLabel")}
            {t("insights.peakText", {
              month: monthAt(peak),
              value: formatMetric(months[peak], metric),
            })}
          </>
        ),
      });
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">{t("insights.title", { year })}</h3>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {insights.map((ins, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-foreground"
          >
            <span className="mt-0.5 shrink-0">{ins.icon}</span>
            <span className="leading-snug">{ins.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

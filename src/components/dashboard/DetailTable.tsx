import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  type Entry,
  type Metric,
  MONTHS,
  entryTotal,
  entryMonths,
  formatCompact,
  formatPct,
  yoy,
} from "@/lib/dashboard-data";

export function DetailTable({
  entries,
  metric,
  year,
  prevYear,
  category,
  highlightId,
}: {
  entries: Entry[];
  metric: Metric;
  year: number;
  prevYear: number | null;
  category: string | null;
  /** Evidence id "CATEGORY › Product › metric › year" cited by Ace. */
  highlightId?: string | null;
}) {
  const { t, monthAt } = useI18n();
  const [sortKey, setSortKey] = useState<"total" | "yoy">("total");
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    const base = entries
      .filter((e) => !e.isCategoryTotal && e.category !== "All")
      .filter((e) => (category ? e.category === category : true))
      .map((e) => {
        const total = entryTotal(e, metric, year);
        const prev = prevYear ? entryTotal(e, metric, prevYear) : 0;
        return {
          e,
          total,
          months: entryMonths(e, metric, year),
          g: prevYear && metric !== "factor" ? yoy(total, prev) : null,
        };
      })
      .filter((r) => r.total > 0);
    base.sort((a, b) => {
      const av = sortKey === "total" ? a.total : (a.g ?? -Infinity);
      const bv = sortKey === "total" ? b.total : (b.g ?? -Infinity);
      return asc ? av - bv : bv - av;
    });
    return base;
  }, [entries, metric, year, prevYear, category, sortKey, asc]);

  const toggle = (key: "total" | "yoy") => {
    if (sortKey === key) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  return (
    <Card id="detail-table" className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("detail.title", { cat: category ?? t("detail.allCategories"), year })}
        </h3>
        <span className="text-xs text-muted-foreground">
          {t("detail.brands", { n: rows.length })}
        </span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card">{t("detail.category")}</TableHead>
              <TableHead>{t("detail.brand")}</TableHead>
              {MONTHS.map((m, i) => (
                <TableHead key={m} className="text-right tabular-nums">
                  {monthAt(i)}
                </TableHead>
              ))}
              <TableHead className="cursor-pointer text-right" onClick={() => toggle("total")}>
                <span className="inline-flex items-center gap-1">
                  {t("detail.total")} <ArrowUpDown className="h-3 w-3" />
                </span>
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => toggle("yoy")}>
                <span className="inline-flex items-center gap-1">
                  {t("detail.yoy")} <ArrowUpDown className="h-3 w-3" />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const up = (r.g ?? 0) >= 0;
              const rowKey = `${r.e.category} › ${r.e.brand}`;
              const hit = !!highlightId && highlightId.startsWith(rowKey + " › ");
              return (
                <TableRow
                  key={r.e.category + r.e.brand}
                  data-row-key={rowKey}
                  className={cn(hit && "bg-primary/10 ring-2 ring-inset ring-primary")}
                >
                  <TableCell className="sticky left-0 bg-card text-xs text-muted-foreground">
                    {r.e.category}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">{r.e.brand}</TableCell>
                  {r.months.map((v, i) => (
                    <TableCell
                      key={i}
                      className="text-right text-xs tabular-nums text-muted-foreground"
                    >
                      {formatCompact(v, metric)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCompact(r.total, metric)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {r.g === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span
                        className={cn("font-medium", up ? "text-emerald-600" : "text-destructive")}
                      >
                        {formatPct(r.g)}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

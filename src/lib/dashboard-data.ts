import * as XLSX from "xlsx";
import snapshot from "@/data/snapshot.json";

export type Metric = "value" | "qty" | "factor";

export interface YearData {
  months: (number | null)[];
  total: number | null;
}

export interface Entry {
  category: string;
  brand: string;
  isCategoryTotal: boolean;
  metrics: Partial<Record<Metric, Record<number, YearData>>>;
}

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const METRIC_LABELS: Record<Metric, string> = {
  value: "Value (Sales)",
  qty: "Quantity (Units)",
  factor: "Factor (Unit Price)",
};

export const snapshotEntries = snapshot as Entry[];

const num = (v: unknown): number | null => (typeof v === "number" && !Number.isNaN(v) ? v : null);

/** Parse a workbook ArrayBuffer in the same layout as the MONTHLY sheet. */
export function parseWorkbook(buf: ArrayBuffer): Entry[] {
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames.find((n) => n.toUpperCase() === "MONTHLY") ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error("No 'MONTHLY' sheet found");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    blankrows: true,
    defval: null,
  });

  const entries: Entry[] = [];
  let curCat = "Total";
  const metricMap: Record<string, Metric> = {
    "Q'ty": "qty",
    Value: "value",
    Factor: "factor",
  };
  const yearRe = /^(20\d\d) (Q'ty|Value|Factor)$/;

  let i = 0;
  while (i < rows.length) {
    const row = rows[i] ?? [];
    const b = row[1];
    if (typeof b === "string" && b.trim().startsWith("◆")) {
      curCat = b.replace("◆", "").trim();
      if (curCat === "OTHER (cont.)") curCat = "OTHER";
      i++;
      continue;
    }
    if (row[3] === "Jan" && typeof b === "string") {
      const name = b.trim();
      let isCatTotal = name.includes("— TTL") || name.includes("TTL MU");
      let cat = curCat;
      let brand = name;
      if (name === "TTL MU (all make-up)") {
        cat = "All";
        brand = "All Make-up";
        isCatTotal = true;
      } else if (isCatTotal) {
        brand = name.replace("— TTL", "").trim();
      }
      const metrics: Entry["metrics"] = {};
      let j = i + 1;
      while (j < rows.length) {
        const r = rows[j] ?? [];
        const label = r[1];
        if (typeof label === "string" && yearRe.test(label.trim())) {
          const m = label.trim().match(yearRe)!;
          const year = Number(m[1]);
          const key = metricMap[m[2]];
          const months = Array.from({ length: 12 }, (_, k) => num(r[3 + k]));
          const total = num(r[15]);
          (metrics[key] ??= {})[year] = { months, total };
          j++;
        } else if (r[3] === "Jan" && typeof r[1] === "string") {
          break;
        } else if (typeof label === "string" && label.trim().startsWith("◆")) {
          break;
        } else {
          j++;
        }
      }
      entries.push({ category: cat, brand, isCategoryTotal: isCatTotal, metrics });
      i = j;
      continue;
    }
    i++;
  }
  if (!entries.length) throw new Error("File layout not recognised");
  return entries;
}

/* ---------- selectors ---------- */

export function getYears(entries: Entry[]): number[] {
  const set = new Set<number>();
  entries.forEach((e) =>
    Object.values(e.metrics).forEach((m) => Object.keys(m).forEach((y) => set.add(Number(y)))),
  );
  return [...set].sort((a, b) => a - b);
}

export function getCategories(entries: Entry[]): string[] {
  return [...new Set(entries.filter((e) => e.category !== "All").map((e) => e.category))];
}

export function entryTotal(e: Entry, metric: Metric, year: number): number {
  return e.metrics[metric]?.[year]?.total ?? 0;
}

export function entryMonths(e: Entry, metric: Metric, year: number): (number | null)[] {
  return e.metrics[metric]?.[year]?.months ?? Array(12).fill(null);
}

/** Category aggregate entries (one per category). */
export function categoryTotals(entries: Entry[]) {
  return entries.filter((e) => e.isCategoryTotal && e.category !== "All");
}

/** Brand-level entries for a category (exclude the category total row). */
export function brandsOf(entries: Entry[], category: string) {
  return entries.filter((e) => e.category === category && !e.isCategoryTotal);
}

export function grandTotal(entries: Entry[]) {
  return entries.find((e) => e.category === "All");
}

export function yoy(curr: number, prev: number): number | null {
  if (!prev) return null;
  return (curr - prev) / prev;
}

/* ---------- formatting ---------- */

export function formatMetric(value: number | null, metric: Metric): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (metric === "value") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "TWD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (metric === "factor") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "TWD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatCompact(value: number | null, metric: Metric): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const prefix = metric === "qty" ? "" : "NT$";
  return (
    prefix +
    new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)
  );
}

export function formatPct(v: number | null): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return (v >= 0 ? "+" : "") + (v * 100).toFixed(1) + "%";
}

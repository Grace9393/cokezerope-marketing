import type { Entry, Metric } from "@/lib/dashboard-data";
import type { EvidenceRow } from "./types";

// Deterministic data tools Ace calls over the dashboard entries the client
// posted. No I/O, no writes — every number the agent quotes comes from here.

export const rowId = (category: string, product: string, metric: Metric, year: number) =>
  `${category} › ${product} › ${metric} › ${year}`;

type YearData = { months: (number | null)[]; total: number | null };

function yearData(e: Entry, metric: Metric, year: number): YearData | undefined {
  return e.metrics[metric]?.[year];
}

/** Months (0-based count) that have data in `year` — i.e. YTD coverage. */
function coveredMonths(e: Entry, metric: Metric, year: number): number {
  const m = yearData(e, metric, year)?.months ?? [];
  let last = -1;
  m.forEach((v, i) => {
    if (typeof v === "number" && v !== 0) last = i;
  });
  return last + 1;
}

function sumMonths(months: (number | null)[] | undefined, n: number): number | null {
  if (!months) return null;
  let s = 0;
  let any = false;
  for (let i = 0; i < n; i++) {
    const v = months[i];
    if (typeof v === "number") {
      s += v;
      any = true;
    }
  }
  return any ? s : null;
}

const pct = (a: number | null, b: number | null) =>
  a == null || b == null || b === 0 ? null : Math.round(((a - b) / b) * 1000) / 10;

/** Months covered by an entry: value and units must both be present (like-for-like). */
function entryCoverage(
  e: Entry,
  year: number,
): { n: number; valueMonths: number; qtyMonths: number } {
  const valueMonths = coveredMonths(e, "value", year);
  const qtyMonths = coveredMonths(e, "qty", year);
  const n =
    valueMonths && qtyMonths ? Math.min(valueMonths, qtyMonths) : Math.max(valueMonths, qtyMonths);
  return { n: n || 12, valueMonths, qtyMonths };
}

/** Typical coverage of a year across category totals (e.g. 2026 sales run to Jun). */
export function yearCoverage(entries: Entry[], _metric: Metric, year: number): number {
  const counts = new Map<number, number>();
  entries
    .filter((e) => e.isCategoryTotal && e.category !== "All" && e.metrics.value?.[year])
    .forEach((e) => {
      const n = entryCoverage(e, year).n;
      counts.set(n, (counts.get(n) ?? 0) + 1);
    });
  let best = 12;
  let bestCount = 0;
  counts.forEach((c, n) => {
    if (c > bestCount) {
      best = n;
      bestCount = c;
    }
  });
  return best;
}

export interface DashboardRow {
  id: string;
  category: string;
  product: string;
  isCategoryTotal: boolean;
  metric: Metric;
  year: number;
  total: number | null;
  months: (number | null)[];
  compareYear: number | null;
  compareTotal: number | null;
  yoyPct: number | null;
  /** Like-for-like: same months covered in both years. */
  ytd: { months: number; total: number | null; compareTotal: number | null; yoyPct: number | null };
  lastMonthLooksPartial: boolean;
  dataQuality?: string;
}

function buildRow(
  e: Entry,
  metric: Metric,
  year: number,
  compareYear: number | null,
): DashboardRow {
  const cov = entryCoverage(e, year);
  const coverage = cov.n;
  const cur = yearData(e, metric, year);
  const prev = compareYear ? yearData(e, metric, compareYear) : undefined;
  const n = Math.max(1, Math.min(12, coverage));
  const isAvg = metric === "factor";
  let ytdTotal = sumMonths(cur?.months, n);
  let ytdPrev = sumMonths(prev?.months, n);
  if (isAvg) {
    // unit price is an average — compare monthly means, not sums
    ytdTotal = ytdTotal == null ? null : Math.round(ytdTotal / n);
    ytdPrev = ytdPrev == null ? null : Math.round(ytdPrev / n);
  }
  let partial = false;
  if (n >= 1 && cur?.months && prev?.months) {
    const last = cur.months[n - 1];
    const prevSame = prev.months[n - 1];
    if (
      typeof last === "number" &&
      typeof prevSame === "number" &&
      prevSame > 0 &&
      last < prevSame * 0.3
    )
      partial = true;
  }
  return {
    id: rowId(e.category, e.brand, metric, year),
    category: e.category,
    product: e.brand,
    isCategoryTotal: e.isCategoryTotal,
    metric,
    year,
    total: cur?.total ?? null,
    months: (cur?.months ?? []).slice(0, n),
    compareYear,
    compareTotal: prev?.total ?? null,
    yoyPct: isAvg ? null : pct(cur?.total ?? null, prev?.total ?? null),
    ytd: { months: n, total: ytdTotal, compareTotal: ytdPrev, yoyPct: pct(ytdTotal, ytdPrev) },
    lastMonthLooksPartial: partial,
    dataQuality:
      cov.valueMonths && cov.qtyMonths && cov.valueMonths !== cov.qtyMonths
        ? `Sales value is recorded for ${cov.valueMonths} months but units for ${cov.qtyMonths} months in ${year} — later months may be missing or a forecast; compare like-for-like (ytd).`
        : undefined,
  };
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, " ")
    .trim();

function matches(hay: string, needle: string) {
  const h = norm(hay);
  const n = norm(needle);
  return h === n || h.includes(n) || n.includes(h);
}

export function queryDashboard(
  entries: Entry[],
  args: {
    category?: string;
    product?: string;
    metric?: Metric;
    year?: number;
    compareYear?: number;
  },
  defaults: { metric: Metric; year: number },
) {
  const metric = args.metric ?? defaults.metric;
  const year = Number(args.year ?? defaults.year);
  const compareYear = args.compareYear != null ? Number(args.compareYear) : year - 1;
  let pool = entries;
  if (args.category)
    pool = pool.filter(
      (e) =>
        matches(e.category, args.category!) ||
        (e.category === "All" && matches("all make-up", args.category!)),
    );
  if (args.product) pool = pool.filter((e) => matches(e.brand, args.product!));
  if (!args.category && !args.product) pool = entries.filter((e) => e.isCategoryTotal);
  const rows = pool
    .filter((e) => yearData(e, metric, year))
    .sort((a, b) => Number(b.isCategoryTotal) - Number(a.isCategoryTotal))
    .slice(0, 15)
    .map((e) => buildRow(e, metric, year, compareYear));
  const coverage = rows[0]?.ytd.months ?? 12;
  return {
    metric,
    year,
    compareYear,
    dataCoverage: `${rows[0]?.product ?? year}: ${year} has comparable data for ${coverage} of 12 months; ytd fields compare the same ${coverage} months of ${compareYear}.`,
    rows,
    note: rows.length
      ? undefined
      : "No matching rows — data missing for that category/product/year.",
  };
}

export function topMovers(
  entries: Entry[],
  args: { metric?: Metric; year?: number; n?: number },
  defaults: { metric: Metric; year: number },
) {
  const metric = args.metric ?? defaults.metric;
  const year = Number(args.year ?? defaults.year);
  const n = Math.min(Math.max(Number(args.n ?? 3), 1), 8);
  const rows = entries
    .filter((e) => e.category !== "All")
    .map((e) => buildRow(e, metric, year, year - 1))
    .filter((r) => r.ytd.yoyPct != null && (r.ytd.compareTotal ?? 0) > 0);
  const slim = (r: DashboardRow) => ({
    id: r.id,
    category: r.category,
    product: r.product,
    ytdTotal: r.ytd.total,
    ytdCompareTotal: r.ytd.compareTotal,
    ytdYoyPct: r.ytd.yoyPct,
  });
  const products = rows
    .filter((r) => !r.isCategoryTotal)
    .sort((a, b) => (b.ytd.yoyPct ?? 0) - (a.ytd.yoyPct ?? 0));
  const cats = rows
    .filter((r) => r.isCategoryTotal)
    .sort((a, b) => (b.ytd.yoyPct ?? 0) - (a.ytd.yoyPct ?? 0));
  return {
    metric,
    year,
    basis: `Like-for-like YTD: each row compares the months with data in ${year} against the same months of ${year - 1}.`,
    productGainers: products.slice(0, n).map(slim),
    productDecliners: products.slice(-n).reverse().map(slim),
    categoryGainers: cats.slice(0, n).map(slim),
    categoryDecliners: cats.slice(-n).reverse().map(slim),
  };
}

export function comparePrices(
  entries: Entry[],
  args: {
    category?: string;
    competitorProducts?: { name: string; brand?: string; price?: number | null }[];
  },
  defaults: { year: number },
) {
  const year = defaults.year;
  const cat = args.category ?? "";
  const catEntries = entries.filter((e) => matches(e.category, cat));
  if (!catEntries.length) return { error: `Category "${cat}" not found in the dashboard.` };
  const pickYear = (e: Entry) => {
    for (const y of [year, year - 1]) if (e.metrics.factor?.[y]?.total) return y;
    return null;
  };
  const ours = catEntries
    .map((e) => {
      const y = pickYear(e);
      return y
        ? {
            id: rowId(e.category, e.brand, "factor", y),
            product: e.brand,
            isTotal: e.isCategoryTotal,
            avgUnitPrice: e.metrics.factor![y]!.total!,
          }
        : null;
    })
    .filter(Boolean) as { id: string; product: string; isTotal: boolean; avgUnitPrice: number }[];
  const catAvg = ours.find((o) => o.isTotal) ?? ours[0];
  const items = (args.competitorProducts ?? [])
    .filter((p) => p && p.name && typeof p.price === "number" && p.price > 0)
    .slice(0, 20)
    .map((p) => {
      const words = norm(p.name)
        .split(" ")
        .filter((w) => w.length > 2);
      const best = ours
        .filter((o) => !o.isTotal)
        .map((o) => ({ o, score: words.filter((w) => norm(o.product).includes(w)).length }))
        .sort((a, b) => b.score - a.score)[0];
      const matched = best && best.score > 0 ? best.o : null;
      return {
        competitorProduct: p.name,
        competitorBrand: p.brand ?? null,
        competitorPrice: p.price!,
        gapVsCategoryAvgPct: catAvg ? pct(p.price!, catAvg.avgUnitPrice) : null,
        matchedOurProduct: matched?.product ?? null,
        matchedOurPrice: matched?.avgUnitPrice ?? null,
        gapVsMatchedPct: matched ? pct(p.price!, matched.avgUnitPrice) : null,
        evidenceId: matched?.id ?? catAvg?.id ?? null,
      };
    });
  return {
    category: catEntries[0].category,
    ourCategoryAvgUnitPrice: catAvg
      ? { id: catAvg.id, value: Math.round(catAvg.avgUnitPrice) }
      : null,
    note: "Our price is the average realised unit price (factor = value / qty, TWD). Gap % = competitor vs ours; negative means competitor is cheaper.",
    items,
  };
}

/** Collect evidence rows from any tool result so the brief can only cite real ids. */
export function collectEvidence(result: unknown, into: Map<string, EvidenceRow>) {
  const visit = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach(visit);
    const o = v as Record<string, unknown>;
    if (typeof o.id === "string" && o.id.includes(" › ")) {
      const parts = o.id.split(" › ");
      const social = parts[0] === "SOCIAL";
      // Sales rows: CATEGORY › Product › metric › year; social: SOCIAL › platform › brand › mentionId
      const [category, product, metric, year] = social
        ? ["SOCIAL", String(o.brand ?? parts[2]), "value", ""]
        : parts;
      if (!into.has(o.id)) {
        into.set(o.id, {
          id: o.id,
          category: social ? `SOCIAL (${parts[1]})` : category,
          product,
          metric: metric as Metric,
          year: Number(year) || 0,
          total:
            typeof o.total === "number"
              ? o.total
              : typeof o.ytdTotal === "number"
                ? o.ytdTotal
                : typeof o.value === "number"
                  ? o.value
                  : null,
        });
      }
    }
    Object.values(o).forEach(visit);
  };
  visit(result);
}

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { scrapeCompetitor, type CompetitorResult } from "@/lib/competitor.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Globe,
  Link2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Bookmark,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useDemoMask } from "@/lib/demo-mask";

function checkUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function CompetitorResource({
  watchlist = [],
  onRemoveWatch,
  headerExtras,
}: {
  /** URLs saved via an approved add_to_watchlist proposal. */
  watchlist?: string[];
  onRemoveWatch?: (url: string) => void;
  headerExtras?: ReactNode;
} = {}) {
  const { t } = useI18n();
  const { mask, maskBrand } = useDemoMask();
  const scrape = useServerFn(scrapeCompetitor);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompetitorResult | null>(null);

  const normalized = checkUrl(url);
  const urlValid = url.trim() === "" || !!normalized;

  const run = async (override?: string) => {
    const target = override ? checkUrl(override) : normalized;
    if (!target) {
      toast.error(t("competitor.enterValid"));
      return;
    }
    if (override) setUrl(override);
    setLoading(true);
    setResult(null);
    try {
      const res = await scrape({ data: { url: target } });
      setResult(res);
      if (res.ok) {
        toast.success(
          t("competitor.scraped", { n: res.products.length, src: res.sourceName ?? "page" }),
        );
      } else {
        toast.error(res.error ?? t("competitor.couldNot"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("competitor.failedToast"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{t("competitor.title")}</h2>
        <span className="text-xs text-muted-foreground">{t("competitor.subtitle")}</span>
        {headerExtras && <div className="ml-auto">{headerExtras}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Link2 className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) run();
            }}
            placeholder={t("competitor.placeholder")}
            className={
              "pl-8 " + (urlValid ? "" : "border-destructive focus-visible:ring-destructive")
            }
            aria-invalid={!urlValid}
          />
        </div>
        {url.trim() !== "" &&
          (urlValid ? (
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-500" /> {t("competitor.valid")}
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="h-3 w-3" /> {t("competitor.invalid")}
            </Badge>
          ))}
        <Button onClick={() => run()} disabled={loading || !normalized} size="sm">
          {loading ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> {t("competitor.checking")}
            </>
          ) : (
            t("competitor.check")
          )}
        </Button>
      </div>

      {watchlist.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Bookmark className="h-3 w-3" /> {t("watchlist.title")}
          </p>
          {watchlist.map((w) => (
            <div
              key={w}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs"
            >
              <span className="min-w-0 flex-1 truncate text-foreground" title={w}>
                {w}
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="h-6 px-2 text-xs"
                disabled={loading}
                onClick={() => run(w)}
              >
                {t("watchlist.scrape")}
              </Button>
              {onRemoveWatch && (
                <button
                  onClick={() => onRemoveWatch(w)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                  aria-label={t("watchlist.remove")}
                  title={t("watchlist.remove")}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={result.ok ? "secondary" : "destructive"}>
              {result.ok
                ? t("competitor.ok", { code: result.statusCode ?? 200 })
                : t("competitor.failed")}
            </Badge>
            {result.sourceName && (
              <span className="text-muted-foreground">
                {t("competitor.source")}: {result.sourceName}
              </span>
            )}
            <span className="text-muted-foreground">
              {t("competitor.fetched", { time: new Date(result.scrapedAt).toLocaleString() })}
            </span>
            {result.finalUrl && (
              <a
                href={result.finalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {t("competitor.open")} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {result.error && <p className="text-xs text-muted-foreground">{result.error}</p>}
          {result.method === "google_search" && (
            <p className="text-xs text-muted-foreground">{t("competitor.viaSearch")}</p>
          )}
          {result.sources && result.sources.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              {result.sources.map((src) => (
                <a
                  key={src}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="max-w-[260px] truncate text-primary hover:underline"
                >
                  {src}
                </a>
              ))}
            </div>
          )}

          {result.products.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("competitor.product")}</TableHead>
                    <TableHead>{t("competitor.brand")}</TableHead>
                    <TableHead>{t("competitor.category")}</TableHead>
                    <TableHead className="text-right">{t("competitor.price")}</TableHead>
                    <TableHead className="text-right">{t("competitor.rating")}</TableHead>
                    <TableHead className="text-right">{t("competitor.reviews")}</TableHead>
                    <TableHead>{t("competitor.promo")}</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {result.products.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{mask(p.name)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.brand ? maskBrand(p.brand) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.category ? mask(p.category) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.price != null
                          ? `${p.currency ? p.currency + " " : ""}${p.price.toLocaleString()}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.rating != null ? p.rating.toFixed(1) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.reviews != null ? p.reviews.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.promo ? mask(p.promo) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

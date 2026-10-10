import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { rateLimited } from "./ai/guard.server";
import { normalizeUrl, isAllowedRetailer, scrapeCompetitorUrl } from "./competitor.server";

export type { CompetitorProduct, CompetitorResult } from "./competitor.server";

export const scrapeCompetitor = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => {
    const url = normalizeUrl(data?.url ?? "");
    if (!url) throw new Error("Please enter a valid URL (e.g. https://www.momoshop.com.tw/...)");
    if (!isAllowedRetailer(url)) {
      throw new Error(
        "Only Taiwan retailer or beauty-brand pages can be scraped (e.g. momo, Sephora, Watsons).",
      );
    }
    return { url };
  })
  .handler(async ({ data }) => {
    if (rateLimited(getRequest(), "scrape", 12)) {
      return {
        ok: false,
        url: data.url,
        scrapedAt: new Date().toISOString(),
        products: [],
        error: "Too many scrapes — try again in a few minutes.",
      };
    }
    return scrapeCompetitorUrl(data.url);
  });

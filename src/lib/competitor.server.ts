import { getGemini, aiErrorMessage } from "@/lib/ai/gemini.server";
import {
  getOpenAI,
  getProvider,
  openAIErrorMessage,
  parseOpenAIJson,
} from "@/lib/ai/openai.server";
import { MODELS, OPENAI_MODELS } from "@/lib/ai/models";
import { isAllowedRetailer } from "@/lib/retailers";

export { isAllowedRetailer };

// Shared competitor scraper used by the CompetitorResource UI and the Ace agent.
// Provider follows AI_PROVIDER. Gemini can read page content directly; OpenAI
// uses web search to find the requested listing. Never invents products.

export type CompetitorProduct = {
  name: string;
  brand?: string | null;
  category?: string | null;
  price?: number | null;
  currency?: string | null;
  rating?: number | null;
  reviews?: number | null;
  promo?: string | null;
};

export type CompetitorResult = {
  ok: boolean;
  url: string;
  finalUrl?: string;
  statusCode?: number;
  title?: string;
  sourceName?: string;
  scrapedAt: string;
  products: CompetitorProduct[];
  sources?: string[];
  method?: "url_context" | "google_search" | "web_search";
  error?: string;
};

export function normalizeUrl(raw: string): string | null {
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

const PRODUCT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Page title or retailer section name" },
    pageReadable: { type: "boolean", description: "true if the URL content itself was readable" },
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          brand: { type: "string" },
          category: {
            type: "string",
            description: "lipstick, foundation, cushion, mascara, powder, primer...",
          },
          price: { type: "number", description: "Current selling price as a number" },
          currency: { type: "string", description: "ISO code, e.g. TWD" },
          rating: { type: "number" },
          reviews: { type: "number" },
          promo: { type: "string", description: "Active promotion text, if any" },
        },
        required: ["name"],
      },
    },
  },
  required: ["products", "pageReadable"],
};

type Step = {
  type: string;
  content?: { type: string; text?: string; annotations?: { type: string; url?: string }[] }[];
};

type OpenAIResponse = {
  output_text?: string;
  output?: {
    type?: string;
    content?: { type?: string; annotations?: { type?: string; url?: string }[] }[];
  }[];
};

function collectOpenAISources(response: OpenAIResponse): string[] {
  const urls = new Set<string>();
  for (const item of response.output ?? [])
    for (const content of item.content ?? [])
      for (const annotation of content.annotations ?? [])
        if (annotation.type === "url_citation" && annotation.url) urls.add(annotation.url);
  return [...urls].slice(0, 8);
}

function collectSources(steps: Step[] | undefined): string[] {
  const urls = new Set<string>();
  for (const s of steps ?? []) {
    for (const c of s.content ?? []) {
      for (const a of c.annotations ?? []) if (a.url) urls.add(a.url);
    }
  }
  return [...urls].slice(0, 8);
}

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export async function scrapeCompetitorUrl(rawUrl: string): Promise<CompetitorResult> {
  const scrapedAt = new Date().toISOString();
  const url = normalizeUrl(rawUrl);
  if (!url) {
    return { ok: false, url: rawUrl, scrapedAt, products: [], error: "Please enter a valid URL." };
  }
  const sourceName = hostOf(url);
  if (!isAllowedRetailer(url)) {
    return {
      ok: false,
      url,
      sourceName,
      scrapedAt,
      products: [],
      error: "This site is not on the retailer allowlist.",
    };
  }

  try {
    const provider = getProvider();
    if (provider === "openai") {
      const extract = async (searchPrompt: string) => {
        const response = await getOpenAI().responses.create({
          model: OPENAI_MODELS.agent,
          input:
            `${searchPrompt}\nReturn only JSON matching {"title":string,"pageReadable":boolean,"products":[{"name":string,"brand":string,"category":string,"price":number,"currency":string,"rating":number,"reviews":number,"promo":string}]}. ` +
            `Include only products and current prices supported by sources; never invent prices. Set pageReadable=false because this provider is using web search rather than direct page access.`,
          tools: [{ type: "web_search" }],
        });
        const result = response as OpenAIResponse;
        const parsed =
          parseOpenAIJson<{
            title?: string;
            pageReadable?: boolean;
            products?: Partial<CompetitorProduct>[];
          }>(result.output_text) ?? {};
        return { parsed, sources: collectOpenAISources(result) };
      };
      let { parsed, sources } = await extract(
        `Use web search to find the products and current prices listed on this retailer page: ${url}. Search within ${sourceName ?? "the retailer"}.`,
      );
      if (!parsed.products?.length)
        ({ parsed, sources } = await extract(
          `The listing at ${url} was not found directly. Search site:${sourceName} for products this page lists (decode any search keyword in the URL). Return current prices and promotions.`,
        ));
      const products: CompetitorProduct[] = (parsed.products ?? [])
        .filter((p) => p && typeof p.name === "string" && p.name.trim())
        .map((p) => ({
          name: String(p.name).trim(),
          brand: p.brand ?? null,
          category: p.category ?? null,
          price: typeof p.price === "number" ? p.price : null,
          currency: p.currency ?? null,
          rating: typeof p.rating === "number" ? p.rating : null,
          reviews: typeof p.reviews === "number" ? p.reviews : null,
          promo: p.promo ?? null,
        }));
      return {
        ok: true,
        url,
        finalUrl: url,
        title: parsed.title,
        sourceName,
        scrapedAt,
        products,
        sources,
        method: "web_search",
        error: products.length === 0 ? "No products detected on this page." : undefined,
      };
    }
    const client = getGemini();
    const extract = async (mode: "page" | "search") => {
      const instructions =
        mode === "page"
          ? `Read this retailer page: ${url}\n` +
            `Extract every distinct make-up product shown with its current price in the page currency (Taiwan pages are TWD), ` +
            `brand, category, rating, review count and any active promotion. ` +
            `If the page itself cannot be read (JS-rendered, blocked, login), use Google Search restricted to ${sourceName ?? "that retailer"} ` +
            `to find the same listing and set pageReadable=false.`
          : `The page ${url} could not be read directly. Use Google Search (site:${sourceName}) to find the products this page lists ` +
            `(decode any search keyword in the URL). Return each product with current TWD price, brand, category and promotion. Set pageReadable=false.`;
      const interaction = await client.interactions.create({
        model: MODELS.agent,
        input: `${instructions} Only return products you actually saw in a source. Never invent prices.`,
        tools:
          mode === "page"
            ? [{ type: "url_context" }, { type: "google_search" }]
            : [{ type: "google_search" }],
        response_format: { type: "text", mime_type: "application/json", schema: PRODUCT_SCHEMA },
      } as never);
      const it = interaction as unknown as { output_text?: string | null; steps?: Step[] };
      let parsed: {
        title?: string;
        pageReadable?: boolean;
        products?: Partial<CompetitorProduct>[];
      } = {};
      try {
        parsed = JSON.parse(it.output_text ?? "{}");
      } catch {
        parsed = {};
      }
      return { parsed, steps: it.steps };
    };

    let { parsed, steps } = await extract("page");
    if (!parsed.products?.length) ({ parsed, steps } = await extract("search"));
    const it = { steps };

    const products: CompetitorProduct[] = (parsed.products ?? [])
      .filter((p) => p && typeof p.name === "string" && p.name.trim())
      .map((p) => ({
        name: String(p.name).trim(),
        brand: p.brand ?? null,
        category: p.category ?? null,
        price: typeof p.price === "number" ? p.price : null,
        currency: p.currency ?? null,
        rating: typeof p.rating === "number" ? p.rating : null,
        reviews: typeof p.reviews === "number" ? p.reviews : null,
        promo: p.promo ?? null,
      }));

    return {
      ok: true,
      url,
      finalUrl: url,
      title: parsed.title,
      sourceName,
      scrapedAt,
      products,
      sources: collectSources(it.steps),
      method: parsed.pageReadable === false ? "google_search" : "url_context",
      error: products.length === 0 ? "No products detected on this page." : undefined,
    };
  } catch (e) {
    const error = (() => {
      try {
        return getProvider() === "openai" ? openAIErrorMessage(e) : aiErrorMessage(e);
      } catch {
        return aiErrorMessage(e);
      }
    })();
    return { ok: false, url, sourceName, scrapedAt, products: [], error };
  }
}

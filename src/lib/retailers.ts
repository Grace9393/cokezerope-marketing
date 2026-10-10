// Shared (client + server) allowlist for competitor pages. The scrape endpoint is
// public and spends Gemini quota, and watchlist URLs end up in prompts, so only
// Taiwan sites and known beauty retailers / brands are accepted.
const ALLOWED_DOMAINS = [
  "sephora.com",
  "sephora.sg",
  "sephora.hk",
  "guerlain.com",
  "dior.com",
  "chanel.com",
  "lancome.com",
  "esteelauder.com",
  "maccosmetics.com",
  "yslbeauty.com",
  "narscosmetics.com",
  "shiseido.com",
  "armanibeauty.com",
  "bobbibrown.com",
  "lauramercier.com",
  "clinique.com",
  "sk-ii.com",
  "shopee.tw",
];

export function isAllowedRetailer(url: string): boolean {
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    host = u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  // Any Taiwan site (momoshop.com.tw, watsons.com.tw, cosmed.com.tw, pchome.com.tw...)
  if (host.endsWith(".tw")) return true;
  return ALLOWED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

import process from "node:process";

// Best-effort per-isolate rate limit for the public AI endpoints, so a demo
// URL can't be used to burn the hackathon Gemini/Gradium quota. Workers
// isolates are short-lived, so this is a speed bump, not a hard quota.
const hits = new Map<string, number[]>();

export function clientKey(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}

export function rateLimited(
  request: Request,
  bucket: string,
  max: number,
  windowMs = 10 * 60_000,
): boolean {
  const key = `${bucket}:${clientKey(request)}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// HMAC-signed handles for background jobs, so only the client that started a
// Deep Research job can poll or cancel it. Key derived from the server secret.
async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.GEMINI_API_KEY ?? "";
  const raw = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`ace-job-handle:${secret}`),
  );
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function signHandle(id: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(id));
  return `${id}.${toHex(sig).slice(0, 32)}`;
}

export async function verifyHandle(handle: string): Promise<string | null> {
  const dot = handle.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = handle.slice(0, dot);
  return (await signHandle(id)) === handle ? id : null;
}

/**
 * Read a request body with a hard size cap: rejects early on Content-Length and
 * stops streaming as soon as the running total passes `max` (a missing or
 * false Content-Length header can't bypass it). Returns null when too large.
 */
export async function readLimited(request: Request, max: number): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get("content-length") ?? "NaN");
  if (Number.isFinite(declared) && declared > max) return null;
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/** JSON body with a size cap; throws on invalid JSON, returns null when too large. */
export async function readJsonLimited(request: Request, max = 64_000): Promise<unknown | null> {
  const bytes = await readLimited(request, max);
  if (!bytes) return null;
  return JSON.parse(new TextDecoder().decode(bytes));
}

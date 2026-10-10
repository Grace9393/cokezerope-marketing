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

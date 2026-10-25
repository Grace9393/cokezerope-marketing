import process from "node:process";
import OpenAI from "openai";

export type AIProvider = "gemini" | "openai";

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured on the server.");
  return new OpenAI({ apiKey });
}

export function hasOpenAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** Resolve the provider for each request because Workers bind env per request. */
export function getProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER;
  if (!provider || provider === "gemini") return "gemini";
  if (provider === "openai") return "openai";
  throw new Error("AI_PROVIDER must be either gemini or openai.");
}

export function openAIErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  return raw.replace(/sk-[A-Za-z0-9_-]{8,}/g, "[redacted]").slice(0, 400);
}

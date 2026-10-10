import process from "node:process";
import { GoogleGenAI } from "@google/genai";

// Server-only Gemini client. Built per request: on Cloudflare Workers env
// binds at request time, so never read GEMINI_API_KEY at module scope.
export function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");
  return new GoogleGenAI({ apiKey });
}

export function hasGemini(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Turn any thrown value into a short, key-free message for the UI. */
export function aiErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  return raw.replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]").slice(0, 400);
}

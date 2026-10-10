import { createFileRoute } from "@tanstack/react-router";
import { aiErrorMessage } from "@/lib/ai/gemini.server";
import { jsonError, rateLimited, readLimited } from "@/lib/ai/guard.server";
import { transcribe } from "@/lib/ai/voice.server";
import type { VoiceLang } from "@/lib/ai/voices";

const LANGS: VoiceLang[] = ["en", "de", "fr", "zh"];
const MAX_WAV = 3_000_000; // ~60 s of 24 kHz mono 16-bit

// POST /api/stt?lang=en|de|fr|zh&vocab=a,b,c with a WAV body → { text }.
export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (rateLimited(request, "stt", 30))
          return jsonError("Too many voice requests — try again later.", 429);
        const url = new URL(request.url);
        const lang = url.searchParams.get("lang") as VoiceLang;
        if (!LANGS.includes(lang)) return jsonError("Unsupported language.", 400);
        const vocab = (url.searchParams.get("vocab") ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s && s.length < 60)
          .slice(0, 80);
        const bytes = await readLimited(request, MAX_WAV);
        if (!bytes) return jsonError("Recording too long (max ~60 s).", 413);
        if (bytes.byteLength < 1000) return jsonError("Recording too short.", 400);
        const wav = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer;
        try {
          return Response.json({ text: await transcribe(wav, lang, vocab) });
        } catch (e) {
          return jsonError(aiErrorMessage(e), 502);
        }
      },
    },
  },
});

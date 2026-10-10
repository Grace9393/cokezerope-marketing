import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { aiErrorMessage } from "@/lib/ai/gemini.server";
import { jsonError, rateLimited } from "@/lib/ai/guard.server";
import { rewriteForVoice, synthesize } from "@/lib/ai/voice.server";

const Body = z.object({
  text: z.string().trim().min(1).max(3000),
  lang: z.enum(["en", "de", "fr", "zh"]),
  /** Language the text is written in; Gemini rewrites it into `lang` if different. */
  sourceLang: z.enum(["en", "de", "fr", "zh"]).optional(),
  voiceId: z.string().max(64).optional(),
});

// POST /api/tts → audio/wav. en/de/fr via Gradium, zh via Gemini TTS.
export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (rateLimited(request, "tts", 30))
          return jsonError("Too many voice requests — try again later.", 429);
        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch {
          return jsonError("Invalid request.", 400);
        }
        try {
          const text = await rewriteForVoice(body.text, body.sourceLang, body.lang);
          const audio = await synthesize(text, body.lang, body.voiceId);
          return new Response(audio as unknown as BodyInit, {
            headers: {
              "Content-Type": "audio/wav",
              "Cache-Control": "no-store",
              "X-Voice-Provider": body.lang === "zh" ? "gemini" : "gradium",
            },
          });
        } catch (e) {
          return jsonError(aiErrorMessage(e), 502);
        }
      },
    },
  },
});

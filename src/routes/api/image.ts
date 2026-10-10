import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getGemini, aiErrorMessage } from "@/lib/ai/gemini.server";
import { MODELS } from "@/lib/ai/models";
import { jsonError, rateLimited } from "@/lib/ai/guard.server";

const Body = z.object({
  title: z.string().trim().min(1).max(200),
  details: z.string().max(2000).default(""),
  lang: z.enum(["en", "zh"]).default("zh"),
});

// POST /api/image → { image: base64, mimeType } — a DRAFT promo banner from
// Nano Banana 2.1. Only called after the user approves a draft_promo_visual.
export const Route = createFileRoute("/api/image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (rateLimited(request, "image", 8))
          return jsonError("Too many image requests — try again later.", 429);
        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch {
          return jsonError("Invalid request.", 400);
        }
        const textLang = body.lang === "zh" ? "Traditional Chinese (Taiwan)" : "English";
        const prompt =
          `Design a clean e-commerce promotional banner (16:9) for a luxury make-up brand on a Taiwan retailer such as momo or Sephora TW. ` +
          `Campaign: ${body.title}. Brief: ${body.details}. ` +
          `Elegant gold and black luxury beauty aesthetic, product-focused, minimal text in ${textLang}, clearly readable. ` +
          `Do not use any real brand logos or trademarks. Mark it as a draft concept.`;
        try {
          const it = (await getGemini().interactions.create({
            model: MODELS.image,
            input: prompt,
          } as never)) as unknown as {
            output_image?: { data: string; mime_type?: string } | null;
          };
          if (!it.output_image?.data) return jsonError("No image returned by the model.", 502);
          return Response.json({
            image: it.output_image.data,
            mimeType: it.output_image.mime_type ?? "image/png",
          });
        } catch (e) {
          return jsonError(aiErrorMessage(e), 502);
        }
      },
    },
  },
});

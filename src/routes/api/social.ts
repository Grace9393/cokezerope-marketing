import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { aiErrorMessage } from "@/lib/ai/gemini.server";
import { jsonError, rateLimited } from "@/lib/ai/guard.server";
import { scanSocial } from "@/lib/social/social.server";
import { SOCIAL_PLATFORMS } from "@/lib/social/types";

const Body = z.object({
  brands: z.array(z.string().trim().min(2).max(80)).min(1).max(4),
  platforms: z.array(z.enum(SOCIAL_PLATFORMS)).max(SOCIAL_PLATFORMS.length).default([]),
  days: z.number().int().min(7).max(365).default(90),
});

// POST /api/social → SocialScan (live Gemini + Google Search social listening).
export const Route = createFileRoute("/api/social")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (rateLimited(request, "social", 10))
          return jsonError("Too many scans — try again in a few minutes.", 429);
        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch {
          return jsonError("Invalid request.", 400);
        }
        try {
          return Response.json(await scanSocial(body));
        } catch (e) {
          return jsonError(aiErrorMessage(e), 502);
        }
      },
    },
  },
});

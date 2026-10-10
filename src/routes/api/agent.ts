import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { runAgent } from "@/lib/agent/agent.server";
import type { AgentEvent, AgentRequest } from "@/lib/agent/types";
import { jsonError, rateLimited, readLimited } from "@/lib/ai/guard.server";

const MAX_BODY = 2_000_000; // entries + optional screenshot

const RequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  lang: z.enum(["en", "zh"]),
  metric: z.enum(["value", "qty", "factor"]),
  year: z.number().int().min(2000).max(2100),
  selectedCategory: z.string().max(200).default(""),
  entries: z.array(z.unknown()).min(1).max(2000),
  history: z
    .array(z.object({ question: z.string().max(2000), headline: z.string().max(2000) }))
    .max(10)
    .default([]),
  image: z
    .object({
      data: z.string().max(1_400_000),
      mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
    })
    .nullable()
    .optional(),
  watchlist: z.array(z.string().max(500)).max(20).optional(),
  researchContext: z.string().max(20000).nullable().optional(),
  mode: z.enum(["category", "marketing"]).optional(),
  socialContext: z.string().max(60000).nullable().optional(),
});

// POST /api/agent → NDJSON stream of AgentEvent (plan, tool_call, tool_result, proposal, final, error).
export const Route = createFileRoute("/api/agent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (rateLimited(request, "agent", 30))
          return jsonError("Too many requests — try again in a few minutes.", 429);
        const bytes = await readLimited(request, MAX_BODY);
        if (!bytes) return jsonError("Request too large.", 413);
        const raw = new TextDecoder().decode(bytes);
        let body: AgentRequest;
        try {
          body = RequestSchema.parse(JSON.parse(raw)) as AgentRequest;
        } catch {
          return jsonError("Invalid request.", 400);
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const emit = (e: AgentEvent) =>
              controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
            await runAgent(body, emit);
            controller.close();
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});

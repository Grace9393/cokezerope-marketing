import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getGemini, aiErrorMessage } from "@/lib/ai/gemini.server";
import { MODELS } from "@/lib/ai/models";
import { jsonError, rateLimited, signHandle, verifyHandle } from "@/lib/ai/guard.server";

const Start = z.object({
  action: z.literal("start"),
  topic: z.string().trim().min(2).max(200),
  lang: z.enum(["en", "zh"]).default("en"),
});
const Cancel = z.object({ action: z.literal("cancel"), id: z.string().min(4).max(300) });

type Step = {
  type: string;
  summary?: { text?: string }[] | string;
  content?: {
    type: string;
    text?: string;
    annotations?: { type?: string; url?: string; title?: string }[];
  }[];
};

function digest(it: {
  id: string;
  status: string;
  steps?: Step[];
  output_text?: string | null;
  error?: unknown;
}) {
  const progress: string[] = [];
  const sources = new Map<string, string>();
  for (const s of it.steps ?? []) {
    if (s.type === "thought" && s.summary) {
      const txt = Array.isArray(s.summary)
        ? s.summary.map((x) => x.text ?? "").join(" ")
        : String(s.summary);
      if (txt.trim()) progress.push(txt.trim().slice(0, 240));
    }
    for (const c of s.content ?? [])
      for (const a of c.annotations ?? [])
        if (a.url && !sources.has(a.url)) sources.set(a.url, a.title ?? "");
  }
  return {
    id: it.id,
    status: it.status,
    progress: progress.slice(-12),
    report: it.status === "completed" ? (it.output_text ?? "") : null,
    sources: [...sources.entries()].slice(0, 40).map(([url, title]) => ({ url, title })),
    error:
      it.status === "failed"
        ? String((it.error as { message?: string })?.message ?? "Research failed.")
        : null,
  };
}

// Deep Research as a background managed agent:
//   POST {action:"start", topic, lang} → {id, status}
//   POST {action:"cancel", id}         → {id, status}
//   GET  ?id=…                         → {status, progress[], report, sources[]}
export const Route = createFileRoute("/api/research")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return jsonError("Invalid request.", 400);
        }
        const client = getGemini();
        const cancel = Cancel.safeParse(raw);
        if (cancel.success) {
          if (rateLimited(request, "research-cancel", 20))
            return jsonError("Too many requests.", 429);
          const id = await verifyHandle(cancel.data.id);
          if (!id) return jsonError("Unknown research job.", 404);
          try {
            await client.interactions.cancel(id);
            return Response.json({ id: cancel.data.id, status: "cancelled" });
          } catch (e) {
            return jsonError(aiErrorMessage(e), 502);
          }
        }
        const start = Start.safeParse(raw);
        if (!start.success) return jsonError("Invalid request.", 400);
        if (rateLimited(request, "research", 4, 30 * 60_000))
          return jsonError("Research limit reached — try again later.", 429);
        const { topic, lang } = start.data;
        const input =
          `${topic} in the Taiwan beauty market: pricing, promotions, launches in the last 90 days. Cite sources. ` +
          `Focus on momo, Sephora Taiwan, Watsons Taiwan and brand counters where relevant. ` +
          `Write the report in ${lang === "zh" ? "Traditional Chinese (Taiwan)" : "English"}, under 900 words, with a short executive summary first.`;
        try {
          const it = (await client.interactions.create({
            agent: MODELS.deepResearch,
            input,
            background: true,
            agent_config: {
              type: "deep-research",
              thinking_summaries: "auto",
              visualization: "off",
            },
          } as never)) as unknown as { id: string; status: string };
          return Response.json({ id: await signHandle(it.id), status: it.status });
        } catch (e) {
          return jsonError(aiErrorMessage(e), 502);
        }
      },
      GET: async ({ request }) => {
        const handle = new URL(request.url).searchParams.get("id");
        if (!handle || handle.length > 300) return jsonError("Missing id.", 400);
        const id = await verifyHandle(handle);
        if (!id) return jsonError("Unknown research job.", 404);
        if (rateLimited(request, "research-poll", 400)) return jsonError("Polling too fast.", 429);
        try {
          const it = (await getGemini().interactions.get(id)) as unknown as Parameters<
            typeof digest
          >[0];
          return Response.json({ ...digest(it), id: handle });
        } catch (e) {
          return jsonError(aiErrorMessage(e), 502);
        }
      },
    },
  },
});

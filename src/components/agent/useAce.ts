import { useCallback, useRef, useState } from "react";
import type { Entry, Metric } from "@/lib/dashboard-data";
import type {
  AgentEvent,
  AgentImage,
  AgentLang,
  Brief,
  EvidenceRow,
  Proposal,
  Route,
} from "@/lib/agent/types";

export type TimelineItem =
  | { kind: "plan"; route: Route; steps: string[] }
  | {
      kind: "tool";
      id: string;
      name: string;
      args: unknown;
      summary?: string;
      data?: unknown;
      done: boolean;
    };

export interface AceRun {
  id: string;
  /** What was sent to the agent (real names). */
  question: string;
  /** What the UI shows (demo-masked when the mask is on). */
  displayQuestion?: string;
  /** Unmasked headline, kept for the conversation history sent back to Ace. */
  rawHeadline?: string;
  hadImage: boolean;
  timeline: TimelineItem[];
  proposals: Proposal[];
  brief?: Brief;
  evidence: EvidenceRow[];
  error?: string;
  notices: string[];
  status: "running" | "done" | "error";
  elapsedMs?: number;
  lang: AgentLang;
}

export interface AceContext {
  entries: Entry[];
  metric: Metric;
  year: number;
  selectedCategory: string;
  lang: AgentLang;
  watchlist: string[];
  researchContext: string | null;
  mode?: "category" | "marketing";
  socialContext?: string | null;
}

/** Drop trailing empty months so the posted payload stays small. */
function compactEntries(entries: Entry[]): unknown[] {
  return entries.map((e) => {
    const metrics: Record<
      string,
      Record<string, { months: (number | null)[]; total: number | null }>
    > = {};
    for (const [m, years] of Object.entries(e.metrics)) {
      metrics[m] = {};
      for (const [y, d] of Object.entries(years ?? {})) {
        const months = [...d.months];
        while (months.length && months[months.length - 1] == null) months.pop();
        metrics[m][y] = { months, total: d.total };
      }
    }
    return { category: e.category, brand: e.brand, isCategoryTotal: e.isCategoryTotal, metrics };
  });
}

export interface AceDisplay {
  mask: (text: string) => string;
  deepMask: <T>(value: T) => T;
}

/** `display` masks everything shown (demo mask); the agent always gets real names. */
export function useAce(display?: AceDisplay) {
  const displayRef = useRef(display);
  displayRef.current = display;
  const [runs, setRuns] = useState<AceRun[]>([]);
  const runsRef = useRef<AceRun[]>([]);
  runsRef.current = runs;
  const abortRef = useRef<AbortController | null>(null);
  const running = runs.some((r) => r.status === "running");

  const update = (id: string, fn: (r: AceRun) => AceRun) =>
    setRuns((rs) => rs.map((r) => (r.id === id ? fn(r) : r)));

  const ask = useCallback(
    async (
      question: string,
      ctx: AceContext,
      image?: AgentImage | null,
    ): Promise<AceRun | null> => {
      const id = `run-${Date.now()}`;
      const run: AceRun = {
        id,
        question,
        displayQuestion: displayRef.current?.mask(question) ?? question,
        hadImage: !!image,
        timeline: [],
        proposals: [],
        evidence: [],
        notices: [],
        status: "running",
        lang: ctx.lang,
      };
      const history = runsRef.current
        .filter((r) => r.brief)
        .slice(-4)
        .map((r) => ({ question: r.question, headline: r.rawHeadline ?? r.brief!.headline }));
      setRuns((rs) => [...rs, run]);

      const ac = new AbortController();
      abortRef.current = ac;
      let final: AceRun = run;
      const apply = (rawEv: AgentEvent) => {
        const rawHeadline = rawEv.type === "final" ? rawEv.brief.headline : undefined;
        const ev = displayRef.current ? displayRef.current.deepMask(rawEv) : rawEv;
        const fn = (r: AceRun): AceRun => {
          switch (ev.type) {
            case "plan":
              return {
                ...r,
                timeline: [...r.timeline, { kind: "plan", route: ev.route, steps: ev.steps }],
              };
            case "tool_call":
              return {
                ...r,
                timeline: [
                  ...r.timeline,
                  { kind: "tool", id: ev.id, name: ev.name, args: ev.args, done: false },
                ],
              };
            case "tool_result":
              return {
                ...r,
                timeline: r.timeline.map((t) =>
                  t.kind === "tool" && t.id === ev.id
                    ? { ...t, summary: ev.summary, data: ev.data, done: true }
                    : t,
                ),
              };
            case "proposal":
              return { ...r, proposals: [...r.proposals, ev.proposal] };
            case "final":
              return {
                ...r,
                brief: ev.brief,
                rawHeadline,
                evidence: ev.evidence,
                elapsedMs: ev.elapsedMs,
                status: "done",
              };
            case "error":
              return r.brief ? r : { ...r, notices: [...r.notices, ev.message], error: ev.message };
          }
        };
        final = fn(final);
        update(id, fn);
      };

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({
            question,
            lang: ctx.lang,
            metric: ctx.metric,
            year: ctx.year,
            selectedCategory: ctx.selectedCategory,
            entries: compactEntries(ctx.entries),
            history,
            image: image ?? null,
            watchlist: ctx.watchlist,
            researchContext: ctx.researchContext,
            mode: ctx.mode ?? "category",
            socialContext: ctx.socialContext ? ctx.socialContext.slice(0, 55000) : null,
          }),
        });
        if (!res.ok || !res.body) {
          const msg = await res
            .json()
            .then((j) => j.error)
            .catch(() => `HTTP ${res.status}`);
          throw new Error(msg);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (line) apply(JSON.parse(line) as AgentEvent);
          }
        }
        if (buf.trim()) apply(JSON.parse(buf) as AgentEvent);
        if (final.status === "running") {
          const fn = (r: AceRun): AceRun => ({
            ...r,
            status: r.brief ? "done" : "error",
            error: r.error ?? "No brief returned.",
          });
          final = fn(final);
          update(id, fn);
        }
      } catch (e) {
        const msg = ac.signal.aborted ? "Stopped." : e instanceof Error ? e.message : String(e);
        const fn = (r: AceRun): AceRun => ({ ...r, status: "error", error: msg });
        final = fn(final);
        update(id, fn);
      } finally {
        abortRef.current = null;
      }
      return final;
    },
    [],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => setRuns([]), []);

  return { runs, running, ask, stop, reset };
}

/** Downscale an image file to a JPEG ≤1280px for the agent. */
export async function fileToAgentImage(file: File): Promise<AgentImage> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Could not read image"));
      i.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return { data: dataUrl.split(",")[1], mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

import { useCallback, useEffect, useRef, useState } from "react";

export interface ResearchJob {
  id: string | null;
  topic: string;
  status: "starting" | "in_progress" | "completed" | "failed" | "cancelled" | "error";
  progress: string[];
  report: string | null;
  sources: { url: string; title: string }[];
  error: string | null;
  startedAt: number;
}

const POLL_MS = 8000;

/** One Deep Research job at a time, polled from /api/research. */
export function useResearch() {
  const [job, setJob] = useState<ResearchJob | null>(null);
  const timer = useRef<number | null>(null);
  const running = job?.status === "starting" || job?.status === "in_progress";

  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const poll = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/research?id=${encodeURIComponent(id)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      setJob((cur) =>
        cur && cur.id === id
          ? {
              ...cur,
              status: j.status,
              progress: j.progress?.length ? j.progress : cur.progress,
              report: j.report,
              sources: j.sources ?? [],
              error: j.error,
            }
          : cur,
      );
      if (j.status === "in_progress")
        timer.current = window.setTimeout(() => void poll(id), POLL_MS);
    } catch (e) {
      // transient network error: keep polling a few more times
      timer.current = window.setTimeout(() => void poll(id), POLL_MS * 2);
      setJob((cur) =>
        cur && cur.id === id ? { ...cur, error: e instanceof Error ? e.message : String(e) } : cur,
      );
    }
  }, []);

  const start = useCallback(
    async (topic: string, lang: "en" | "zh"): Promise<boolean> => {
      if (running) return false;
      clear();
      setJob({
        id: null,
        topic,
        status: "starting",
        progress: [],
        report: null,
        sources: [],
        error: null,
        startedAt: Date.now(),
      });
      try {
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", topic, lang }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
        setJob((cur) => (cur ? { ...cur, id: j.id, status: "in_progress" } : cur));
        timer.current = window.setTimeout(() => void poll(j.id), POLL_MS);
      } catch (e) {
        setJob((cur) =>
          cur
            ? { ...cur, status: "error", error: e instanceof Error ? e.message : String(e) }
            : cur,
        );
      }
      return true;
    },
    [running, poll],
  );

  const cancel = useCallback(async () => {
    clear();
    const id = job?.id;
    setJob((cur) => (cur ? { ...cur, status: "cancelled" } : cur));
    if (id) {
      await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", id }),
      }).catch(() => undefined);
    }
  }, [job?.id]);

  const dismiss = useCallback(() => {
    clear();
    setJob(null);
  }, []);

  useEffect(() => clear, []);

  /** Report text Ace can use as context for its next question. */
  const context =
    job?.status === "completed" && job.report
      ? `Topic: ${job.topic}\n${job.report}\nSources: ${job.sources.map((s) => s.url).join(" ")}`
      : null;

  return { job, running, start, cancel, dismiss, context };
}

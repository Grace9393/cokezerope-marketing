import { useCallback, useEffect, useState } from "react";
import type { Proposal } from "@/lib/agent/types";

// Human-checkpoint state. Everything here is client-side and only changes
// when the user clicks Approve / Edit / Reject — the agent has no write path.

export type Decision = "proposed" | "approved" | "rejected" | "edited";

export interface ActivityEntry {
  ts: string;
  proposalId: string;
  type: Proposal["type"];
  title: string;
  decision: Decision;
  question?: string;
  note?: string;
}

export interface PriceAlert {
  id: string;
  title: string;
  details: string;
  evidenceIds: string[];
  ts: string;
}

const KEYS = { watchlist: "ace-watchlist", activity: "ace-activity", alerts: "ace-alerts" };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode / blocked) — keep in memory only */
  }
}

export function useApprovals() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [status, setStatus] = useState<Record<string, Decision>>({});

  useEffect(() => {
    setWatchlist(load(KEYS.watchlist, []));
    setActivity(load(KEYS.activity, []));
    setAlerts(load(KEYS.alerts, []));
  }, []);

  const log = useCallback((e: Omit<ActivityEntry, "ts">) => {
    setActivity((a) => {
      const next = [...a, { ...e, ts: new Date().toISOString() }].slice(-200);
      save(KEYS.activity, next);
      return next;
    });
    if (e.decision !== "proposed") setStatus((s) => ({ ...s, [e.proposalId]: e.decision }));
  }, []);

  const addToWatchlist = useCallback((url: string) => {
    setWatchlist((w) => {
      const next = w.includes(url) ? w : [...w, url].slice(-20);
      save(KEYS.watchlist, next);
      return next;
    });
  }, []);

  const removeFromWatchlist = useCallback((url: string) => {
    setWatchlist((w) => {
      const next = w.filter((x) => x !== url);
      save(KEYS.watchlist, next);
      return next;
    });
  }, []);

  const pinAlert = useCallback((a: PriceAlert) => {
    setAlerts((list) => {
      const next = [...list.filter((x) => x.id !== a.id), a].slice(-5);
      save(KEYS.alerts, next);
      return next;
    });
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((list) => {
      const next = list.filter((x) => x.id !== id);
      save(KEYS.alerts, next);
      return next;
    });
  }, []);

  return {
    watchlist,
    activity,
    alerts,
    status,
    log,
    addToWatchlist,
    removeFromWatchlist,
    pinAlert,
    dismissAlert,
  };
}

export type Approvals = ReturnType<typeof useApprovals>;

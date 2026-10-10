import type { Metric } from "@/lib/dashboard-data";

// Shared between the /api/agent server route and the Ace panel.

export type AgentLang = "en" | "zh";
export type Route = "lookup" | "analysis" | "research";

export type ActionType =
  | "add_to_watchlist"
  | "export_brief"
  | "draft_team_email"
  | "flag_price_gap"
  | "draft_promo_visual";

export const ACTION_TYPES: ActionType[] = [
  "add_to_watchlist",
  "export_brief",
  "draft_team_email",
  "flag_price_gap",
  "draft_promo_visual",
];

/** A suggested action. The agent can only propose — a human must Approve. */
export interface Proposal {
  id: string;
  type: ActionType;
  title: string;
  details: string;
  evidenceIds: string[];
  /** Optional structured payload, e.g. { url } for add_to_watchlist. */
  payload?: Record<string, string>;
}

export interface Finding {
  text: string;
  evidenceIds: string[];
}

export interface Brief {
  headline: string;
  findings: Finding[];
  actions: Proposal[];
  spokenSummary: string;
  suggestDeepResearch?: boolean;
}

/** Evidence row returned by query_dashboard / top_movers, keyed by id. */
export interface EvidenceRow {
  id: string;
  category: string;
  product: string;
  metric: Metric;
  year: number;
  total: number | null;
}

export type AgentEvent =
  | { type: "plan"; route: Route; steps: string[] }
  | { type: "tool_call"; id: string; name: string; args: unknown }
  | { type: "tool_result"; id: string; name: string; summary: string; data?: unknown }
  | { type: "proposal"; proposal: Proposal }
  | { type: "final"; brief: Brief; evidence: EvidenceRow[]; elapsedMs: number }
  | { type: "error"; message: string };

export interface AgentImage {
  data: string; // base64, no data: prefix
  mimeType: string;
}

export interface AgentRequest {
  question: string;
  lang: AgentLang;
  metric: Metric;
  year: number;
  selectedCategory: string;
  entries: unknown[];
  history: { question: string; headline: string }[];
  image?: AgentImage | null;
  watchlist?: string[];
  researchContext?: string | null;
  /** "marketing" = POC v2 (competitive analysis + social listening). */
  mode?: "category" | "marketing";
  /** Latest social scan (compact JSON) from the v2 page. */
  socialContext?: string | null;
}

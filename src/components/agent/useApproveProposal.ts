import { useCallback } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { isAllowedRetailer } from "@/lib/retailers";
import type { Proposal } from "@/lib/agent/types";
import type { AceRun } from "./useAce";
import type { Approvals } from "./useApprovals";
import { briefToMarkdown, downloadText, openMailDraft } from "./exports";

/** Shared by v1 and v2 pages. */
export function useApproveProposal(approvals: Approvals, lang: "en" | "zh") {
  const { t } = useI18n();
  // Executors for approved proposals. These are the ONLY place an action runs,
  // and they are only reachable from a human Approve click in ProposalCard.
  return useCallback(
    async (p: Proposal, run: AceRun): Promise<{ image?: string } | void> => {
      const base = {
        proposalId: p.id,
        type: p.type,
        title: p.title,
        question: run.displayQuestion ?? run.question,
      };
      switch (p.type) {
        case "add_to_watchlist": {
          // Only an explicit, allowlisted URL can be saved (no free-text extraction).
          const url = p.payload?.url?.trim();
          if (!url || !isAllowedRetailer(url)) {
            toast.error(t("ace.needsUrl"));
            return;
          }
          approvals.addToWatchlist(url);
          toast.success(t("ace.done.watchlist"));
          break;
        }
        case "export_brief": {
          const brief = run.brief ?? {
            headline: p.title,
            findings: [],
            actions: run.proposals,
            spokenSummary: "",
          };
          downloadText(
            `ace-brief-${new Date().toISOString().slice(0, 10)}.md`,
            briefToMarkdown(run.displayQuestion ?? run.question, brief, run.evidence, p),
          );
          toast.success(t("ace.done.export"));
          break;
        }
        case "draft_team_email": {
          const cites = p.evidenceIds.length
            ? `\n\nEvidence:\n${p.evidenceIds.map((id) => `- ${id}`).join("\n")}`
            : "";
          openMailDraft(p.title, p.details + cites);
          toast.success(t("ace.done.email"));
          break;
        }
        case "flag_price_gap":
          approvals.pinAlert({
            id: p.id,
            title: p.title,
            details: p.details,
            evidenceIds: p.evidenceIds,
            ts: new Date().toISOString(),
          });
          toast.success(t("ace.done.flag"));
          break;
        case "draft_promo_visual": {
          const res = await fetch("/api/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: p.title, details: p.details, lang }),
          });
          const j = await res.json().catch(() => ({}));
          if (!res.ok || !j.image) {
            toast.error(j.error ?? `HTTP ${res.status}`);
            return;
          }
          approvals.log({ ...base, decision: "approved" });
          toast.success(t("ace.done.visual"));
          return { image: `data:${j.mimeType ?? "image/png"};base64,${j.image}` };
        }
      }
      approvals.log({ ...base, decision: "approved" });
    },
    [approvals, lang, t],
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Pencil, X, Loader2, Download, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { Proposal } from "@/lib/agent/types";
import type { Decision } from "./useApprovals";

export interface ProposalCardProps {
  proposal: Proposal;
  status: Decision | undefined;
  /** Runs ONLY on an explicit Approve click, with the (possibly edited) proposal. */
  onApprove: (p: Proposal) => Promise<{ image?: string } | void>;
  onReject: (p: Proposal) => void;
  onEdited: (p: Proposal) => void;
}

export function ProposalCard({
  proposal,
  status,
  onApprove,
  onReject,
  onEdited,
}: ProposalCardProps) {
  const { t } = useI18n();
  const [p, setP] = useState<Proposal>(proposal);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(proposal);
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const decided = status === "approved" || status === "rejected";
  const needsUrl = p.type === "add_to_watchlist";

  const approve = async () => {
    setBusy(true);
    try {
      const res = await onApprove(p);
      if (res && res.image) setImage(res.image);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        status === "approved" && "border-emerald-500/50 bg-emerald-500/5",
        status === "rejected" && "border-border bg-muted/40 opacity-70",
        !decided && "border-amber-500/50 bg-amber-500/5",
      )}
    >
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="text-[10px]">
          {t(`ace.action.${p.type}`)}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {t(`ace.status.${status ?? "pending"}`)}
        </Badge>
      </div>

      {editing ? (
        <div className="space-y-2">
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="h-8 text-sm"
          />
          <Textarea
            value={draft.details}
            onChange={(e) => setDraft({ ...draft, details: e.target.value })}
            rows={4}
            className="text-xs"
          />
          {needsUrl && (
            <Input
              value={draft.payload?.url ?? ""}
              placeholder="https://www.momoshop.com.tw/..."
              onChange={(e) =>
                setDraft({ ...draft, payload: { ...draft.payload, url: e.target.value } })
              }
              className="h-8 text-xs"
            />
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setP(draft);
                setEditing(false);
                onEdited(draft);
              }}
            >
              {t("ace.save")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => {
                setDraft(p);
                setEditing(false);
              }}
            >
              {t("ace.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="font-medium leading-snug text-foreground">{p.title}</p>
          <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{p.details}</p>
          {needsUrl && p.payload?.url && (
            <p className="mt-1 break-all text-xs text-primary">{p.payload.url}</p>
          )}
        </>
      )}

      {image && (
        <div className="mt-2 space-y-1">
          <img src={image} alt={p.title} className="w-full rounded border border-border" />
          <a
            href={image}
            download="promo-draft.png"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Download className="h-3 w-3" /> PNG
          </a>
        </div>
      )}

      {!decided && !editing && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="h-7 bg-emerald-600 text-xs hover:bg-emerald-700"
            onClick={approve}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Check className="mr-1 h-3 w-3" />
            )}{" "}
            {t("ace.approve")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => {
              setDraft(p);
              setEditing(true);
            }}
            disabled={busy}
          >
            <Pencil className="mr-1 h-3 w-3" /> {t("ace.edit")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive"
            onClick={() => onReject(p)}
            disabled={busy}
          >
            <X className="mr-1 h-3 w-3" /> {t("ace.reject")}
          </Button>
        </div>
      )}
      {!decided && (
        <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" /> {t("ace.humanNote")}
        </p>
      )}
    </div>
  );
}

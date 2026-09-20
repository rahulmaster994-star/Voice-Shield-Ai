"use client";

import { Clock, Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast-provider";
import { RecentAnalysis } from "@/lib/types";
import { normalizeScore, TIER_META } from "@/lib/risk-utils";

interface AnalysisHistoryProps {
  analyses: RecentAnalysis[];
  onReplay: (record: RecentAnalysis) => void;
  onClear: () => void;
}

const TIER_ICON = {
  low: "●",
  medium: "◐",
  high: "◎",
  critical: "✕",
} as const;

export default function AnalysisHistory({
  analyses,
  onReplay,
  onClear,
}: AnalysisHistoryProps) {
  const { push } = useToast();
  const [confirmClear, setConfirmClear] = useState(false);

  function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      push("info", "Clear history?", "Click again to confirm.");
      return;
    }
    onClear();
    setConfirmClear(false);
    push("success", "History cleared", "Recent analyses were removed from this browser.");
  }

  function handleReplay(record: RecentAnalysis) {
    onReplay(record);
    push("info", "Result restored", `Reopened the ${record.tier.toUpperCase()} analysis from history.`);
  }

  return (
    <section aria-labelledby="history-heading" className="glass-panel rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="history-heading" className="text-base font-semibold text-vn-text">
            Recent analyses
          </h3>
          <p className="mt-0.5 text-xs text-vn-muted">Stored locally in this browser.</p>
        </div>
        {analyses.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              confirmClear
                ? "border-vn-red/50 bg-vn-red/15 text-vn-red"
                : "border-vn-border bg-white/5 text-vn-muted hover:text-vn-text"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {confirmClear ? "Confirm clear" : "Clear history"}
          </button>
        )}
      </div>

      {analyses.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-vn-border bg-vn-navy/40 px-4 py-8 text-center">
          <Clock className="mx-auto h-6 w-6 text-vn-muted" aria-hidden="true" />
          <p className="mt-2 text-sm text-vn-muted">
            No analyses yet. Run a scenario to build your history.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {analyses.map((record) => {
            const tierKey = (record.tier?.toLowerCase() || "low") as keyof typeof TIER_ICON;
            const meta = TIER_META[tierKey] || TIER_META.low;
            return (
              <li
                key={record.id}
                className="flex items-center gap-3 rounded-xl border border-vn-border bg-vn-navy/40 p-3 transition-colors hover:border-vn-cyan/30"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                  style={{ color: meta.hex, background: `${meta.hex}18` }}
                  aria-hidden="true"
                >
                  {TIER_ICON[tierKey] || "●"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-vn-text">
                    {record.scenario}
                  </p>
                  <p className="text-[11px] text-vn-muted">
                    {record.timestamp} ·{" "}
                    <span style={{ color: meta.hex }} className="font-semibold">
                      {record.tier}
                    </span>
                    {" · "}
                    <span className="font-mono">{Math.round(normalizeScore(record.score))}%</span>
                    {record.isDemo ? " · demo" : " · api"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleReplay(record)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-vn-border bg-white/5 px-3 py-1.5 text-xs font-semibold text-vn-cyan transition-colors hover:bg-vn-cyan/10"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  View result
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
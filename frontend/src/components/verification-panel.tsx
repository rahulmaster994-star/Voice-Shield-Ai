"use client";

import {
  Check,
  CheckCircle2,
  CircleDashed,
  Lock,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { TIER_META } from "@/lib/risk-utils";
import {
  RiskTier,
  VerificationStatus,
  VerificationStep,
} from "@/lib/types";

interface VerificationPanelProps {
  tier: RiskTier;
  status: VerificationStatus;
  onStatusChange: (status: VerificationStatus) => void;
}

const VERIFICATION_STEPS: VerificationStep[] = [
  {
    id: "phrase",
    label: "Independent verification phrase",
    description:
      "Call the person back on a number you already trust, or ask the caller a question only the real person would know.",
  },
  {
    id: "contact",
    label: "Trusted contact confirmation",
    description:
      "Confirm with a family member or the organization directly instead of acting on this call.",
  },
  {
    id: "secondary",
    label: "Secondary-channel check",
    description:
      "Verify through a different channel — an official app, a known website, or an in-person visit.",
  },
  {
    id: "device",
    label: "Registered-device consistency",
    description:
      "Confirm the caller is acting from the registered device and number on file before sharing anything.",
  },
];

function stepState(
  step: VerificationStep,
  status: VerificationStatus
): "pending" | "active" | "done" | "blocked" {
  if (status === "verified") return "done";
  if (status === "blocked") return "blocked";
  const idx = VERIFICATION_STEPS.findIndex((s) => s.id === step.id);
  if (status === "pending" || status === "none") {
    return idx === 0 ? "active" : "pending";
  }
  return "pending";
}

export default function VerificationPanel({
  tier,
  status,
  onStatusChange,
}: VerificationPanelProps) {
  const { push } = useToast();
  const tierMeta = TIER_META[tier];
  const isCritical = tier === "critical" || tier === "CRITICAL";
  const isMedium = tier === "medium" || tier === "MEDIUM";
  const showPanel = tierMeta.rank >= 2;

  if (!showPanel && !isMedium) {
    return (
      <section
        aria-labelledby="verification-heading"
        className="rounded-2xl border border-vn-green/30 bg-vn-green/5 p-5"
      >
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-vn-green" aria-hidden="true" />
          <div>
            <h3 id="verification-heading" className="text-sm font-bold text-vn-text">
              No additional verification required
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-vn-muted">
              The interaction falls below the verification threshold and can proceed without
              interruption. VAANISHIELD keeps monitoring the conversation for new signals.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (isMedium) {
    return (
      <section
        aria-labelledby="verification-heading"
        className="rounded-2xl border border-vn-amber/40 bg-vn-amber/10 p-5"
      >
        <div className="flex items-start gap-3">
          <PhoneCall className="mt-0.5 h-5 w-5 shrink-0 text-vn-amber" aria-hidden="true" />
          <div>
            <h3 id="verification-heading" className="text-sm font-bold text-vn-text">
              Caution — verify before sharing
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-vn-muted">
              Voice authenticity is uncertain. Verify the caller before sharing sensitive
              information.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const stepsState = VERIFICATION_STEPS.map((step) => stepState(step, status));

  function finish(next: VerificationStatus) {
    if (next === "verified") {
      push(
        "success",
        "Interaction verified",
        "Marked as independently verified. The conversation can proceed with caution."
      );
    } else if (next === "blocked") {
      push(
        "warning",
        "Interaction blocked",
        "The interaction is being treated as suspicious. No OTP, money, or confidential data was shared."
      );
    } else {
      push("info", "Warning dismissed", "You can re-open the verification workflow anytime.");
    }
    onStatusChange(next);
  }

  return (
    <section
      aria-labelledby="verification-heading"
      className="relative overflow-hidden rounded-2xl border p-5 sm:p-6"
      style={{
        borderColor: `${tierMeta.hex}55`,
        background: `linear-gradient(150deg, ${tierMeta.hex}14, #0b1b32 55%)`,
      }}
    >
      <div className="flex flex-col gap-4">
        {/* Warning banner */}
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${tierMeta.hex}22`, color: tierMeta.hex }}
          >
            {isCritical ? (
              <Lock className="h-5 w-5" aria-hidden="true" />
            ) : (
              <PhoneCall className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <h3
              id="verification-heading"
              className="text-base font-bold text-vn-text"
            >
              {status === "verified"
                ? "Independently verified"
                : status === "blocked"
                  ? "Interaction blocked — do not proceed"
                  : isCritical
                    ? "Critical impersonation risk"
                    : "Independent verification recommended"}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-vn-muted">
              {isCritical
                ? "Do not share OTPs, passwords, money, or confidential information until the caller is independently verified."
                : "This call carries a credible impersonation signal. Confirm the caller's identity out-of-band before taking any sensitive action."}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-vn-border bg-vn-navy/40 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-vn-muted">
            <ShieldCheck className="h-4 w-4 text-vn-cyan" aria-hidden="true" />
            Why independent verification?
          </div>
          <p className="mt-2 text-sm leading-relaxed text-vn-muted">
            Detection alone cannot stop an attack — the caller still controls the conversation.
            VAANISHIELD buys you time by forcing a check against a channel the attacker cannot
            impersonate. You do not need to argue with the caller; just verify in private.
          </p>
        </div>

        {/* Steps */}
        <ol className="space-y-2.5">
          {VERIFICATION_STEPS.map((step, index) => {
            const state = stepsState[index];
            return (
              <li key={step.id} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                    state === "done"
                      ? "border-vn-green/60 bg-vn-green/15 text-vn-green"
                      : state === "blocked"
                        ? "border-vn-red/60 bg-vn-red/15 text-vn-red"
                        : state === "active"
                          ? "border-vn-cyan/70 bg-vn-cyan/15 text-vn-cyan"
                          : "border-vn-border bg-white/5 text-vn-muted"
                  }`}
                >
                  {state === "done" ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : state === "blocked" ? (
                    <X className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <CircleDashed className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-vn-text">{step.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-vn-muted">
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3 border-t border-vn-border pt-4">
          <button
            type="button"
            onClick={() => finish("verified")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-vn-green to-vn-cyan px-5 py-2.5 text-sm font-bold text-vn-navy shadow-lg shadow-vn-green/20 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Mark as Verified
          </button>
          <button
            type="button"
            onClick={() => finish("blocked")}
            className="inline-flex items-center gap-2 rounded-xl border border-vn-red/50 bg-vn-red/10 px-5 py-2.5 text-sm font-bold text-vn-red transition-colors hover:bg-vn-red/20"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            Keep Interaction Blocked
          </button>
          <button
            type="button"
            onClick={() => finish("dismissed")}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-vn-muted transition-colors hover:text-vn-text"
          >
            Dismiss Warning
          </button>
        </div>

        {/* Simulation note */}
        <p className="flex items-center gap-1.5 text-[11px] text-vn-muted/80">
          <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
          Prototype simulation only — no real calls, SMS, payments, or telecom actions are
          intercepted.
        </p>
      </div>
    </section>
  );
}
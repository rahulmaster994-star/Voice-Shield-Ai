import { RiskTier } from "@/lib/types";

export interface TierMeta {
  label: string;
  rank: number;
  hex: string;
  dotClass: string;
  textClass: string;
  badgeClass: string;
  barClass: string;
  chipClass: string;
  ringHex: string;
}

export const TIER_META: Record<string, TierMeta> = {
  low: {
    label: "Low",
    rank: 0,
    hex: "#34d399",
    dotClass: "bg-vn-green",
    textClass: "text-vn-green",
    badgeClass: "border-vn-green/40 bg-vn-green/10 text-vn-green",
    barClass: "bg-vn-green",
    chipClass: "border-vn-green/40 bg-vn-green/10 text-vn-green",
    ringHex: "#34d399",
  },
  medium: {
    label: "Medium",
    rank: 1,
    hex: "#fbbf24",
    dotClass: "bg-vn-amber",
    textClass: "text-vn-amber",
    badgeClass: "border-vn-amber/40 bg-vn-amber/10 text-vn-amber",
    barClass: "bg-vn-amber",
    chipClass: "border-vn-amber/40 bg-vn-amber/10 text-vn-amber",
    ringHex: "#fbbf24",
  },
  high: {
    label: "High",
    rank: 2,
    hex: "#fb923c",
    dotClass: "bg-vn-orange",
    textClass: "text-vn-orange",
    badgeClass: "border-vn-orange/40 bg-vn-orange/10 text-vn-orange",
    barClass: "bg-vn-orange",
    chipClass: "border-vn-orange/40 bg-vn-orange/10 text-vn-orange",
    ringHex: "#fb923c",
  },
  critical: {
    label: "Critical",
    rank: 3,
    hex: "#f43f5e",
    dotClass: "bg-vn-red",
    textClass: "text-vn-red",
    badgeClass: "border-vn-red/40 bg-vn-red/10 text-vn-red",
    barClass: "bg-vn-red",
    chipClass: "border-vn-red/40 bg-vn-red/10 text-vn-red",
    ringHex: "#f43f5e",
  },
};
TIER_META.LOW = TIER_META.low;
TIER_META.MEDIUM = TIER_META.medium;
TIER_META.HIGH = TIER_META.high;
TIER_META.CRITICAL = TIER_META.critical;

/** Tiers ordered from safest to most critical. */
export const TIER_ORDER: RiskTier[] = ["low", "medium", "high", "critical"];

/**
 * Normalize a raw 0..1 probability (or 0..100 score) into a 0..100 percentage.
 * Safely clamps NaN, negatives and values above 100.
 */
export function normalizeScore(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  let n = value;
  if (n >= 0 && n <= 1) n = n * 100;
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

/** Display a normalized 0..100 score as a rounded percentage string. */
export function formatScore(value: unknown, fallback = 0): string {
  return `${Math.round(normalizeScore(value, fallback))}%`;
}

/** Map a normalized 0..100 score to a risk tier (display fallback when the backend omits one). */
export function tierFromRisk(score: number): RiskTier {
  if (score < 30) return "low";
  if (score < 55) return "medium";
  if (score < 80) return "high";
  return "critical";
}

/** Non-color readable label for an intent flag key. */
export const INTENT_LABELS: Record<string, string> = {
  otp_request: "OTP request",
  financial_request: "Financial request",
  urgency: "Urgency",
  authority_claim: "Authority claim",
  secrecy_request: "Secrecy request",
};

/** Words highlighted as risky inside transcripts. */
export const RISKY_TERMS = [
  "otp",
  "one-time password",
  "verification code",
  "urgent",
  "immediately",
  "right now",
  "emergency",
  "transfer",
  "money",
  "bank",
  "password",
  "secret",
  "upi",
  "account",
  "wire",
  "pin",
];

/**
 * Escape a string for safe injection into an HTML innerHTML render, then
 * highlight risky terms as <mark>.
 */
export function highlightTranscript(transcript: string): string {
  const escaped = transcript.replace(/[&<>"]/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
  const pattern = new RegExp(`\\b(${RISKY_TERMS.join("|")})\\b`, "gi");
  return escaped.replace(
    pattern,
    (match) =>
      `<mark class="vn-transcript-mark">${match}</mark>`
  );
}
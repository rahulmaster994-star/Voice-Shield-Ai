import { AnalysisResponse, RiskTier } from "@/lib/types";
import { normalizeScore, tierFromRisk } from "@/lib/risk-utils";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export const MAX_FILE_SIZE_MB = 50;
export const REQUEST_TIMEOUT_MS = 120_000;

export const ACCEPTED_TYPES = [
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
];

export type ApiErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNSUPPORTED_AUDIO"
  | "FILE_TOO_LARGE"
  | "API_ERROR"
  | "INCOMPLETE_RESPONSE";

export class ApiClientError extends Error {
  code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
  }
}

/** Check file type + size client-side before sending. Returns null when valid. */
export function validateAudioFile(
  file: File,
  fieldName = "Audio"
): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `${fieldName}: unsupported audio type "${
      file.type || "unknown"
    }". Use WAV, MP3, M4A, OGG, or WebM.`;
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `${fieldName}: file exceeds the ${MAX_FILE_SIZE_MB} MB limit.`;
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function friendlyApiError(err: unknown): string {
  if (err instanceof ApiClientError) {
    switch (err.code) {
      case "UNSUPPORTED_AUDIO":
        return "This audio format isn't supported. Use WAV, MP3, M4A, OGG, or WebM.";
      case "FILE_TOO_LARGE":
        return `The audio file is too large. Please upload a file under ${MAX_FILE_SIZE_MB} MB.`;
      case "TIMEOUT":
        return "The backend took too long to respond. Check that the API is running, or switch to Demo mode.";
      case "NETWORK_ERROR":
        return "Could not reach the backend server. Start the API, or switch to Demo mode for an offline walkthrough.";
      case "INCOMPLETE_RESPONSE":
        return "The backend returned an incomplete result. The analysis could not be shown.";
      default:
        return "The backend couldn't complete the analysis. Check that the API is running, or switch to Demo mode.";
    }
  }
  return "Analysis failed. Please try again.";
}

/**
 * Validate and harden a raw backend payload into a safe AnalysisResponse.
 * Missing or malformed fields are neutralized rather than crashing the UI.
 */
export function sanitizeAnalysisResponse(
  raw: Partial<AnalysisResponse> | null | undefined
): AnalysisResponse {
  const voice = raw?.voice_authenticity ?? null;
  const identity = raw?.identity_verification ?? null;
  const intent = raw?.intent_analysis ?? null;
  const risk = raw?.risk ?? null;

  const voiceProb = normalizeScore(voice?.synthetic_probability, 0.5);
  const voiceResult = {
    synthetic_probability: voiceProb / 100,
    label:
      typeof voice?.label === "string" && voice.label
        ? voice.label
        : voiceProb >= 50
          ? "synthetic"
          : "bonafide",
    model_finetuned: Boolean(voice?.model_finetuned),
  };

  const identityResult =
    identity === null || identity === undefined
      ? null
      : {
          similarity_score: normalizeScore(identity.similarity_score, 0.5) / 100,
          identity_match: Boolean(identity.identity_match),
        };

  const flagsRaw = intent?.flags;
  const flags: Record<string, boolean> = {};
  if (flagsRaw && typeof flagsRaw === "object") {
    for (const [key, value] of Object.entries(flagsRaw)) {
      flags[key] = Boolean(value);
    }
  }
  const intentResult = {
    transcript:
      typeof intent?.transcript === "string" ? intent.transcript : "(no transcript returned)",
    flags,
    triggered_intents: Array.isArray(intent?.triggered_intents)
      ? intent.triggered_intents.filter((x: unknown) => typeof x === "string")
      : Object.entries(flags)
          .filter(([, v]) => v)
          .map(([k]) => k),
    intent_risk_score: normalizeScore(intent?.intent_risk_score, 0.25) / 100,
  };

  const overall = normalizeScore(risk?.overall_risk, 0.5);
  let tierRaw = risk?.tier;
  if (
    typeof tierRaw !== "string" ||
    !["low", "medium", "high", "critical"].includes(tierRaw)
  ) {
    tierRaw = tierFromRisk(overall);
  }
  const tier = tierRaw as RiskTier;

  const breakdown = {
    voice_authenticity_risk: normalizeScore(
      risk?.breakdown?.voice_authenticity_risk,
      voiceProb
    ),
    identity_mismatch_risk: identityResult
      ? normalizeScore(risk?.breakdown?.identity_mismatch_risk, 0.5)
      : 0,
    intent_risk: normalizeScore(risk?.breakdown?.intent_risk, intentResult.intent_risk_score),
  };

  return {
    voice_authenticity: voiceResult,
    identity_verification: identityResult,
    intent_analysis: intentResult,
    risk: {
      overall_risk: overall,
      tier,
      response:
        typeof risk?.response === "string" && risk.response
          ? risk.response
          : "No recommendation provided by the backend.",
      breakdown,
    },
  };
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * POST audio (+ optional reference) to {base}/analyze/full as multipart
 * form data. Throws ApiClientError with a machine-usable code.
 */
export async function analyzeAudio(
  audioFile: File,
  referenceAudioFile?: File | null
): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append("audio", audioFile);
  if (referenceAudioFile) {
    formData.append("reference_audio", referenceAudioFile);
  }

  let response: Response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      response = await fetch(`${API_BASE_URL}/analyze/full`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiClientError("TIMEOUT", "Request timed out.");
    }
    throw new ApiClientError("NETWORK_ERROR", "Network error.");
  }

  if (!response.ok) {
    if (response.status === 422) {
      throw new ApiClientError("UNSUPPORTED_AUDIO", "Unsupported audio type.");
    }
    if (response.status === 413) {
      throw new ApiClientError("FILE_TOO_LARGE", "File too large.");
    }
    throw new ApiClientError("API_ERROR", `API error ${response.status}.`);
  }

  const json: unknown = await response.json();
  return sanitizeAnalysisResponse(json as Partial<AnalysisResponse>);
}
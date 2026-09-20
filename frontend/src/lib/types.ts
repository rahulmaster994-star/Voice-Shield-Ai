export type RiskTier =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type CallStatus = "IDLE" | "CONNECTED" | "ANALYZING" | "CHALLENGE" | "BLOCKED" | "VERIFIED";

export type ToastKind = "info" | "success" | "warning" | "error";

export interface ToastMessage {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
  duration?: number;
}

export type VerificationStatus =
  | "none"
  | "unverified"
  | "pending"
  | "verified"
  | "rejected"
  | "dismissed"
  | string;

export interface VerificationStep {
  id: string;
  label: string;
  description?: string;
  status?: "pending" | "current" | "passed" | "failed" | string;
}

export interface PipelineStage {
  id: string;
  label: string;
  status: PipelineStageStatus;
  statusText?: string;
  completeText?: string;
  skippedText?: string;
}

export type PipelineStageStatus =
  | "waiting"
  | "running"
  | "complete"
  | "skipped"
  | "error"
  | "idle"
  | "done"
  | string;

export interface AnalysisMeta {
  file_name?: string;
  file_size?: number;
  duration_sec?: number;
  scenario_id?: string;
  isDemo?: boolean;
  scenarioLabel?: string;
  scenarioType?: string;
  claimedIdentity?: string;
  modeLabel?: string;
  timestamp?: string;
  fileName?: string;
  fileSize?: number;
  durationSec?: number;
  [key: string]: any;
}

export interface RecentAnalysis {
  id: string;
  timestamp: string;
  risk_level?: RiskTier;
  risk_score?: number;
  scenario_name?: string;
  scenario?: string;
  scenarioLabel?: string;
  response?: string;
  isDemo?: boolean;
  tier: RiskTier;
  score?: number;
  result?: any;
  [key: string]: any;
}

export type ScenarioType =
  | "genuine"
  | "ai_cloned"
  | "ai_cloned_scam"
  | "known_person_mismatch"
  | "normal"
  | "cfo_fraud"
  | "family_emergency"
  | "bank_otp"
  | "synthetic"
  | string;

export interface ScenarioConfig {
  id?: string;
  title?: string;
  label?: string;
  description: string;
  expectedTier: RiskTier;
  footnote?: string;
  transcript?: string;
  file?: string;
  type: ScenarioType;
  claimed_identity?: string | null;
  mock_transcript?: string;
  [key: string]: any;
}

export interface AudioTelemetry {
  sample_rate: number;
  duration: number;
  volume: number;
  volume_db: number;
  speech_detected: boolean;
  noise_level: number;
  audio_quality: number;
  clipping_detected: boolean;
}

export interface VoiceAuthenticityResult {
  synthetic_probability: number;
  confidence: number;
  label: "synthetic" | "bonafide" | "unknown" | string;
  model_name?: string;
  model_version?: string;
  model_finetuned?: boolean;
  status?: string;
  warning?: string;
}

export interface IdentityVerificationResult {
  speaker_name?: string;
  similarity?: number;
  similarity_score: number;
  match?: boolean;
  identity_match: boolean;
  confidence?: number;
  threshold?: number;
  status?: string;
  source?: string;
  claimed_identity?: string;
  warning?: string;
}

export interface LivenessResult {
  status: "PASS" | "UNCERTAIN" | "FAIL" | string;
  liveness_confidence: number;
  reasons: string[];
  metrics?: {
    dynamic_variance?: number;
    high_freq_ratio?: number;
    spectral_flatness?: number;
    repetition_ratio?: number;
  };
}

export interface IntentAnalysisResult {
  transcript: string;
  flags: Record<string, boolean>;
  triggered_intents: string[];
  intent_risk_score: number;
  status?: string;
}

export interface RiskBreakdown {
  synthetic_voice_risk?: number;
  voice_authenticity_risk?: number;
  identity_mismatch_risk?: number;
  liveness_risk?: number;
  intent_risk?: number;
}

export interface RiskResult {
  overall_risk: number;
  risk_score?: number;
  risk_level?: RiskTier;
  tier?: RiskTier;
  recommended_action?: "ALLOW" | "MONITOR" | "CHALLENGE" | "BLOCK" | string;
  response?: string;
  reasons?: string[];
  breakdown?: RiskBreakdown;
}

export interface PreventionDecision {
  action: "ALLOW" | "MONITOR" | "CHALLENGE" | "BLOCK" | string;
  display_title: string;
  alert_level: string;
  can_proceed: boolean;
  status_badge: string;
  summary: string;
}

export interface ChallengeInfo {
  challenge_id: string;
  phrase: string;
  state?: "PENDING" | "ISSUED" | "RESPONSE_RECEIVED" | "ANALYZING" | "PASSED" | "FAILED" | string;
  prompt?: string;
  expires_in_sec: number;
  result?: {
    challenge_id?: string;
    challenge_status: "PASSED" | "FAILED" | string;
    expected_phrase?: string;
    transcript_heard?: string;
    phrase_match?: boolean;
    speaker_match?: boolean | null;
    liveness?: string;
    synthetic_probability?: number;
    reasons?: string[];
  };
}

export interface IncidentRecord {
  incident_id?: string;
  id?: string;
  timestamp: string;
  risk_level: RiskTier | string;
  status: string;
  reasons: string[];
  recommended_action?: string;
  transcript?: string;
  deepfake_result?: VoiceAuthenticityResult;
  speaker_result?: any;
  liveness_result?: LivenessResult;
  conversation_risk?: IntentAnalysisResult;
  challenge_result?: any;
}

export interface AnalysisResponse {
  voice_authenticity: {
    synthetic_probability: number;
    label: string;
    model_finetuned?: boolean;
  };
  identity_verification: {
    similarity_score: number;
    identity_match: boolean;
  } | null;
  intent_analysis: {
    transcript: string;
    flags: Record<string, boolean>;
    triggered_intents: string[];
    intent_risk_score: number;
  };
  risk: {
    overall_risk: number;
    tier: RiskTier;
    response: string;
    breakdown: {
      voice_authenticity_risk?: number;
      identity_mismatch_risk?: number;
      intent_risk?: number;
    };
  };
}

export interface FullAnalysisResponse {
  telemetry: AudioTelemetry;
  voice_authenticity: VoiceAuthenticityResult;
  identity_verification: IdentityVerificationResult | null;
  liveness: LivenessResult;
  intent_analysis: IntentAnalysisResult;
  risk: RiskResult;
  prevention: PreventionDecision;
  inference_latency_sec: number;
  identity_warning?: string;
  is_demo_audio?: boolean;
}

export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  file: string;
  claimed_identity: string | null;
  mock_transcript: string;
}
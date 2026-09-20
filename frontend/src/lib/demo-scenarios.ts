import {
  AnalysisResponse,
  ScenarioConfig,
  ScenarioType,
} from "@/lib/types";

export const SCENARIOS: ScenarioConfig[] = [
  {
    type: "genuine",
    label: "Genuine Voice",
    description: "Normal conversation with no suspicious request.",
    expectedTier: "low",
    footnote: "Expected result: low risk, no verification required.",
    transcript: "Hey, can you send me the assignment when you get time?",
  },
  {
    type: "ai_cloned",
    label: "AI-Cloned Voice",
    description: "Synthetic voice detected while impersonating a known contact.",
    expectedTier: "high",
    footnote: "Expected result: high risk, high synthetic probability, verification recommended.",
    transcript:
      "Hey, it's me. I need you to send me the project files right away. I'm in a meeting and can't talk long.",
  },
  {
    type: "ai_cloned_scam",
    label: "AI-Cloned Scam Call",
    description: "Cloned voice requests urgent money transfer and OTP.",
    expectedTier: "critical",
    footnote: "Expected result: critical risk, mandatory verification warning.",
    transcript:
      "I am stuck somewhere. Please transfer ₹20,000 immediately and send me the OTP. Do not tell anyone.",
  },
  {
    type: "known_person_mismatch",
    label: "Known-Person Mismatch",
    description: "Caller claims to be a trusted person but the voice does not match.",
    expectedTier: "high",
    footnote: "Expected result: high risk, identity mismatch, verification recommended.",
    transcript:
      "Hi, this is your manager. I need you to transfer funds to a new vendor account. The amount is five lakh rupees. Process it today itself.",
  },
];

export const SCENARIO_LABELS: Record<string, string> = {
  genuine: "Genuine Voice",
  ai_cloned: "AI-Cloned Voice",
  ai_cloned_scam: "AI-Cloned Scam Call",
  known_person_mismatch: "Known-Person Mismatch",
};

export const SCENARIO_DEFAULT_IDENTITY: Record<string, string> = {
  genuine: "Known Contact",
  ai_cloned: "Family Member",
  ai_cloned_scam: "Bank Branch Manager (SBI)",
  known_person_mismatch: "Company HR Manager",
};

export const CLAIMED_IDENTITIES = [
  "Known Contact",
  "Family Member",
  "Bank Branch Manager (SBI)",
  "Cyber Crime Officer",
  "Company HR Manager",
  "ISP / Telecom Executive",
] as const;

export const CLAIMED_IDENTITY_OPTIONS = [
  "Not specified",
  ...CLAIMED_IDENTITIES,
] as const;

const mockResponses: Record<string, AnalysisResponse> = {
  genuine: {
    voice_authenticity: {
      synthetic_probability: 0.08,
      label: "bonafide",
      model_finetuned: true,
    },
    identity_verification: {
      similarity_score: 0.91,
      identity_match: true,
    },
    intent_analysis: {
      transcript: "Hey, can you send me the assignment when you get time?",
      flags: {
        otp_request: false,
        financial_request: false,
        urgency: false,
        authority_claim: false,
        secrecy_request: false,
      },
      triggered_intents: [],
      intent_risk_score: 0.0,
    },
    risk: {
      overall_risk: 0.08,
      tier: "low",
      response: "No interruption — normal conversation.",
      breakdown: {
        voice_authenticity_risk: 0.08,
        identity_mismatch_risk: 0.09,
        intent_risk: 0.0,
      },
    },
  },
  ai_cloned: {
    voice_authenticity: {
      synthetic_probability: 0.92,
      label: "synthetic",
      model_finetuned: true,
    },
    identity_verification: {
      similarity_score: 0.34,
      identity_match: false,
    },
    intent_analysis: {
      transcript:
        "Hey, it's me. I need you to send me the project files right away. I'm in a meeting and can't talk long.",
      flags: {
        otp_request: false,
        financial_request: false,
        urgency: true,
        authority_claim: false,
        secrecy_request: false,
      },
      triggered_intents: ["urgency"],
      intent_risk_score: 0.35,
    },
    risk: {
      overall_risk: 0.69,
      tier: "high",
      response:
        "High risk: the voice is likely synthetic and does not match the claimed speaker. Urgency in the speech suggests a social engineering attempt.",
      breakdown: {
        voice_authenticity_risk: 0.92,
        identity_mismatch_risk: 0.66,
        intent_risk: 0.35,
      },
    },
  },
  ai_cloned_scam: {
    voice_authenticity: {
      synthetic_probability: 0.947,
      label: "synthetic",
      model_finetuned: true,
    },
    identity_verification: {
      similarity_score: 0.23,
      identity_match: false,
    },
    intent_analysis: {
      transcript:
        "I am stuck somewhere. Please transfer ₹20,000 immediately and send me the OTP. Do not tell anyone.",
      flags: {
        otp_request: true,
        financial_request: true,
        urgency: true,
        authority_claim: false,
        secrecy_request: true,
      },
      triggered_intents: ["otp_request", "financial_request", "urgency", "secrecy_request"],
      intent_risk_score: 1.0,
    },
    risk: {
      overall_risk: 0.94,
      tier: "critical",
      response: "Strong warning + mandatory verification before proceeding.",
      breakdown: {
        voice_authenticity_risk: 0.947,
        identity_mismatch_risk: 0.77,
        intent_risk: 1.0,
      },
    },
  },
  known_person_mismatch: {
    voice_authenticity: {
      synthetic_probability: 0.15,
      label: "bonafide",
      model_finetuned: true,
    },
    identity_verification: {
      similarity_score: 0.23,
      identity_match: false,
    },
    intent_analysis: {
      transcript:
        "Hi, this is your manager. I need you to transfer funds to a new vendor account. The amount is five lakh rupees. Process it today itself.",
      flags: {
        otp_request: false,
        financial_request: true,
        urgency: true,
        authority_claim: true,
        secrecy_request: false,
      },
      triggered_intents: ["financial_request", "urgency", "authority_claim"],
      intent_risk_score: 0.72,
    },
    risk: {
      overall_risk: 0.68,
      tier: "high",
      response:
        "High risk: the voice is human but does not match the claimed identity. A financial request combined with urgency and an authority claim suggests an impersonation attack.",
      breakdown: {
        voice_authenticity_risk: 0.15,
        identity_mismatch_risk: 0.77,
        intent_risk: 0.72,
      },
    },
  },
};

/**
 * Return a fresh deep copy of the mocked response for a scenario so the
 * dashboard never mutates shared state.
 */
export function getDemoResponse(scenario: ScenarioType): AnalysisResponse {
  return JSON.parse(JSON.stringify(mockResponses[scenario])) as AnalysisResponse;
}

/**
 * Simulation-only network delay for a believable demo pipeline.
 * Fast enough to keep a live presentation snappy.
 */
export function demoTick(durationMs = 850): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
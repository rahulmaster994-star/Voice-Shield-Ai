"""
Layer 4 — Unified Impersonation Risk Engine

Combines signals across all 5 verification dimensions:
1. Deepfake / Synthetic Voice Probability (Layer 1)
2. Speaker Verification / Cosine Mismatch (Layer 2)
3. Voice Liveness & Anti-Spoof (Layer Liveness)
4. Speech-to-Text & Scam Intent (Layer 3)
5. Sensitive Context Flags (financial, urgency, secrecy, authority)

Returns:
- overall_risk (float 0.0 - 1.0)
- risk_score (int 0 - 100)
- risk_level: LOW | MEDIUM | HIGH | CRITICAL
- reasons: list[str] (explainable factors)
- recommended_action: ALLOW | MONITOR | CHALLENGE | BLOCK
- breakdown: dict of component risk scores
"""

import os

# Configurable weights from environment with sane defaults
WEIGHT_DEEPFAKE = float(os.getenv("WEIGHT_DEEPFAKE", "0.35"))
WEIGHT_SPEAKER = float(os.getenv("WEIGHT_SPEAKER", "0.25"))
WEIGHT_LIVENESS = float(os.getenv("WEIGHT_LIVENESS", "0.15"))
WEIGHT_INTENT = float(os.getenv("WEIGHT_INTENT", "0.25"))

# Thresholds
THRESH_LOW = float(os.getenv("THRESH_LOW", "0.30"))
THRESH_MEDIUM = float(os.getenv("THRESH_MEDIUM", "0.55"))
THRESH_HIGH = float(os.getenv("THRESH_HIGH", "0.75"))


class RiskEngine:
    def __init__(self):
        self.weights = {
            "deepfake": WEIGHT_DEEPFAKE,
            "speaker": WEIGHT_SPEAKER,
            "liveness": WEIGHT_LIVENESS,
            "intent": WEIGHT_INTENT,
        }

    def compute(
        self,
        voice_result: dict,
        identity_result: dict | None = None,
        intent_result: dict | None = None,
        liveness_result: dict | None = None,
        replay_result: dict | None = None,
    ) -> dict:
        reasons = []

        # 1. Voice Authenticity / Deepfake
        synthetic_prob = voice_result.get("synthetic_probability", 0.0)
        voice_risk = synthetic_prob
        if synthetic_prob >= 0.70:
            reasons.append(f"High synthetic voice probability ({int(synthetic_prob * 100)}%)")
        elif synthetic_prob >= 0.45:
            reasons.append(f"Acoustic indicators suggest possible voice synthesis ({int(synthetic_prob * 100)}%)")

        # 2. Speaker Verification
        if identity_result is not None and identity_result.get("similarity_score") is not None:
            sim = identity_result["similarity_score"]
            # Low similarity implies high mismatch risk
            speaker_risk = max(0.0, min(1.0, 1.0 - max(0.0, sim)))
            speaker_name = identity_result.get("speaker_name", "Target Identity")
            if not identity_result.get("match", False):
                reasons.append(f"Voiceprint mismatch with claimed identity '{speaker_name}' (similarity {int(sim * 100)}%)")
            else:
                speaker_risk = max(0.0, speaker_risk * 0.4)  # Attenuate risk if speaker verified
        else:
            # Neutral if no identity claimed
            speaker_risk = 0.25

        # 3. Liveness Check
        if liveness_result is not None:
            live_status = liveness_result.get("status", "UNCERTAIN")
            conf = liveness_result.get("liveness_confidence", 0.5)
            if live_status == "FAIL":
                liveness_risk = 0.90
                reasons.append("Liveness failure: acoustic profile matches recorded replay or synthetic vocoder")
            elif live_status == "UNCERTAIN":
                liveness_risk = 0.45
            else:
                liveness_risk = max(0.0, 1.0 - conf)
        else:
            liveness_risk = 0.30
            
        # 3.5 Replay Check
        replay_risk = 0.0
        if replay_result is not None:
            replay_prob = replay_result.get("replay_probability", 0.0)
            replay_risk = replay_prob
            if replay_prob >= 0.70:
                reasons.append(f"High replay probability ({int(replay_prob * 100)}%) - Spectral bandwidth indicates device playback")
                # Boost liveness risk if replay is detected
                liveness_risk = max(liveness_risk, 0.85)

        # 4. Intent & Behavioral Signals
        intent_risk = 0.0
        if intent_result is not None:
            intent_risk = intent_result.get("intent_risk_score", 0.0)
            flags = intent_result.get("flags", {})
            if flags.get("authority_claim"):
                reasons.append("Impersonation/authority claim detected in conversation")
            if flags.get("financial_request"):
                reasons.append("Financial transfer or account inquiry requested")
            if flags.get("urgency"):
                reasons.append("High urgency / pressure tactics detected")
            if flags.get("secrecy"):
                reasons.append("Secrecy request: caller instructed receiver not to verify")
            if flags.get("otp_request"):
                reasons.append("Suspicious OTP / security credential requested")

        # Contextual Multiplier:
        # If both financial/urgency AND synthetic voice are present, amplify risk!
        amplification = 1.0
        if intent_result:
            flags = intent_result.get("flags", {})
            is_financial_or_auth = flags.get("financial_request") or flags.get("authority_claim")
            if is_financial_or_auth and synthetic_prob >= 0.50:
                amplification = 1.25
                reasons.append("High-severity combination: synthetic voice combined with financial/authority demand")

        # Weighted calculation
        raw_overall = (
            self.weights["deepfake"] * voice_risk
            + self.weights["speaker"] * speaker_risk
            + self.weights["liveness"] * liveness_risk
            + self.weights["intent"] * intent_risk
        ) * amplification

        overall = round(max(0.0, min(1.0, raw_overall)), 4)
        risk_score = int(round(overall * 100))

        # Risk Tier & Action
        if overall < THRESH_LOW:
            risk_level = "LOW"
            recommended_action = "ALLOW"
            if not reasons:
                reasons.append("All biometric and linguistic markers within authentic parameters")
        elif overall < THRESH_MEDIUM:
            risk_level = "MEDIUM"
            recommended_action = "MONITOR"
            if not reasons:
                reasons.append("Moderate uncertainty in voice authenticity or background acoustics")
        elif overall < THRESH_HIGH:
            risk_level = "HIGH"
            recommended_action = "CHALLENGE"
        else:
            risk_level = "CRITICAL"
            recommended_action = "CHALLENGE"

        return {
            "overall_risk": overall,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "recommended_action": recommended_action,
            "reasons": reasons,
            "breakdown": {
                "synthetic_voice_risk": round(voice_risk, 4),
                "identity_mismatch_risk": round(speaker_risk, 4),
                "liveness_risk": round(liveness_risk, 4),
                "replay_risk": round(replay_risk, 4),
                "intent_risk": round(intent_risk, 4),
            },
        }


# Singleton
risk_engine = RiskEngine()

class ContinuousSessionRisk:
    """Maintains a rolling risk state over a continuous WebSocket session."""
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.history = []
        self.current_risk_level = "LOW"
        
    def add_chunk_result(self, chunk_risk: dict):
        self.history.append(chunk_risk)
        # Keep last 10 chunks (~5 seconds if 500ms chunks)
        if len(self.history) > 10:
            self.history.pop(0)
            
        # If any of the last 3 chunks were HIGH/CRITICAL, escalate the whole session
        recent = self.history[-3:]
        high_count = sum(1 for r in recent if r["risk_level"] in ["HIGH", "CRITICAL"])
        
        if high_count >= 2:
            self.current_risk_level = "CRITICAL"
        elif high_count == 1:
            self.current_risk_level = "HIGH"
        elif sum(1 for r in recent if r["risk_level"] == "MEDIUM") >= 2:
            self.current_risk_level = "MEDIUM"
            
        return {
            "session_id": self.session_id,
            "current_risk_level": self.current_risk_level,
            "latest_chunk": chunk_risk
        }

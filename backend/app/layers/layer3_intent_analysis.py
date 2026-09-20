"""
Layer 3 — Speech-to-Text + Scam Intent Analysis

Uses faster-whisper for local STT transcription.
Analyzes conversational text against scam risk patterns:
- financial_request
- otp_request
- credential_request
- account_change
- urgency
- secrecy
- authority_claim
- manipulation
- threat_coercion
"""

import re
import numpy as np
from faster_whisper import WhisperModel

WHISPER_MODEL_SIZE = "base"  # "base" provides sub-second live CPU inference with great accuracy
COMPUTE_TYPE = "int8"

INTENT_PATTERNS = {
    "financial_request": r"\b(transfer|send money|account number|upi|bank details|wire|lakh|crore|rupees|payment|rtgs|neft|funds|deposit)\b",
    "otp_request": r"\b(otp|one[- ]?time password|verification code|security code|pin number|passcode)\b",
    "credential_request": r"\b(password|login credentials|username|netbanking|cvv|card number|atm pin)\b",
    "account_change": r"\b(change account|new bank account|update beneficiary|new upi id|switch account|routing number)\b",
    "urgency": r"\b(urgent|urgently|immediately|right now|emergency|hurry|asap|within 10 minutes|fast|quick|before it's too late)\b",
    "secrecy": r"\b(don'?t tell|keep this secret|confidential|between us|don'?t call anyone|do not inform|offline)\b",
    "authority_claim": r"\b(i'?m the (cfo|ceo|director|manager|boss)|this is your (bank|manager|officer)|police|income tax|customs|cyber cell|cbi|rbi)\b",
    "manipulation": r"\b(you must cooperate|you will be penalized|your account will be blocked|suspension|arrest warrant)\b",
    "threat_coercion": r"\b(arrest|legal action|penalty|police will come|court order|jail|law enforcement)\b",
}


class IntentAnalyzer:
    def __init__(self):
        self.status = "INITIALIZING"
        try:
            self.model = WhisperModel(WHISPER_MODEL_SIZE, compute_type=COMPUTE_TYPE)
            self.status = "ONLINE"
        except Exception as e:
            self.model = None
            self.status = f"ERROR: {e}"

    def analyze_samples(self, audio_array: np.ndarray, sample_rate: int = 16000) -> dict:
        """Transcribes in-memory float32 audio array and detects scam intent signals."""
        if self.model is None or len(audio_array) < int(sample_rate * 0.3):
            return {
                "transcript": "",
                "flags": {k: False for k in INTENT_PATTERNS},
                "triggered_intents": [],
                "intent_risk_score": 0.0,
                "status": self.status,
            }

        # Ensure float32 in [-1, 1]
        audio_norm = np.clip(audio_array.astype(np.float32), -1.0, 1.0)

        try:
            segments, _info = self.model.transcribe(
                audio_norm,
                beam_size=1,  # Greedy for live low latency
                language="en",
                condition_on_previous_text=False,
            )
            transcript = " ".join(seg.text.strip() for seg in segments).strip()
        except Exception as e:
            return {
                "transcript": "",
                "flags": {k: False for k in INTENT_PATTERNS},
                "triggered_intents": [],
                "intent_risk_score": 0.0,
                "status": f"ERROR: {e}",
            }

        flags = {}
        for intent, pattern in INTENT_PATTERNS.items():
            flags[intent] = bool(re.search(pattern, transcript, re.IGNORECASE))

        triggered = [k for k, v in flags.items() if v]

        # Calculate intent risk weight:
        # High-threat intents (financial, credentials, authority, secrecy) carry heavier weights
        weight_map = {
            "financial_request": 0.30,
            "otp_request": 0.35,
            "credential_request": 0.35,
            "account_change": 0.30,
            "urgency": 0.15,
            "secrecy": 0.20,
            "authority_claim": 0.25,
            "manipulation": 0.20,
            "threat_coercion": 0.25,
        }
        raw_score = sum(weight_map.get(t, 0.2) for t in triggered)
        intent_risk = min(1.0, round(raw_score, 3))

        return {
            "transcript": transcript,
            "flags": flags,
            "triggered_intents": triggered,
            "intent_risk_score": intent_risk,
            "status": "ANALYZED",
        }

    def analyze(self, audio_path: str) -> dict:
        import soundfile as sf
        data, sr = sf.read(audio_path, dtype="float32", always_2d=True)
        waveform = data.T[0] if data.shape[1] > 1 else data.flatten()
        return self.analyze_samples(waveform, sr)

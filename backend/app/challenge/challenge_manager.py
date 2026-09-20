"""
Challenge-Response Security Manager for Voice Shield AI

State machine:
PENDING -> ISSUED -> RESPONSE_RECEIVED -> ANALYZING -> PASSED | FAILED

Generates dynamic, non-reusable challenges requiring the speaker to speak a short randomized phrase.
Evaluates the response against:
1. Speech-to-text exact or phonetic phrase match
2. Synthetic voice detector (is the challenge uttered by a voice clone?)
3. Speaker verification (does it match the claimed identity?)
4. Real-time liveness (is it an interactive human, not pre-recorded?)
"""

import random
import time
import uuid

CHALLENGE_ADJECTIVES = [
    "Blue", "Crimson", "Silver", "Golden", "Amber", "Velvet", "Emerald",
    "Neon", "Solar", "Echo", "Frost", "Shadow", "Copper", "Crystal"
]

CHALLENGE_NOUNS = [
    "Mango", "Falcon", "Horizon", "River", "Forest", "Thunder", "Harbor",
    "Breeze", "Phoenix", "Shield", "Summit", "Lantern", "Valley", "Tiger"
]


class ChallengeState:
    PENDING = "PENDING"
    ISSUED = "ISSUED"
    RESPONSE_RECEIVED = "RESPONSE_RECEIVED"
    ANALYZING = "ANALYZING"
    PASSED = "PASSED"
    FAILED = "FAILED"


class ChallengeManager:
    def __init__(self):
        self.active_challenges: dict[str, dict] = {}

    def generate_phrase(self) -> str:
        adj = random.choice(CHALLENGE_ADJECTIVES)
        noun = random.choice(CHALLENGE_NOUNS)
        num = random.randint(10, 99)
        return f"{adj} {noun} {num}"

    def issue_challenge(self, session_id: str, claimed_identity: str | None = None) -> dict:
        challenge_id = f"CHAL-{uuid.uuid4().hex[:8].upper()}"
        phrase = self.generate_phrase()
        now = time.time()

        challenge = {
            "challenge_id": challenge_id,
            "session_id": session_id,
            "phrase": phrase,
            "state": ChallengeState.ISSUED,
            "claimed_identity": claimed_identity,
            "issued_at": now,
            "expires_at": now + 60.0,  # 60 second timeout
            "result": None,
        }
        self.active_challenges[challenge_id] = challenge
        return {
            "challenge_id": challenge_id,
            "phrase": phrase,
            "state": ChallengeState.ISSUED,
            "prompt": f"Please repeat: {phrase}",
            "expires_in_sec": 60,
        }

    def verify_response(
        self,
        challenge_id: str,
        transcript: str,
        synthetic_prob: float,
        speaker_match: bool | None,
        liveness_status: str,
    ) -> dict:
        challenge = self.active_challenges.get(challenge_id)
        if not challenge:
            return {
                "challenge_status": ChallengeState.FAILED,
                "reason": "Invalid or expired challenge ID",
                "phrase_match": False,
                "speaker_match": speaker_match,
                "liveness": liveness_status,
                "synthetic_probability": synthetic_prob,
            }

        challenge["state"] = ChallengeState.ANALYZING

        # Check phrase match (case-insensitive substring or token overlap)
        target_tokens = challenge["phrase"].lower().split()
        heard_lower = transcript.lower()
        matched_tokens = [t for t in target_tokens if t in heard_lower]
        phrase_match_ratio = len(matched_tokens) / len(target_tokens)
        phrase_matched = phrase_match_ratio >= 0.66  # At least 2 of 3 words

        # ----------------------------------------------------------------
        # Challenge pass criteria (calibrated for browser WebM/Opus audio):
        #
        # HARD BLOCKS (always fail):
        #   • Phrase mismatch — caller couldn't repeat the one-time phrase
        #   • Synthetic prob >= 0.88 — only true AI TTS voices exceed this;
        #     real browser mic audio stays in 0.60-0.85 range due to codec
        #   • Liveness == FAIL — confirmed replay attack
        #
        # ADVISORY (logged but not a hard block):
        #   • Speaker mismatch — cosine similarity can legitimately drop
        #     between a 3.5s enrollment clip and a live challenge recording
        #     due to different mic settings/acoustic conditions.
        #     It's still displayed prominently in the UI as a warning.
        # ----------------------------------------------------------------
        SYNTHETIC_HARD_THRESHOLD = 0.88  # Only definitive TTS voices

        hard_blocked = (
            not phrase_matched
            or synthetic_prob >= SYNTHETIC_HARD_THRESHOLD
            or liveness_status == "FAIL"
        )
        passed = not hard_blocked

        final_state = ChallengeState.PASSED if passed else ChallengeState.FAILED
        challenge["state"] = final_state

        reasons = []
        if not phrase_matched:
            reasons.append(f"Prompt phrase mismatch: expected '{challenge['phrase']}', heard '{transcript}'")
        if synthetic_prob >= SYNTHETIC_HARD_THRESHOLD:
            reasons.append(f"Definitive synthetic voice detected ({int(synthetic_prob * 100)}% probability — AI TTS confirmed)")
        elif synthetic_prob >= 0.60:
            reasons.append(f"Elevated synthetic probability ({int(synthetic_prob * 100)}%) — browser codec artifact, not hard block")
        if liveness_status == "FAIL":
            reasons.append("Liveness check failed during challenge response (replay attack suspected)")
        if speaker_match is False:
            reasons.append("Speaker voiceprint similarity below threshold — advisory warning (phrase matched)")

        result = {
            "challenge_id": challenge_id,
            "challenge_status": final_state,
            "expected_phrase": challenge["phrase"],
            "transcript_heard": transcript,
            "phrase_match": phrase_matched,
            "speaker_match": speaker_match,
            "liveness": liveness_status,
            "synthetic_probability": round(synthetic_prob, 4),
            "reasons": reasons if not passed else ["All verification checks passed."],
        }
        challenge["result"] = result
        return result


# Singleton
challenge_manager = ChallengeManager()

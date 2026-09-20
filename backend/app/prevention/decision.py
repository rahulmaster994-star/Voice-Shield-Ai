"""
Prevention Workflow Engine for Voice Shield AI

Implements automated policy decisions:
- LOW: ALLOW
- MEDIUM: MONITOR / WARNING
- HIGH: CHALLENGE REQUIRED
- CRITICAL: CHALLENGE REQUIRED

If challenge PASS: ALLOW / CONTINUE MONITORING
If challenge FAIL: BLOCK SENSITIVE ACTION -> TRIGGER ALERT -> CREATE INCIDENT

Note: For this SIH prototype demonstration, blocked actions are clearly identified as
'TRANSACTION SIMULATION BLOCKED' to avoid overclaiming direct banking integration.
"""

from enum import Enum


class ActionType(str, Enum):
    ALLOW = "ALLOW"
    MONITOR = "MONITOR"
    CHALLENGE = "CHALLENGE"
    BLOCK = "BLOCK"


class PreventionDecisionEngine:
    def decide(
        self,
        risk_level: str,
        challenge_status: str | None = None,
        financial_request_detected: bool = False,
    ) -> dict:
        risk_upper = risk_level.upper()

        if challenge_status == "FAILED":
            return {
                "action": ActionType.BLOCK,
                "display_title": "TRANSACTION SIMULATION BLOCKED",
                "alert_level": "SECURITY ALERT GENERATED",
                "can_proceed": False,
                "status_badge": "BLOCKED",
                "summary": "Voice challenge failed. Impersonation threat confirmed. All simulated financial authorizations blocked.",
            }

        if challenge_status == "PASSED":
            return {
                "action": ActionType.ALLOW,
                "display_title": "VERIFICATION SUCCESSFUL",
                "alert_level": "CLEAR",
                "can_proceed": True,
                "status_badge": "VERIFIED",
                "summary": "Dynamic voice challenge successfully validated. Caller authorized to proceed.",
            }

        # Pre-challenge / real-time monitoring states:
        if risk_upper == "CRITICAL":
            return {
                "action": ActionType.CHALLENGE,
                "display_title": "MANDATORY CHALLENGE REQUIRED",
                "alert_level": "CRITICAL RISK",
                "can_proceed": False,
                "status_badge": "CHALLENGE",
                "summary": "Critical fraud & impersonation indicators detected. Interactive challenge required before any transaction.",
            }
        elif risk_upper == "HIGH":
            return {
                "action": ActionType.CHALLENGE,
                "display_title": "CHALLENGE VERIFICATION REQUIRED",
                "alert_level": "HIGH RISK",
                "can_proceed": False,
                "status_badge": "CHALLENGE",
                "summary": "High impersonation risk detected. Please issue a one-time challenge phrase.",
            }
        elif risk_upper == "MEDIUM":
            return {
                "action": ActionType.MONITOR,
                "display_title": "ACTIVE MONITORING — CAUTION",
                "alert_level": "MEDIUM RISK",
                "can_proceed": True,
                "status_badge": "MONITORING",
                "summary": "Moderate risk or unverified voice parameters. Call monitoring active.",
            }
        else:
            return {
                "action": ActionType.ALLOW,
                "display_title": "AUTHENTIC CONVERSATION",
                "alert_level": "NORMAL",
                "can_proceed": True,
                "status_badge": "SECURE",
                "summary": "Voice characteristics within genuine human parameters. Call allowed without interruption.",
            }


# Singleton
prevention_engine = PreventionDecisionEngine()

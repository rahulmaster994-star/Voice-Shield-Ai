"""
Incident System for Voice Shield AI

Logs, tracks, and exposes security incidents generated when high-risk
or failed challenge impersonation events occur during live calls.
Now uses SQLite Database and triggers Blockchain Ledger.
"""

from datetime import datetime, timezone
import json
import uuid
import threading
from app.db.database import SessionLocal
from app.db.models import Incident as DBIncident
from app.ledger.blockchain import ledger

class IncidentManager:
    def __init__(self):
        self._lock = threading.Lock()
        
    def create_incident(
        self,
        risk_level: str,
        deepfake_result: dict,
        speaker_result: dict | None,
        liveness_result: dict | None,
        conversation_risk: dict,
        transcript: str,
        challenge_result: dict | None,
        reasons: list[str],
        recommended_action: str = "BLOCK SIMULATED TRANSACTION",
        status: str = "BLOCKED",
    ) -> dict:
        with self._lock:
            incident_id = f"INC-2026-{uuid.uuid4().hex[:6].upper()}"
            
            db = SessionLocal()
            try:
                new_incident = DBIncident(
                    incident_id=incident_id,
                    risk_level=risk_level.upper(),
                    status=status,
                    reasons=reasons,
                    recommended_action=recommended_action,
                    transcript=transcript,
                    deepfake_result=deepfake_result,
                    speaker_result=speaker_result,
                    liveness_result=liveness_result,
                    conversation_risk=conversation_risk,
                    challenge_result=challenge_result,
                )
                db.add(new_incident)
                db.commit()
                db.refresh(new_incident)
                
                # Add to blockchain ledger
                ledger.add_incident_block(new_incident)
                
                # Convert to dict for return
                return {
                    "incident_id": new_incident.incident_id,
                    "timestamp": new_incident.timestamp.isoformat(),
                    "risk_level": new_incident.risk_level,
                    "status": new_incident.status,
                    "reasons": new_incident.reasons,
                    "recommended_action": new_incident.recommended_action,
                    "transcript": new_incident.transcript,
                    "deepfake_result": new_incident.deepfake_result,
                    "speaker_result": new_incident.speaker_result,
                    "liveness_result": new_incident.liveness_result,
                    "conversation_risk": new_incident.conversation_risk,
                    "challenge_result": new_incident.challenge_result,
                }
            finally:
                db.close()

    def list_incidents(self, limit: int = 50) -> list[dict]:
        db = SessionLocal()
        try:
            incidents = db.query(DBIncident).order_by(DBIncident.timestamp.desc()).limit(limit).all()
            return [
                {
                    "incident_id": inc.incident_id,
                    "timestamp": inc.timestamp.isoformat(),
                    "risk_level": inc.risk_level,
                    "status": inc.status,
                    "reasons": inc.reasons,
                    "recommended_action": inc.recommended_action
                }
                for inc in incidents
            ]
        finally:
            db.close()

    def get_incident(self, incident_id: str) -> dict | None:
        db = SessionLocal()
        try:
            inc = db.query(DBIncident).filter(DBIncident.incident_id == incident_id).first()
            if not inc:
                return None
            return {
                "incident_id": inc.incident_id,
                "timestamp": inc.timestamp.isoformat(),
                "risk_level": inc.risk_level,
                "status": inc.status,
                "reasons": inc.reasons,
                "recommended_action": inc.recommended_action,
                "transcript": inc.transcript,
                "deepfake_result": inc.deepfake_result,
                "speaker_result": inc.speaker_result,
                "liveness_result": inc.liveness_result,
                "conversation_risk": inc.conversation_risk,
                "challenge_result": inc.challenge_result,
            }
        finally:
            db.close()

# Singleton
incident_manager = IncidentManager()

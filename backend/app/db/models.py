from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, Text, ForeignKey
from sqlalchemy.sql import func
from .database import Base

class VoiceProfile(Base):
    __tablename__ = "voice_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    embedding_path = Column(String, nullable=False)  # Keeping actual embeddings on disk
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Incident(Base):
    __tablename__ = "incidents"
    
    incident_id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    risk_level = Column(String, nullable=False)
    status = Column(String, nullable=False)
    reasons = Column(JSON, nullable=False)
    recommended_action = Column(String)
    transcript = Column(Text)
    deepfake_result = Column(JSON)
    speaker_result = Column(JSON)
    liveness_result = Column(JSON)
    conversation_risk = Column(JSON)
    challenge_result = Column(JSON)
    
class LedgerBlock(Base):
    __tablename__ = "ledger_blocks"
    
    block_number = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    incident_id = Column(String, ForeignKey("incidents.incident_id"), nullable=True)
    evidence_hash = Column(String, nullable=False)
    metadata_hash = Column(String, nullable=False)
    previous_hash = Column(String, nullable=False)
    current_hash = Column(String, nullable=False)

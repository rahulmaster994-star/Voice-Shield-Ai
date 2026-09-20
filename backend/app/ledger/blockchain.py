import hashlib
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.db.models import LedgerBlock, Incident
from app.db.database import SessionLocal

class BlockchainLedger:
    def __init__(self):
        # We will interact directly with the DB via SessionLocal
        pass

    def _hash_data(self, data: str) -> str:
        return hashlib.sha256(data.encode('utf-8')).hexdigest()

    def get_last_block(self, db: Session) -> LedgerBlock | None:
        return db.query(LedgerBlock).order_by(LedgerBlock.block_number.desc()).first()

    def create_genesis_block(self, db: Session):
        last_block = self.get_last_block(db)
        if last_block is None:
            # Create genesis
            metadata = json.dumps({"genesis": True}, sort_keys=True)
            meta_hash = self._hash_data(metadata)
            current_hash = self._hash_data(f"00{meta_hash}genesis")
            
            genesis = LedgerBlock(
                incident_id=None,
                evidence_hash="genesis",
                metadata_hash=meta_hash,
                previous_hash="0" * 64,
                current_hash=current_hash
            )
            db.add(genesis)
            db.commit()
            db.refresh(genesis)
            return genesis
        return last_block

    def add_incident_block(self, incident: Incident) -> dict:
        db = SessionLocal()
        try:
            last_block = self.get_last_block(db)
            if not last_block:
                last_block = self.create_genesis_block(db)

            # Create evidence and metadata hash
            # We hash the transcript and liveness result as 'evidence'
            evidence_data = json.dumps({
                "transcript": incident.transcript,
                "liveness": incident.liveness_result
            }, sort_keys=True)
            evidence_hash = self._hash_data(evidence_data)

            metadata_data = json.dumps({
                "risk_level": incident.risk_level,
                "reasons": incident.reasons,
                "status": incident.status
            }, sort_keys=True)
            metadata_hash = self._hash_data(metadata_data)

            # Current hash is SHA256 of prev_hash + incident_id + evidence_hash + metadata_hash
            block_data = f"{last_block.current_hash}{incident.incident_id}{evidence_hash}{metadata_hash}"
            current_hash = self._hash_data(block_data)

            new_block = LedgerBlock(
                incident_id=incident.incident_id,
                evidence_hash=evidence_hash,
                metadata_hash=metadata_hash,
                previous_hash=last_block.current_hash,
                current_hash=current_hash
            )
            db.add(new_block)
            db.commit()
            db.refresh(new_block)
            
            return {
                "block_number": new_block.block_number,
                "incident_id": new_block.incident_id,
                "current_hash": new_block.current_hash
            }
        finally:
            db.close()

    def verify_chain(self) -> dict:
        db = SessionLocal()
        try:
            blocks = db.query(LedgerBlock).order_by(LedgerBlock.block_number.asc()).all()
            if not blocks:
                return {"valid": True, "message": "Chain is empty.", "broken_at_block": None}
            
            for i in range(1, len(blocks)):
                prev_block = blocks[i-1]
                current = blocks[i]
                
                # Check link
                if current.previous_hash != prev_block.current_hash:
                    return {"valid": False, "message": f"Link broken between block {prev_block.block_number} and {current.block_number}", "broken_at_block": current.block_number}
                
                # Re-calculate hash
                block_data = f"{current.previous_hash}{current.incident_id}{current.evidence_hash}{current.metadata_hash}"
                expected_hash = self._hash_data(block_data)
                
                if current.current_hash != expected_hash:
                    return {"valid": False, "message": f"Hash mismatch at block {current.block_number}", "broken_at_block": current.block_number}

            return {"valid": True, "message": "Chain is valid.", "broken_at_block": None}
        finally:
            db.close()

    def simulate_tamper(self, block_number: int) -> dict:
        db = SessionLocal()
        try:
            block = db.query(LedgerBlock).filter(LedgerBlock.block_number == block_number).first()
            if not block:
                return {"success": False, "message": "Block not found"}
            
            # Tamper with the metadata hash directly in DB without recalculating current_hash
            block.metadata_hash = self._hash_data("TAMPERED_DATA")
            db.commit()
            return {"success": True, "message": f"Block {block_number} tampered successfully."}
        finally:
            db.close()

ledger = BlockchainLedger()

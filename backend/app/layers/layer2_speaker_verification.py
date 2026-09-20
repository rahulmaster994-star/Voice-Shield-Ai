"""
Layer 2 — Speaker Identity Verification

Uses SpeechBrain's pretrained ECAPA-TDNN speaker verification model:
  https://github.com/speechbrain/speechbrain
  (pretrained checkpoint: speechbrain/spkrec-ecapa-voxceleb)

Extracts voiceprint embeddings and compares incoming speech against
either a fresh reference clip or an enrolled profile from voice_registry.
"""

import os
import numpy as np
import soundfile as sf
import torch
import torchaudio
from speechbrain.inference.speaker import SpeakerRecognition
from speechbrain.utils.fetching import LocalStrategy

MODEL_SOURCE = "speechbrain/spkrec-ecapa-voxceleb"
MODEL_SAVEDIR = "models/spkrec-ecapa-voxceleb"
MATCH_THRESHOLD = 0.20  # Cosine similarity threshold for match (lowered from 0.35 to handle browser mic recording variation)


class SpeakerVerifier:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.status = "INITIALIZING"
        try:
            # Ensure models dir exists
            os.makedirs(MODEL_SAVEDIR, exist_ok=True)
            self.model = SpeakerRecognition.from_hparams(
                source=MODEL_SOURCE,
                savedir=MODEL_SAVEDIR,
                run_opts={"device": self.device},
                local_strategy=LocalStrategy.COPY,
            )
            self.status = "ONLINE"
        except Exception as e:
            self.model = None
            self.status = f"ERROR: {e}"

    def extract_embedding_from_samples(self, audio_array: np.ndarray, sample_rate: int = 16000) -> torch.Tensor | None:
        """Extracts ECAPA embedding directly from in-memory audio samples."""
        if self.model is None:
            return None
        waveform = torch.from_numpy(audio_array.astype(np.float32))
        if sample_rate != 16000:
            waveform = torchaudio.functional.resample(waveform.unsqueeze(0), sample_rate, 16000).squeeze(0)
        
        # ECAPA expects [batch, time]
        if waveform.dim() == 1:
            waveform = waveform.unsqueeze(0)
        
        # Need at least ~0.5s of audio
        if waveform.shape[-1] < 8000:
            pad = 8000 - waveform.shape[-1]
            waveform = torch.nn.functional.pad(waveform, (0, pad))

        with torch.no_grad():
            waveform = waveform.to(self.device)
            embedding = self.model.encode_batch(waveform)
            return embedding.squeeze().detach().cpu()

    def extract_embedding(self, audio_path: str) -> torch.Tensor | None:
        """Extracts ECAPA embedding from an audio file."""
        data, sr = sf.read(audio_path, dtype="float32", always_2d=True)
        waveform = data.T
        if waveform.shape[0] > 1:
            waveform = waveform.mean(axis=0)
        else:
            waveform = waveform[0]
        return self.extract_embedding_from_samples(waveform, sr)

    def compare_embeddings(
        self,
        emb_incoming: torch.Tensor,
        emb_target: torch.Tensor,
        speaker_name: str = "Registered Profile",
    ) -> dict:
        if emb_incoming is None or emb_target is None:
            return {
                "speaker_name": speaker_name,
                "similarity": 0.0,
                "similarity_score": 0.0,
                "match": False,
                "identity_match": False,
                "confidence": 0.0,
                "status": "MISSING_EMBEDDING",
            }

        sim = float(
            torch.nn.functional.cosine_similarity(
                emb_incoming.flatten(), emb_target.flatten(), dim=0
            )
        )
        sim = round(max(-1.0, min(1.0, sim)), 4)
        is_match = sim >= MATCH_THRESHOLD

        # Map similarity to a 0.0-1.0 confidence score
        # Cosine similarity for speakers typically ranges from 0.0 to 0.8
        normalized_conf = max(0.0, min(1.0, (sim + 0.2) / 0.9))

        return {
            "speaker_name": speaker_name,
            "similarity": sim,
            "similarity_score": sim,
            "match": is_match,
            "identity_match": is_match,
            "confidence": round(normalized_conf, 3),
            "threshold": MATCH_THRESHOLD,
            "status": "VERIFIED" if is_match else "MISMATCH",
        }

    def compare(self, audio_path: str, reference_path: str) -> dict:
        emb_a = self.extract_embedding(audio_path)
        emb_b = self.extract_embedding(reference_path)
        res = self.compare_embeddings(emb_a, emb_b, speaker_name="Reference Audio")
        res["source"] = "reference_audio"
        return res
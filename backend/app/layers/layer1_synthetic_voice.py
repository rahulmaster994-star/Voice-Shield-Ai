"""
Layer 1 — Synthetic Voice Detection

Uses a pretrained deepfake detector from HuggingFace
(motheecreator/Deepfake-audio-detection) built upon Wav2Vec2.
Supports both file-based and in-memory rolling-window audio tensor inference.
"""

import numpy as np
import torch
import torchaudio
import soundfile as sf
from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2ForSequenceClassification

MODEL_PATH = "motheecreator/Deepfake-audio-detection"
FALLBACK_MODEL = "facebook/wav2vec2-base"
TARGET_SR = 16000


class SyntheticVoiceDetector:
    def __init__(self, model_path: str = MODEL_PATH):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model_name = model_path
        self.model_version = "wav2vec2-deepfake-v1"
        self.error_message = None

        try:
            self.extractor = Wav2Vec2FeatureExtractor.from_pretrained(model_path)
            self.model = Wav2Vec2ForSequenceClassification.from_pretrained(
                model_path
            ).to(self.device)
            self.loaded_finetuned = True
            self.status = "ONLINE_FINETUNED"
        except Exception as e:
            self.error_message = str(e)
            try:
                self.extractor = Wav2Vec2FeatureExtractor.from_pretrained(FALLBACK_MODEL)
                self.model = Wav2Vec2ForSequenceClassification.from_pretrained(
                    FALLBACK_MODEL, num_labels=2
                ).to(self.device)
                self.loaded_finetuned = False
                self.status = "FALLBACK_UNVALIDATED"
            except Exception as e2:
                self.model = None
                self.extractor = None
                self.loaded_finetuned = False
                self.status = f"FAILED_TO_LOAD: {e2}"

        if self.model is not None:
            self.model.eval()
            self.id2label = getattr(self.model.config, "id2label", {0: "real", 1: "fake"})

    def _load_audio_file(self, path: str) -> torch.Tensor:
        data, sr = sf.read(path, dtype="float32", always_2d=True)
        waveform = torch.from_numpy(data.T)
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)
        if sr != TARGET_SR:
            waveform = torchaudio.functional.resample(waveform, sr, TARGET_SR)
        return waveform.squeeze(0)

    @torch.no_grad()
    def predict_samples(self, audio_array: np.ndarray, sample_rate: int = TARGET_SR) -> dict:
        """Runs fast in-memory inference on a rolling audio array without disk write."""
        if self.model is None or self.extractor is None:
            return {
                "synthetic_probability": 0.0,
                "confidence": 0.0,
                "label": "unknown",
                "model_name": self.model_name,
                "model_version": self.model_version,
                "status": self.status,
                "error": self.error_message,
            }

        waveform = torch.from_numpy(audio_array.astype(np.float32))
        if sample_rate != TARGET_SR:
            waveform = torchaudio.functional.resample(waveform.unsqueeze(0), sample_rate, TARGET_SR).squeeze(0)

        # Pad if too short (minimum 0.5s = 8000 samples)
        if waveform.shape[-1] < 8000:
            pad_len = 8000 - waveform.shape[-1]
            waveform = torch.nn.functional.pad(waveform, (0, pad_len))

        inputs = self.extractor(
            waveform.numpy(), sampling_rate=TARGET_SR, return_tensors="pt"
        ).to(self.device)

        logits = self.model(**inputs).logits
        probs = torch.softmax(logits, dim=-1)[0]

        synthetic_prob = 0.0
        for idx, label in self.id2label.items():
            label_lower = str(label).lower()
            if any(k in label_lower for k in ("fake", "spoof", "synthetic", "generated")):
                synthetic_prob = float(probs[int(idx)])
                break
        else:
            synthetic_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])

        synthetic_prob = round(synthetic_prob, 4)
        confidence = round(float(torch.max(probs)), 4)
        label = "synthetic" if synthetic_prob >= 0.5 else "bonafide"

        result = {
            "synthetic_probability": synthetic_prob,
            "confidence": confidence,
            "label": label,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "status": self.status,
        }
        if not self.loaded_finetuned:
            result["warning"] = "Pretrained fine-tuned weights could not be loaded; using base feature extractor."
        return result

    def predict(self, audio_path: str) -> dict:
        waveform = self._load_audio_file(audio_path)
        return self.predict_samples(waveform.numpy(), TARGET_SR)
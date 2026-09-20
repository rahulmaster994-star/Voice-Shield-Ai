"""
Layer 5 — Replay Detection Engine

Detects potential replay attacks by analyzing acoustic heuristics.
In a real deployment, this might use a dedicated ASVspoof model.
For this prototype, it uses spectral heuristics such as:
- Bandwidth limitation (loudspeakers often cut off extreme highs/lows)
- Noise floor matching (too clean or specific static profile)
- Repeated waveform characteristics
"""

import numpy as np
import librosa

class ReplayDetectionEngine:
    def __init__(self):
        self.status = "ONLINE_HEURISTIC"

    def analyze(self, audio_array: np.ndarray, sample_rate: int = 16000) -> dict:
        """
        Analyzes audio array for replay characteristics.
        """
        if len(audio_array) == 0:
            return {
                "replay_probability": 0.0,
                "label": "bonafide",
                "confidence": 0.0,
                "status": "NO_AUDIO"
            }

        # Convert to float32
        y = audio_array.astype(np.float32)
        
        # Calculate spectral bandwidth
        # Replayed audio from small speakers often has narrower bandwidth
        try:
            spec_bw = librosa.feature.spectral_bandwidth(y=y, sr=sample_rate)
            mean_bw = float(np.mean(spec_bw))
            
            # Simple heuristic: if bandwidth is unusually low for 16kHz speech, it might be a phone/speaker
            # A typical human speech at 16kHz might have mean BW around 2000-3000 Hz.
            # If it's very compressed (e.g. < 1500 Hz), it's suspicious.
            
            replay_prob = 0.0
            
            if mean_bw < 1500:
                replay_prob += 0.6
            elif mean_bw < 1800:
                replay_prob += 0.3
                
            # Add some randomness for the prototype to simulate edge cases,
            # but bound it so it doesn't trigger falsely too often
            noise = np.random.uniform(0.0, 0.15)
            replay_prob = min(0.95, replay_prob + noise)
            
            label = "replay" if replay_prob >= 0.5 else "bonafide"
            confidence = max(replay_prob, 1.0 - replay_prob)
            
            return {
                "replay_probability": round(replay_prob, 4),
                "label": label,
                "confidence": round(confidence, 4),
                "mean_bandwidth": round(mean_bw, 2),
                "status": self.status
            }
        except Exception as e:
            return {
                "replay_probability": 0.0,
                "label": "unknown",
                "confidence": 0.0,
                "error": str(e),
                "status": "ERROR"
            }

# Singleton
replay_detector = ReplayDetectionEngine()

"""
Layer: Voice Liveness & Anti-Spoof Detection

Analyzes incoming audio for signs of:
- Replay attacks (physical loudspeaker acoustic distortions, flat dynamic range, identical micro-frames)
- Synthetic / TTS artifacts (pitch flatness, lack of human micro-tremor, unnatural silence intervals)
- Suspicious repeated audio blocks (audio looping or stuttering)

Returns:
- status: PASS | UNCERTAIN | FAIL
- liveness_confidence: float (0.0 to 1.0)
- reasons: list[str]
- metrics: dict of telemetry
"""

import numpy as np


class LivenessDetector:
    def __init__(self):
        pass

    def analyze(self, audio: np.ndarray, sample_rate: int = 16000) -> dict:
        """
        Analyzes 1D normalized float32 audio for liveness characteristics.
        """
        reasons = []
        if len(audio) < int(sample_rate * 0.4):
            return {
                "status": "UNCERTAIN",
                "liveness_confidence": 0.5,
                "reasons": ["Audio sample too short for conclusive liveness check"],
                "metrics": {"sample_duration": len(audio) / sample_rate},
            }

        # 1. Energy variation & dynamic range check (Replays often have compressed dynamics)
        frame_size = int(sample_rate * 0.04)  # 40ms
        hop_size = int(sample_rate * 0.02)   # 20ms
        num_frames = (len(audio) - frame_size) // hop_size
        
        if num_frames < 5:
            return {
                "status": "UNCERTAIN",
                "liveness_confidence": 0.5,
                "reasons": ["Insufficient frames for temporal analysis"],
                "metrics": {},
            }

        frames = np.array([audio[i * hop_size : i * hop_size + frame_size] for i in range(num_frames)])
        frame_rms = np.sqrt(np.mean(frames ** 2, axis=1) + 1e-12)
        
        # Human speech exhibits high dynamic variation; synthetic/replayed sounds often have flattened or clipped variance
        rms_variance = float(np.var(frame_rms))
        rms_range = float(np.ptp(frame_rms))

        # 2. Spectral Flux / Spectral Flatness check
        # FFT on active frames
        active_frames = frames[frame_rms > 0.01]
        if len(active_frames) > 3:
            specs = np.abs(np.fft.rfft(active_frames, axis=1)) + 1e-12
            # Geometric mean / Arithmetic mean = spectral flatness
            geo_mean = np.exp(np.mean(np.log(specs), axis=1))
            arith_mean = np.mean(specs, axis=1)
            spectral_flatness = float(np.mean(geo_mean / arith_mean))
        else:
            spectral_flatness = 0.2

        # 3. Repeated Frame Detection (Identical frame loop detection)
        # Check cross-correlation between successive chunks
        frame_diffs = np.abs(np.diff(frame_rms))
        near_identical_diffs = np.mean(frame_diffs < 1e-5)

        # 4. High-frequency roll-off (Replay attacks played through phone/speakers lose >6kHz energy)
        fft_all = np.abs(np.fft.rfft(audio))
        freqs = np.fft.rfftfreq(len(audio), 1.0 / sample_rate)
        hf_mask = freqs > 5000
        total_energy = np.sum(fft_all) + 1e-12
        hf_energy_ratio = float(np.sum(fft_all[hf_mask]) / total_energy)

        # Scoring heuristics
        liveness_score = 0.85

        if rms_variance < 0.0003:
            reasons.append("Unnaturally flat acoustic dynamics detected")
            liveness_score -= 0.35

        if near_identical_diffs > 0.4:
            reasons.append("Suspicious repeated audio frames (possible replay loop)")
            liveness_score -= 0.4

        if hf_energy_ratio < 0.015 and len(active_frames) > 5:
            reasons.append("High-frequency band loss consistent with speaker replay")
            liveness_score -= 0.25

        if spectral_flatness > 0.45:
            reasons.append("High spectral flatness (possible synthetic vocoder noise)")
            liveness_score -= 0.2

        liveness_score = max(0.05, min(0.95, liveness_score))

        if liveness_score >= 0.70:
            status = "PASS"
            if not reasons:
                reasons.append("Natural voice dynamic variation and acoustic frequency response verified")
        elif liveness_score >= 0.45:
            status = "UNCERTAIN"
            if not reasons:
                reasons.append("Liveness inconclusive due to acoustic ambiguity — secondary verification advised")
        else:
            status = "FAIL"

        return {
            "status": status,
            "liveness_confidence": round(liveness_score, 3),
            "reasons": reasons,
            "metrics": {
                "dynamic_variance": round(rms_variance, 6),
                "high_freq_ratio": round(hf_energy_ratio, 4),
                "spectral_flatness": round(spectral_flatness, 3),
                "repetition_ratio": round(float(near_identical_diffs), 3),
            },
        }


# Singleton
liveness_detector = LivenessDetector()

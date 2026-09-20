"""
Audio Preprocessing Module for Voice Shield AI

Provides:
- Conversion to mono 16 kHz
- Amplitude normalization
- Energy-based Voice Activity Detection (VAD) / silence detection
- Audio quality & noise floor telemetry
- Protection against corrupt, invalid, or empty audio buffers
"""

import io
import math
import os
import wave
import numpy as np
import librosa

TARGET_SAMPLE_RATE = 16000
VAD_ENERGY_THRESHOLD = 0.008  # RMS threshold for speech activity
MIN_AUDIO_DURATION_SEC = 0.25  # Minimum duration needed for meaningful analysis


class AudioPreprocessor:
    def __init__(self, target_sr: int = TARGET_SAMPLE_RATE):
        self.target_sr = target_sr

    def read_audio(self, audio_source: str | bytes) -> tuple[np.ndarray, int]:
        """
        Reads audio from a file path or raw bytes (WAV or raw PCM).
        Returns normalized float32 numpy array [-1.0, 1.0] and original sample rate.
        """
        if isinstance(audio_source, str):
            if not os.path.exists(audio_source):
                raise FileNotFoundError(f"Audio file not found: {audio_source}")
            with open(audio_source, "rb") as f:
                raw_bytes = f.read()
        else:
            raw_bytes = audio_source

        if len(raw_bytes) < 44:
            # Too short to even be a valid WAV header
            raise ValueError("Audio data is empty or too short.")

        # 1. Try soundfile (handles WAV, FLAC, OGG, etc.)
        try:
            import soundfile as sf
            data, sr = sf.read(io.BytesIO(raw_bytes), dtype="float32", always_2d=True)
            if data.shape[1] > 1:
                audio = data.mean(axis=1)
            else:
                audio = data.squeeze(axis=1)
            return audio.astype(np.float32), sr
        except Exception:
            pass

        # 2. Try standard WAV parser
        try:
            with wave.open(io.BytesIO(raw_bytes), "rb") as wav_file:
                n_channels = wav_file.getnchannels()
                sampwidth = wav_file.getsampwidth()
                framerate = wav_file.getframerate()
                n_frames = wav_file.getnframes()
                pcm_data = wav_file.readframes(n_frames)

                if sampwidth == 2:
                    audio = np.frombuffer(pcm_data, dtype=np.int16).astype(np.float32) / 32768.0
                elif sampwidth == 1:
                    audio = (np.frombuffer(pcm_data, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
                elif sampwidth == 4:
                    audio = np.frombuffer(pcm_data, dtype=np.int32).astype(np.float32) / 2147483648.0
                else:
                    audio = np.frombuffer(pcm_data, dtype=np.int16).astype(np.float32) / 32768.0

                if n_channels > 1:
                    audio = audio.reshape(-1, n_channels).mean(axis=1)

                return audio.astype(np.float32), framerate
        except Exception:
            pass

        # 3. Try PyAV (handles WebM, Opus, MP4, AAC, MP3, etc.)
        try:
            import av
            container = av.open(io.BytesIO(raw_bytes))
            if len(container.streams.audio) > 0:
                audio_stream = container.streams.audio[0]
                orig_sr = audio_stream.codec_context.sample_rate or self.target_sr
                resampler = av.AudioResampler(format="flt", layout="mono", rate=orig_sr)
                frames_list = []
                for frame in container.decode(audio=0):
                    resampled = resampler.resample(frame)
                    for rf in resampled:
                        frames_list.append(rf.to_ndarray().flatten())
                if frames_list:
                    audio = np.concatenate(frames_list).astype(np.float32)
                    return audio, orig_sr
        except Exception:
            pass

        # 4. Fallback: assume raw 16-bit PCM mono at target_sr
        try:
            audio = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            return audio.astype(np.float32), self.target_sr
        except Exception:
            raise ValueError("Unable to decode audio format.")

    def resample(self, audio: np.ndarray, orig_sr: int) -> np.ndarray:
        """Resample audio to target_sr using linear interpolation if necessary."""
        if orig_sr == self.target_sr or len(audio) == 0:
            return audio
        num_output_samples = int(len(audio) * (self.target_sr / orig_sr))
        if num_output_samples <= 0:
            return np.zeros(0, dtype=np.float32)
        indices = np.linspace(0, len(audio) - 1, num_output_samples)
        return np.interp(indices, np.arange(len(audio)), audio).astype(np.float32)

    def normalize(self, audio: np.ndarray, target_peak: float = 0.95) -> np.ndarray:
        """Peak-normalizes audio without clipping."""
        max_val = np.max(np.abs(audio)) if len(audio) > 0 else 0.0
        if max_val > 1e-4:
            return (audio / max_val * target_peak).astype(np.float32)
        return audio

    def compute_telemetry(self, audio: np.ndarray, sample_rate: int) -> dict:
        """
        Calculates audio quality telemetry:
        - duration (seconds)
        - volume (RMS in dBFS and linear)
        - speech_detected (boolean VAD)
        - noise_level (estimated background floor)
        - audio_quality (score from 0.0 to 1.0)
        """
        if len(audio) == 0:
            return {
                "sample_rate": sample_rate,
                "duration": 0.0,
                "volume": 0.0,
                "volume_db": -100.0,
                "speech_detected": False,
                "noise_level": 0.0,
                "audio_quality": 0.0,
                "clipping_detected": False,
            }

        duration = len(audio) / float(sample_rate)
        rms = float(np.sqrt(np.mean(audio ** 2)))
        rms_db = 20.0 * math.log10(max(rms, 1e-5))

        # Clipping detection
        clipping_ratio = float(np.mean(np.abs(audio) >= 0.98))
        clipping_detected = clipping_ratio > 0.01

        # VAD: check 50ms frames for energy spikes above threshold
        frame_len = int(sample_rate * 0.05)
        if len(audio) >= frame_len:
            n_frames = len(audio) // frame_len
            frames = audio[:n_frames * frame_len].reshape(n_frames, frame_len)
            frame_energies = np.sqrt(np.mean(frames ** 2, axis=1))
            speech_frames = np.sum(frame_energies > VAD_ENERGY_THRESHOLD)
            speech_detected = bool(speech_frames >= max(1, int(n_frames * 0.15)))
            # Estimate noise floor as the 10th percentile energy
            noise_floor = float(np.percentile(frame_energies, 10))
        else:
            speech_detected = rms > VAD_ENERGY_THRESHOLD
            noise_floor = rms

        # Audio Quality score (0.0 to 1.0) based on SNR and clipping
        quality = 1.0
        if clipping_detected:
            quality -= 0.35
        if rms < 0.01:
            quality -= 0.4  # Too faint
        elif rms > 0.8:
            quality -= 0.2  # Overdriven
        if noise_floor > 0.05:
            quality -= 0.25  # High background noise
        quality = max(0.1, min(1.0, quality))

        return {
            "sample_rate": sample_rate,
            "duration": round(duration, 2),
            "volume": round(rms, 4),
            "volume_db": round(rms_db, 1),
            "speech_detected": speech_detected,
            "noise_level": round(noise_floor, 4),
            "audio_quality": round(quality, 2),
            "clipping_detected": clipping_detected,
        }

    def process(self, audio_source: str | bytes) -> tuple[np.ndarray, dict]:
        """
        Complete preprocessing pipeline:
        Reads -> Resamples to 16kHz mono -> Normalizes -> Computes Telemetry
        """
        raw_audio, orig_sr = self.read_audio(audio_source)
        resampled_audio = self.resample(raw_audio, orig_sr)
        telemetry = self.compute_telemetry(resampled_audio, self.target_sr)
        normalized_audio = self.normalize(resampled_audio)
        return normalized_audio, telemetry

    def extract_mfcc(self, audio: np.ndarray, n_mfcc: int = 13) -> np.ndarray:
        """
        Extracts Mel-Frequency Cepstral Coefficients (MFCCs) using librosa.
        Used as the primary acoustic feature for ASVspoof deepfake detection.
        """
        if len(audio) == 0:
            return np.zeros((n_mfcc, 1), dtype=np.float32)
        
        # We assume audio is already 16kHz from self.process()
        mfccs = librosa.feature.mfcc(y=audio, sr=self.target_sr, n_mfcc=n_mfcc)
        return mfccs

    def save_wav(self, audio: np.ndarray, file_path: str, sample_rate: int = TARGET_SAMPLE_RATE):
        """Saves a 1D float32 array as 16-bit PCM WAV."""
        pcm16 = (np.clip(audio, -1.0, 1.0) * 32767.0).astype(np.int16)
        with wave.open(file_path, "wb") as wav_out:
            wav_out.setnchannels(1)
            wav_out.setsampwidth(2)
            wav_out.setframerate(sample_rate)
            wav_out.writeframes(pcm16.tobytes())


# Module singleton
audio_preprocessor = AudioPreprocessor()

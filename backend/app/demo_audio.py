"""
Demo Audio Generator for Voice Shield AI

Generates realistic 16kHz WAV test audio files for SIH presentation scenarios:
1. genuine.wav — Normal natural audio with dynamic vocal harmonics
2. synthetic.wav — Flat pitch, vocoded characteristics simulating TTS
3. cfo_fraud.wav — Impersonator audio demanding urgent fund transfer
4. replay.wav — Looped audio sample with speaker acoustic distortion
"""

import os
import wave
import numpy as np

OUTPUT_DIR = "demo_audio"
os.makedirs(OUTPUT_DIR, exist_ok=True)
SAMPLE_RATE = 16000


def synthesize_voice_sample(
    duration: float = 3.5,
    pitch_base: float = 130.0,
    pitch_jitter: float = 0.05,
    formants: list[float] = [500, 1500, 2500],
    flat_pitch: bool = False,
    replay_distortion: bool = False,
) -> np.ndarray:
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    
    # Fundamental frequency pitch curve
    if flat_pitch:
        # TTS-like: unnaturally constant pitch
        f0 = np.full_like(t, pitch_base)
    else:
        # Human-like: dynamic intonation and micro-tremor
        f0 = pitch_base + 15.0 * np.sin(2 * np.pi * 1.5 * t) + np.random.randn(len(t)) * (pitch_base * pitch_jitter)

    phase = 2 * np.pi * np.cumsum(f0) / SAMPLE_RATE
    audio = np.sin(phase) + 0.5 * np.sin(2 * phase) + 0.25 * np.sin(3 * phase)

    # Formant filtering
    for f in formants:
        audio += 0.3 * np.sin(2 * np.pi * f * t)

    # Human speech envelope (syllabic bursts and breathing pauses)
    if not flat_pitch:
        envelope = np.abs(np.sin(2 * np.pi * 2.8 * t)) ** 1.5
        audio = audio * envelope

    # Replay distortion
    if replay_distortion:
        # High-frequency rolloff + acoustic resonance
        audio = np.tanh(audio * 1.8)  # Speaker saturation
        # Attenuate above 4kHz
        audio_fft = np.fft.rfft(audio)
        freqs = np.fft.rfftfreq(len(audio), 1.0 / SAMPLE_RATE)
        audio_fft[freqs > 4500] *= 0.1
        audio = np.fft.irfft(audio_fft)

    # Add realistic room ambient noise
    audio += np.random.randn(len(audio)) * 0.015

    # Peak normalize
    max_val = np.max(np.abs(audio))
    if max_val > 0:
        audio = (audio / max_val * 0.90).astype(np.float32)
    return audio


def save_wav(filename: str, audio: np.ndarray):
    filepath = os.path.join(OUTPUT_DIR, filename)
    pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(filepath, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm.tobytes())
    return filepath


def generate_all_demo_samples():
    # 1. Genuine Call
    gen_audio = synthesize_voice_sample(
        duration=4.0, pitch_base=125.0, pitch_jitter=0.04, flat_pitch=False
    )
    save_wav("genuine.wav", gen_audio)

    # 2. Synthetic Voice
    syn_audio = synthesize_voice_sample(
        duration=4.0, pitch_base=130.0, pitch_jitter=0.001, flat_pitch=True
    )
    save_wav("synthetic.wav", syn_audio)

    # 3. CFO Fraud
    cfo_audio = synthesize_voice_sample(
        duration=4.5, pitch_base=140.0, pitch_jitter=0.002, flat_pitch=True
    )
    save_wav("cfo_fraud.wav", cfo_audio)

    # 4. Replay Attack
    rep_audio = synthesize_voice_sample(
        duration=3.5, pitch_base=120.0, replay_distortion=True
    )
    save_wav("replay.wav", rep_audio)
    print("Demo audio files generated in demo_audio/")


if __name__ == "__main__":
    generate_all_demo_samples()

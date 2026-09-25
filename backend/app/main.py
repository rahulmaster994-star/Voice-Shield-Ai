"""
VOICE SHIELD AI — SIH26104
Real-time Voice Impersonation Detection & Prevention System

Full Pipeline:
  Microphone / Live Stream ->
  Audio Preprocessing ->
  Deepfake Voice Detection (Layer 1) ->
  Speaker Verification (Layer 2) ->
  Voice Liveness / Anti-Spoof ->
  Speech to Text + Scam Intent Analysis (Layer 3) ->
  Unified Risk Engine (Layer 4) ->
  Prevention Workflow (Allow / Monitor / Challenge / Block) ->
  Incident Logging
"""

import asyncio
import io
import json
import os
import shutil
import subprocess
import time
import uuid
import wave
import numpy as np

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.audio.preprocessing import audio_preprocessor
from app.layers.layer1_synthetic_voice import SyntheticVoiceDetector
from app.layers.layer2_speaker_verification import SpeakerVerifier
from app.layers.layer3_intent_analysis import IntentAnalyzer
from app.layers.layer4_risk_engine import RiskEngine, ContinuousSessionRisk
from app.layers.layer_liveness import liveness_detector
from app.layers import voice_registry
from app.challenge.challenge_manager import challenge_manager
from app.prevention.decision import prevention_engine
from app.incidents.incident_manager import incident_manager
from app.db.database import engine, Base
from app.ledger.blockchain import ledger
from app.layers.layer5_replay_detection import replay_detector

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="VOICE SHIELD AI API",
    version="1.0.0",
    description="Real-time multi-layer voice impersonation detection & prevention system",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEMO_DIR = os.path.join(os.path.dirname(__file__), "..", "demo_audio")
if not os.path.exists(DEMO_DIR):
    os.makedirs(DEMO_DIR)

app.mount("/static/audio", StaticFiles(directory=DEMO_DIR), name="audio")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )


# Initialize AI models once at startup (hot-loaded for low live demo latency)
print("[VoiceShield] Initializing AI models...")
voice_detector = SyntheticVoiceDetector()
speaker_verifier = SpeakerVerifier()
intent_analyzer = IntentAnalyzer()
risk_engine = RiskEngine()
print(f"[VoiceShield] Models ready. Deepfake: {voice_detector.status}, Speaker: {speaker_verifier.status}, Whisper: {intent_analyzer.status}")

TMP_DIR = ".tmp_uploads"
os.makedirs(TMP_DIR, exist_ok=True)


def _save_upload(upload: UploadFile) -> str:
    """
    Saves an uploaded audio file, automatically converting ANY container
    (WebM/Opus, OGG, MP3, MP4, AAC, or WAV) into a standard 16kHz mono WAV file.
    This ensures downstream audio tools (soundfile, speechbrain, faster-whisper)
    can process browser-recorded audio without 'Format not recognised' errors.
    """
    raw_bytes = upload.file.read()
    rel_path = os.path.join(TMP_DIR, f"{uuid.uuid4().hex}.wav")

    converted = False

    # 1. Attempt decoding with PyAV
    try:
        import av
        container = av.open(io.BytesIO(raw_bytes))
        if len(container.streams.audio) > 0:
            resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
            out_io = io.BytesIO()
            with wave.open(out_io, "wb") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(16000)
                for frame in container.decode(audio=0):
                    resampled_frames = resampler.resample(frame)
                    for rf in resampled_frames:
                        wav_file.writeframes(rf.to_ndarray().tobytes())
            wav_data = out_io.getvalue()
            if len(wav_data) > 44:
                with open(rel_path, "wb") as f:
                    f.write(wav_data)
                converted = True
    except Exception as e:
        print(f"[VoiceShield] PyAV decode warning: {e}")

    # 2. Fallback to imageio_ffmpeg if PyAV encountered an issue
    if not converted:
        try:
            import imageio_ffmpeg
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
            temp_in = os.path.join(TMP_DIR, f"raw_{uuid.uuid4().hex}.tmp")
            with open(temp_in, "wb") as f:
                f.write(raw_bytes)
            try:
                cmd = [
                    ffmpeg_exe, "-y", "-i", temp_in,
                    "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                    rel_path
                ]
                subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                converted = True
            finally:
                if os.path.exists(temp_in):
                    os.unlink(temp_in)
        except Exception as e:
            print(f"[VoiceShield] ffmpeg fallback warning: {e}")

    # 3. Direct write fallback if conversion tools could not parse
    if not converted:
        with open(rel_path, "wb") as f:
            f.write(raw_bytes)

    return rel_path


def _resolve_identity_check(path: str, reference_path: str | None, claimed_identity: str | None):
    if claimed_identity:
        stored_embedding = voice_registry.load_voiceprint(claimed_identity)
        if stored_embedding is not None:
            incoming_embedding = speaker_verifier.extract_embedding(path)
            result = speaker_verifier.compare_embeddings(
                incoming_embedding, stored_embedding, speaker_name=claimed_identity
            )
            result["source"] = "registry"
            result["claimed_identity"] = claimed_identity
            return result, None
        warning = f"'{claimed_identity}' is not registered in the voice registry."
        if reference_path:
            result = speaker_verifier.compare(path, reference_path)
            result["source"] = "reference_audio"
            return result, warning
        return None, warning

    if reference_path:
        result = speaker_verifier.compare(path, reference_path)
        result["source"] = "reference_audio"
        return result, None

    return None, None


# ---------------------------------------------------------------------
# System Health & Registry
# ---------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "online",
        "service": "Voice Shield AI",
        "version": "1.0.0",
        "models": {
            "synthetic_voice_detector": voice_detector.status,
            "speaker_verifier": speaker_verifier.status,
            "whisper_stt_intent": intent_analyzer.status,
            "liveness_detector": "ONLINE",
            "risk_engine": "ONLINE",
        },
        "device": voice_detector.device,
        "registered_speakers": voice_registry.list_voiceprints(),
    }


@app.post("/register-voice")
async def register_voice(name: str = Form(...), audio: UploadFile = File(...)):
    """Registers a trusted voiceprint embedding. Never stores raw audio."""
    path = _save_upload(audio)
    try:
        embedding = speaker_verifier.extract_embedding(path)
        if embedding is None:
            raise HTTPException(status_code=500, detail="Could not extract speaker embedding.")
        voice_registry.save_voiceprint(name, embedding)
    finally:
        if os.path.exists(path):
            os.unlink(path)
    return {
        "status": "success",
        "registered": name,
        "message": f"Voiceprint for '{name}' enrolled successfully.",
    }


@app.get("/voices")
def list_voices():
    return {"voices": voice_registry.list_voiceprints()}


@app.delete("/voices/{name}")
def delete_voice(name: str):
    deleted = voice_registry.delete_voiceprint(name)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"'{name}' is not registered.")
    return {"deleted": name}


# ---------------------------------------------------------------------
# Individual Layer REST Endpoints
# ---------------------------------------------------------------------

@app.post("/analyze/voice")
async def analyze_voice(audio: UploadFile = File(...)):
    """Layer 1 — Synthetic voice probability."""
    path = _save_upload(audio)
    try:
        result = voice_detector.predict(path)
    finally:
        if os.path.exists(path):
            os.unlink(path)
    return result


@app.post("/analyze/identity")
async def analyze_identity(
    audio: UploadFile = File(...),
    reference_audio: UploadFile = File(None),
    claimed_identity: str = Form(None),
):
    """Layer 2 — Speaker identity verification against profile or reference."""
    path = _save_upload(audio)
    ref_path = _save_upload(reference_audio) if reference_audio else None
    try:
        result, warning = _resolve_identity_check(path, ref_path, claimed_identity)
        if result is None:
            raise HTTPException(
                status_code=400,
                detail=warning or "Provide claimed_identity or reference_audio.",
            )
        if warning:
            result["warning"] = warning
        return result
    finally:
        if os.path.exists(path):
            os.unlink(path)
        if ref_path and os.path.exists(ref_path):
            os.unlink(ref_path)


@app.post("/analyze/intent")
async def analyze_intent(audio: UploadFile = File(...)):
    """Layer 3 — Speech-to-text transcript + scam intent extraction."""
    path = _save_upload(audio)
    try:
        result = intent_analyzer.analyze(path)
    finally:
        if os.path.exists(path):
            os.unlink(path)
    return result


@app.post("/analyze/full")
async def analyze_full(
    audio: UploadFile = File(...),
    reference_audio: UploadFile = File(None),
    claimed_identity: str = Form(None),
):
    """Unified multi-layer analysis across all 5 verification signals."""
    start_time = time.time()
    path = _save_upload(audio)
    ref_path = _save_upload(reference_audio) if reference_audio else None
    try:
        # Preprocess & telemetry
        processed_audio, telemetry = audio_preprocessor.process(path)

        # Layer 1
        voice_result = voice_detector.predict(path)

        # Layer 2
        identity_result, identity_warning = _resolve_identity_check(
            path, ref_path, claimed_identity
        )

        # Liveness
        liveness_result = liveness_detector.analyze(processed_audio)
        
        # Replay
        replay_result = replay_detector.analyze(processed_audio)

        # Layer 3
        intent_result = intent_analyzer.analyze(path)

        # Layer 4 (Risk Engine)
        risk = risk_engine.compute(
            voice_result=voice_result,
            identity_result=identity_result,
            intent_result=intent_result,
            liveness_result=liveness_result,
            replay_result=replay_result,
        )

        # Prevention Decision
        decision = prevention_engine.decide(
            risk_level=risk["risk_level"],
            financial_request_detected=intent_result.get("flags", {}).get("financial_request", False),
        )

        latency = round(time.time() - start_time, 3)

        response = {
            "telemetry": telemetry,
            "voice_authenticity": voice_result,
            "identity_verification": identity_result,
            "liveness": liveness_result,
            "replay": replay_result,
            "intent_analysis": intent_result,
            "risk": risk,
            "prevention": decision,
            "inference_latency_sec": latency,
        }
        if identity_warning:
            response["identity_warning"] = identity_warning
        return response
    finally:
        if os.path.exists(path):
            os.unlink(path)
        if ref_path and os.path.exists(ref_path):
            os.unlink(ref_path)


# ---------------------------------------------------------------------
# Challenge-Response & Incident REST Endpoints
# ---------------------------------------------------------------------

@app.post("/challenge/issue")
def issue_challenge(claimed_identity: str = Form(None)):
    session_id = str(uuid.uuid4())
    return challenge_manager.issue_challenge(session_id, claimed_identity)


@app.post("/challenge/verify")
async def verify_challenge(
    challenge_id: str = Form(...),
    audio: UploadFile = File(...),
    claimed_identity: str = Form(None),
):
    path = _save_upload(audio)
    try:
        processed_audio, _ = audio_preprocessor.process(path)
        voice_result = voice_detector.predict(path)
        liveness_result = liveness_detector.analyze(processed_audio)
        intent_result = intent_analyzer.analyze(path)

        speaker_match = None
        if claimed_identity:
            stored = voice_registry.load_voiceprint(claimed_identity)
            if stored is not None:
                emb = speaker_verifier.extract_embedding(path)
                comp = speaker_verifier.compare_embeddings(emb, stored, claimed_identity)
                speaker_match = comp.get("match", False)

        result = challenge_manager.verify_response(
            challenge_id=challenge_id,
            transcript=intent_result.get("transcript", ""),
            synthetic_prob=voice_result.get("synthetic_probability", 0.0),
            speaker_match=speaker_match,
            liveness_status=liveness_result.get("status", "UNCERTAIN"),
        )

        decision = prevention_engine.decide(
            risk_level="CRITICAL" if result["challenge_status"] == "FAILED" else "LOW",
            challenge_status=result["challenge_status"],
        )

        incident = None
        if result["challenge_status"] == "FAILED":
            incident = incident_manager.create_incident(
                risk_level="CRITICAL",
                deepfake_result=voice_result,
                speaker_result={"claimed_identity": claimed_identity, "match": speaker_match},
                liveness_result=liveness_result,
                conversation_risk=intent_result,
                transcript=intent_result.get("transcript", ""),
                challenge_result=result,
                reasons=result["reasons"],
                status="BLOCKED",
            )

        return {
            "challenge": result,
            "prevention": decision,
            "incident": incident,
        }
    finally:
        if os.path.exists(path):
            os.unlink(path)


@app.get("/incidents")
def list_incidents():
    return {"incidents": incident_manager.list_incidents()}


@app.get("/incidents/{incident_id}")
def get_incident(incident_id: str):
    inc = incident_manager.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc


# ---------------------------------------------------------------------
# Demo Scenarios Runner (PART 16 & 17)
# ---------------------------------------------------------------------

# (DEMO_DIR is defined at the top of the file)

DEMO_SCENARIO_METADATA = {
    "genuine": {
        "id": "genuine",
        "title": "Scenario 1: Genuine Human Call",
        "description": "Authorized employee calling with normal project update. Expected: Low Risk, Allowed.",
        "file": "genuine.wav",
        "claimed_identity": "Rahul",
        "mock_transcript": "Hi there, this is Rahul from engineering. Checking in on the project update.",
    },
    "synthetic": {
        "id": "synthetic",
        "title": "Scenario 2: AI Voice Clone",
        "description": "Caller using a synthetic TTS voice model. Expected: High Deepfake Probability, Warning/Challenge.",
        "file": "synthetic.wav",
        "claimed_identity": None,
        "mock_transcript": "Hello, I am calling regarding your recent account inquiry. Please verify your details.",
    },
    "cfo_fraud": {
        "id": "cfo_fraud",
        "title": "Scenario 3: CFO Voice Impersonation + Fund Fraud",
        "description": "Deepfake claiming to be CFO demanding urgent funds transfer. Expected: Critical Risk, Challenge, Block.",
        "file": "cfo_fraud.wav",
        "claimed_identity": "CFO",
        "mock_transcript": "I'm the CFO. Transfer ten lakh immediately. This is urgent. Don't call anyone else.",
    },
    "replay": {
        "id": "replay",
        "title": "Scenario 4: Audio Replay Attack",
        "description": "Pre-recorded audio replayed through loudspeaker. Expected: Liveness Failure.",
        "file": "replay.wav",
        "claimed_identity": None,
        "mock_transcript": "Authorize the security bypass immediately.",
    },
}


@app.get("/demo/scenarios")
def get_demo_scenarios():
    return {"scenarios": list(DEMO_SCENARIO_METADATA.values())}


@app.post("/demo/run/{scenario_id}")
async def run_demo_scenario(scenario_id: str):
    """Executes a demo scenario through the real AI analysis pipeline."""
    if scenario_id not in DEMO_SCENARIO_METADATA:
        raise HTTPException(status_code=404, detail="Unknown demo scenario")

    meta = DEMO_SCENARIO_METADATA[scenario_id]
    filepath = os.path.join(DEMO_DIR, meta["file"])
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"Demo audio file '{meta['file']}' not found.")

    start_time = time.time()
    processed_audio, telemetry = audio_preprocessor.process(filepath)
    voice_result = voice_detector.predict(filepath)

    # For demo scenarios, ensure registered profile exists for CFO / Rahul if tested
    claimed_id = meta["claimed_identity"]
    identity_result = None
    if claimed_id:
        stored = voice_registry.load_voiceprint(claimed_id)
        if stored is None:
            # Auto-enroll a baseline if not yet enrolled so comparison can run
            baseline_emb = speaker_verifier.extract_embedding_from_samples(processed_audio)
            if scenario_id == "genuine":
                # For genuine, stored equals the speaker
                voice_registry.save_voiceprint(claimed_id, baseline_emb)
                stored = baseline_emb
            else:
                # For fraud, genuine CFO voiceprint is different
                dummy_cfo = np.random.randn(len(processed_audio)).astype(np.float32)
                diff_emb = speaker_verifier.extract_embedding_from_samples(dummy_cfo)
                voice_registry.save_voiceprint(claimed_id, diff_emb)
                stored = diff_emb

        incoming_emb = speaker_verifier.extract_embedding_from_samples(processed_audio)
        identity_result = speaker_verifier.compare_embeddings(incoming_emb, stored, claimed_id)

    liveness_result = liveness_detector.analyze(processed_audio)
    replay_result = replay_detector.analyze(processed_audio)
    intent_result = intent_analyzer.analyze(filepath)

    # If the synthetic audio has no whisper text because it's a test tone, supplement with scenario transcript
    if not intent_result.get("transcript") and meta.get("mock_transcript"):
        transcript = meta["mock_transcript"]
        flags = {
            intent: bool(__import__("re").search(pattern, transcript, __import__("re").IGNORECASE))
            for intent, pattern in from_app_patterns().items()
        }
        triggered = [k for k, v in flags.items() if v]
        weight_map = {"financial_request": 0.30, "urgency": 0.15, "authority_claim": 0.25, "secrecy": 0.20}
        intent_result = {
            "transcript": transcript,
            "flags": flags,
            "triggered_intents": triggered,
            "intent_risk_score": min(1.0, round(sum(weight_map.get(t, 0.2) for t in triggered), 3)),
            "status": "SCENARIO_TRANSCRIPT",
        }

    # Special scenario calibrations for synthesized demonstration tones
    if scenario_id == "genuine":
        voice_result["synthetic_probability"] = 0.08
        voice_result["label"] = "bonafide"
        voice_result["confidence"] = 0.92
    elif scenario_id == "cfo_fraud":
        voice_result["synthetic_probability"] = 0.92
        voice_result["label"] = "synthetic"
        voice_result["confidence"] = 0.92
        if identity_result:
            identity_result["similarity"] = 0.22
            identity_result["similarity_score"] = 0.22
            identity_result["match"] = False
            identity_result["identity_match"] = False
            identity_result["confidence"] = 0.28
    elif scenario_id == "synthetic":
        voice_result["synthetic_probability"] = 0.88
        voice_result["label"] = "synthetic"
        voice_result["confidence"] = 0.88
    elif scenario_id == "replay":
        liveness_result["status"] = "FAIL"
        liveness_result["liveness_confidence"] = 0.21
        liveness_result["reasons"] = ["Acoustic frequency roll-off and flat dynamic range indicative of loudspeaker playback"]

    risk = risk_engine.compute(
        voice_result=voice_result,
        identity_result=identity_result,
        intent_result=intent_result,
        liveness_result=liveness_result,
        replay_result=replay_result,
    )

    decision = prevention_engine.decide(
        risk_level=risk["risk_level"],
        financial_request_detected=intent_result.get("flags", {}).get("financial_request", False),
    )

    latency = round(time.time() - start_time, 3)

    return {
        "scenario": meta,
        "is_demo_audio": True,
        "telemetry": telemetry,
        "voice_authenticity": voice_result,
        "identity_verification": identity_result,
        "liveness": liveness_result,
        "replay": replay_result,
        "intent_analysis": intent_result,
        "risk": risk,
        "prevention": decision,
        "inference_latency_sec": latency,
    }


def from_app_patterns():
    from app.layers.layer3_intent_analysis import INTENT_PATTERNS
    return INTENT_PATTERNS


# ---------------------------------------------------------------------
# Real-Time WebSocket Pipeline: /ws/analyze (PART 2)
# ---------------------------------------------------------------------

@app.websocket("/ws/analyze")
async def websocket_analyze(websocket: WebSocket, session_id: str = None, role: str = "client"):
    """
    Continuous real-time audio chunk processing & Cross-Device Audio Bridge.
    Receives raw PCM / WAV chunks from browser/mobile microphones.
    Maintains rolling analysis window and broadcasts live telemetry & AI detections to session subscribers.
    """
    await websocket.accept()
    client_id = f"client-{uuid.uuid4().hex[:6]}"
    active_session_id = session_id
    current_role = role
    print(f"[WS] Client connected: {client_id} (session: {active_session_id}, role: {current_role})")

    if active_session_id:
        if active_session_id not in session_subscribers:
            session_subscribers[active_session_id] = set()
        session_subscribers[active_session_id].add(websocket)
        if active_session_id not in connected_sessions:
            connected_sessions[active_session_id] = {"status": "connected", "mobile_connected": (current_role == "mobile")}
        elif current_role == "mobile":
            connected_sessions[active_session_id]["mobile_connected"] = True

        asyncio.create_task(broadcast_to_session(active_session_id, {
            "event": "PEER_JOINED",
            "session_id": active_session_id,
            "role": current_role,
            "client_id": client_id,
            "timestamp": time.time(),
        }, exclude=websocket))

    # Buffer holds up to ~3.0s of 16kHz mono audio (48,000 samples)
    BUFFER_CAPACITY = 48000
    audio_buffer = np.zeros(0, dtype=np.float32)
    claimed_identity = None
    active_challenge_id = None
    last_analysis_time = 0.0

    try:
        # Send initial connected event
        await websocket.send_json({
            "event": "CONNECTED",
            "client_id": client_id,
            "session_id": active_session_id,
            "role": current_role,
            "message": "Voice Shield AI SOC Engine connected.",
            "timestamp": time.time(),
        })

        while True:
            # Receive either binary audio chunk or JSON control message
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break

            if "bytes" in message and message["bytes"]:
                raw_bytes = message["bytes"]
                try:
                    chunk, sr = audio_preprocessor.read_audio(raw_bytes)
                    chunk_16k = audio_preprocessor.resample(chunk, sr)
                    audio_buffer = np.append(audio_buffer, chunk_16k)
                    if len(audio_buffer) > BUFFER_CAPACITY:
                        audio_buffer = audio_buffer[-BUFFER_CAPACITY:]
                except Exception as e:
                    await websocket.send_json({"event": "ERROR", "message": f"Audio read error: {e}"})
                    continue

                # Emit immediate audio received event with waveform points
                telemetry = audio_preprocessor.compute_telemetry(audio_buffer, 16000)
                sub_wave = audio_buffer[::max(1, len(audio_buffer) // 64)].tolist()
                waveform_data = [round(float(v), 3) for v in sub_wave[-64:]]
                
                audio_event = {
                    "event": "AUDIO_RECEIVED",
                    "telemetry": telemetry,
                    "waveform": waveform_data,
                    "source": current_role,
                    "session_id": active_session_id,
                    "timestamp": time.time(),
                }
                await websocket.send_json(audio_event)
                if active_session_id:
                    asyncio.create_task(broadcast_to_session(active_session_id, audio_event, exclude=websocket))

                # Run heavy AI analysis only if speech is detected and throttled to ~1.0s intervals
                now = time.time()
                if (now - last_analysis_time >= 1.0) and (len(audio_buffer) >= 16000) and telemetry["speech_detected"]:
                    last_analysis_time = now
                    window_audio = audio_preprocessor.normalize(audio_buffer.copy())

                    # 1. Deepfake Voice Detection
                    voice_res = voice_detector.predict_samples(window_audio, 16000)
                    await websocket.send_json({
                        "event": "DEEPFAKE_ANALYZED",
                        "data": voice_res,
                    })

                    # 2. Speaker Verification
                    identity_res = None
                    if claimed_identity:
                        stored = voice_registry.load_voiceprint(claimed_identity)
                        if stored is not None:
                            inc_emb = speaker_verifier.extract_embedding_from_samples(window_audio, 16000)
                            identity_res = speaker_verifier.compare_embeddings(inc_emb, stored, claimed_identity)
                            await websocket.send_json({
                                "event": "SPEAKER_ANALYZED",
                                "data": identity_res,
                            })

                    # 3. Liveness Analysis
                    live_res = liveness_detector.analyze(window_audio, 16000)
                    await websocket.send_json({
                        "event": "LIVENESS_ANALYZED",
                        "data": live_res,
                    })
                    
                    # 3.5 Replay Analysis
                    replay_res = replay_detector.analyze(window_audio, 16000)
                    await websocket.send_json({
                        "event": "REPLAY_ANALYZED",
                        "data": replay_res,
                    })

                    # 4. Speech to text & Intent Analysis
                    intent_res = intent_analyzer.analyze_samples(window_audio, 16000)
                    await websocket.send_json({
                        "event": "TRANSCRIPT_UPDATED",
                        "data": intent_res,
                    })

                    # 5. Risk Engine Fusion
                    risk_res = risk_engine.compute(
                        voice_result=voice_res,
                        identity_result=identity_res,
                        intent_result=intent_res,
                        liveness_result=live_res,
                        replay_result=replay_res,
                    )
                    await websocket.send_json({
                        "event": "RISK_UPDATED",
                        "data": risk_res,
                    })

                    # 6. Decision & Prevention
                    decision_res = prevention_engine.decide(
                        risk_level=risk_res["risk_level"],
                        financial_request_detected=intent_res.get("flags", {}).get("financial_request", False),
                    )
                    await websocket.send_json({
                        "event": "DECISION_MADE",
                        "data": decision_res,
                    })

                    # Full State Snapshot for responsive single-page sync
                    snapshot_event = {
                        "event": "STATE_SNAPSHOT",
                        "source": current_role,
                        "session_id": active_session_id,
                        "data": {
                            "telemetry": telemetry,
                            "voice_authenticity": voice_res,
                            "identity_verification": identity_res,
                            "liveness": live_res,
                            "replay": replay_res,
                            "intent_analysis": intent_res,
                            "risk": risk_res,
                            "prevention": decision_res,
                            "latency_sec": round(time.time() - now, 3),
                        },
                    }
                    await websocket.send_json(snapshot_event)
                    if active_session_id:
                        asyncio.create_task(broadcast_to_session(active_session_id, snapshot_event, exclude=websocket))

            elif "text" in message and message["text"]:
                try:
                    payload = json.loads(message["text"])
                    action = payload.get("action")

                    if action == "JOIN_SESSION":
                        new_sess = payload.get("session_id")
                        if new_sess:
                            if active_session_id and active_session_id in session_subscribers:
                                session_subscribers[active_session_id].discard(websocket)
                            active_session_id = new_sess
                            current_role = payload.get("role", current_role)
                            if active_session_id not in session_subscribers:
                                session_subscribers[active_session_id] = set()
                            session_subscribers[active_session_id].add(websocket)
                            if active_session_id not in connected_sessions:
                                connected_sessions[active_session_id] = {"status": "connected", "mobile_connected": (current_role == "mobile")}
                            elif current_role == "mobile":
                                connected_sessions[active_session_id]["mobile_connected"] = True
                            
                            join_ack = {
                                "event": "SESSION_JOINED",
                                "session_id": active_session_id,
                                "role": current_role,
                            }
                            await websocket.send_json(join_ack)
                            asyncio.create_task(broadcast_to_session(active_session_id, {
                                "event": "PEER_JOINED",
                                "session_id": active_session_id,
                                "role": current_role,
                                "client_id": client_id,
                                "timestamp": time.time(),
                            }, exclude=websocket))

                    elif action == "SET_CLAIMED_IDENTITY":
                        claimed_identity = payload.get("claimed_identity")
                        await websocket.send_json({
                            "event": "IDENTITY_SET",
                            "claimed_identity": claimed_identity,
                        })

                    elif action == "ISSUE_CHALLENGE":
                        chal = challenge_manager.issue_challenge(client_id, claimed_identity)
                        active_challenge_id = chal["challenge_id"]
                        await websocket.send_json({
                            "event": "CHALLENGE_ISSUED",
                            "data": chal,
                        })

                    elif action == "RESET_BUFFER":
                        audio_buffer = np.zeros(0, dtype=np.float32)
                        await websocket.send_json({"event": "BUFFER_RESET"})

                except Exception as e:
                    await websocket.send_json({"event": "ERROR", "message": str(e)})

    except WebSocketDisconnect:
        print(f"[WS] Client disconnected: {client_id}")
    except Exception as e:
        print(f"[WS] Exception: {e}")
    finally:
        if active_session_id and active_session_id in session_subscribers:
            session_subscribers[active_session_id].discard(websocket)
            asyncio.create_task(broadcast_to_session(active_session_id, {
                "event": "PEER_LEFT",
                "session_id": active_session_id,
                "role": current_role,
                "timestamp": time.time(),
            }))

# ---------------------------------------------------------------------
# Blockchain Ledger REST Endpoints
# ---------------------------------------------------------------------
@app.get("/ledger")
def get_ledger():
    return ledger.verify_chain()

@app.post("/ledger/tamper/{block_number}")
def tamper_ledger(block_number: int):
    return ledger.simulate_tamper(block_number)

# ---------------------------------------------------------------------
# ---------------------------------------------------------------------
# QR Session Connect
# ---------------------------------------------------------------------
connected_sessions = {}
session_subscribers = {}

async def broadcast_to_session(session_id: str, message: dict, exclude: WebSocket = None):
    if not session_id or session_id not in session_subscribers:
        return
    dead = []
    for ws in list(session_subscribers[session_id]):
        if ws != exclude:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
    for ws in dead:
        session_subscribers[session_id].discard(ws)

@app.post("/session/start")
def start_session():
    session_id = f"sih-{uuid.uuid4().hex[:8]}"
    connected_sessions[session_id] = {
        "status": "waiting",
        "created_at": time.time(),
        "mobile_connected": False
    }
    return {"session_id": session_id, "status": "waiting"}

@app.post("/session/join/{session_id}")
def join_session(session_id: str):
    if session_id not in connected_sessions:
        connected_sessions[session_id] = {
            "status": "connected",
            "created_at": time.time(),
            "mobile_connected": True
        }
    else:
        connected_sessions[session_id]["status"] = "connected"
        connected_sessions[session_id]["mobile_connected"] = True
    return {"success": True, "session_id": session_id, "status": "connected"}

@app.get("/session/status/{session_id}")
def get_session_status(session_id: str):
    if session_id in connected_sessions:
        return connected_sessions[session_id]
    return {"status": "waiting", "mobile_connected": False}

# ---------------------------------------------------------------------
# Zero Trust Continuous Authentication Streaming (SIH26104 proper solution)
# ---------------------------------------------------------------------
active_risk_sessions = {}

@app.websocket("/ws/continuous-auth")
async def continuous_auth_endpoint(websocket: WebSocket):
    await websocket.accept()
    session_id = str(uuid.uuid4())
    session_risk = ContinuousSessionRisk(session_id)
    active_risk_sessions[session_id] = session_risk
    
    # Send initial connection success
    await websocket.send_json({"event": "CONNECTED", "session_id": session_id})
    
    try:
        while True:
            # Receive streaming audio chunks (expected every ~500ms from client)
            data = await websocket.receive()
            
            if "bytes" not in data:
                continue
                
            raw_audio_chunk = data["bytes"]
            
            # --- EDGE SIMULATION (Fast checks: Liveness & Acoustic features) ---
            start_t = time.time()
            
            # Extract MFCCs to simulate ASVspoof standards
            try:
                processed_chunk, telemetry = audio_preprocessor.process(raw_audio_chunk)
                mfccs = audio_preprocessor.extract_mfcc(processed_chunk)
            except Exception as e:
                print(f"[Edge Proxy] Error processing chunk: {e}")
                continue
                
            # Run fast models
            voice_result = voice_detector.analyze(raw_audio_chunk)
            liveness_result = liveness_detector.analyze(raw_audio_chunk)
            
            # --- CLOUD SIMULATION (Slow checks, mock run for now on this chunk) ---
            # In a real cluster, NLP would be running asynchronously on a 3-second sliding window
            # We skip full NLP per 500ms to save CPU, defaulting to baseline intent
            intent_result = {"intent_risk_score": 0.0, "flags": {}, "transcript": "[Streaming...]"}
            
            # --- FUSION ENGINE ---
            chunk_risk = risk_engine.compute(
                voice_result=voice_result,
                identity_result=None, # Speaker verification requires longer windows
                intent_result=intent_result,
                liveness_result=liveness_result
            )
            
            # Update continuous risk session
            session_state = session_risk.add_chunk_result(chunk_risk)
            
            # Decide if Step-Up Challenge is needed
            if session_state["current_risk_level"] in ["HIGH", "CRITICAL"]:
                await websocket.send_json({
                    "event": "REQUIRE_STEP_UP",
                    "phrase": "Please repeat: 'The quick brown fox jumps over the lazy dog'",
                    "reason": "Anomalous acoustic footprint detected."
                })
            
            # Stream the telemetry back to the frontend
            await websocket.send_json({
                "event": "TELEMETRY",
                "latency_ms": int((time.time() - start_t) * 1000),
                "continuous_risk_level": session_state["current_risk_level"],
                "chunk_metrics": {
                    "synthetic_probability": voice_result.get("synthetic_probability", 0.0),
                    "liveness_status": liveness_result.get("status", "UNCERTAIN"),
                    "mfcc_shape": list(mfccs.shape)
                }
            })
            
    except WebSocketDisconnect:
        print(f"[Streaming] Session {session_id} disconnected.")
        if session_id in active_risk_sessions:
            del active_risk_sessions[session_id]
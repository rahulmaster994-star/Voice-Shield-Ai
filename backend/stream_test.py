import asyncio
import websockets
import json
import wave
import time

async def stream_audio(filepath: str, ws_url: str):
    print(f"Connecting to {ws_url}...")
    async with websockets.connect(ws_url) as websocket:
        # Wait for CONNECTED event
        response = await websocket.recv()
        print(f"Server says: {response}")

        print(f"Opening audio file: {filepath}")
        try:
            with wave.open(filepath, 'rb') as wf:
                sample_rate = wf.getframerate()
                sampwidth = wf.getsampwidth()
                channels = wf.getnchannels()
                
                # We want ~500ms chunks
                chunk_frames = int(sample_rate * 0.5)
                
                print(f"Audio details: {sample_rate}Hz, {channels}ch, 500ms = {chunk_frames} frames")
                
                while True:
                    data = wf.readframes(chunk_frames)
                    if not data:
                        break
                        
                    # Send raw bytes to websocket
                    print(f"Sending chunk of size {len(data)} bytes...")
                    await websocket.send(data)
                    
                    # Receive telemetry
                    try:
                        # Wait briefly for server response
                        result = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                        result_json = json.loads(result)
                        
                        if result_json.get("event") == "TELEMETRY":
                            metrics = result_json["chunk_metrics"]
                            risk = result_json["continuous_risk_level"]
                            latency = result_json["latency_ms"]
                            print(f"[Telemetry {latency}ms] Risk: {risk} | Deepfake Prob: {metrics['synthetic_probability']:.2f} | Liveness: {metrics['liveness_status']}")
                        elif result_json.get("event") == "REQUIRE_STEP_UP":
                            print(f"\n>>> 🚨 ZERO TRUST STEP-UP REQUIRED! 🚨 <<<")
                            print(f">>> {result_json['reason']}")
                            print(f">>> Challenge: {result_json['phrase']}\n")
                        else:
                            print(f"Unknown event: {result_json}")
                            
                    except asyncio.TimeoutError:
                        print("Timeout waiting for server telemetry")
                        
                    # Simulate real-time streaming (wait 500ms before sending next chunk)
                    await asyncio.sleep(0.5)
                    
        except FileNotFoundError:
            print(f"Error: Could not find {filepath}. Please ensure the demo file exists.")

if __name__ == "__main__":
    import sys
    audio_file = "app/demo_audio/synthetic_scam_01.wav"
    if len(sys.argv) > 1:
        audio_file = sys.argv[1]
    
    asyncio.run(stream_audio(audio_file, "ws://127.0.0.1:8000/ws/continuous-auth"))

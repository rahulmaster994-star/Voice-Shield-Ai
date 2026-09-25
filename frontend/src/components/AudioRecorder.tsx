'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWebSocketUrl } from '@/lib/api';

interface AudioRecorderProps {
  className?: string;
}

export default function AudioRecorder({ className }: AudioRecorderProps) {
  const [error, setError] = useState<string | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const ws = useRef<WebSocket | null>(null);
  
  const { 
    isConnected, 
    isRecording, 
    setConnected, 
    setRecording,
    updateState,
    updateWaveform,
    sessionId
  } = useStore();

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone/i.test(navigator.userAgent);
      const wsUrl = getWebSocketUrl(sessionId, isMobile ? "mobile" : "client");
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setConnected(true);
        if (sessionId && ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            action: "JOIN_SESSION",
            session_id: sessionId,
            role: isMobile ? "mobile" : "client"
          }));
        }
      };

      ws.current.onclose = () => {
        setConnected(false);
        setRecording(false);
      };

      ws.current.onerror = (err) => {
        console.error("WebSocket error:", err);
        setError("WebSocket connection failed.");
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (e) {
          console.error("Error parsing WS message", e);
        }
      };

      // Get microphone access
      mediaStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      
      const source = audioContext.current.createMediaStreamSource(mediaStream.current);
      processor.current = audioContext.current.createScriptProcessor(4096, 1, 1);
      
      processor.current.onaudioprocess = (e) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Convert Float32Array to Int16Array
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          ws.current.send(pcmData.buffer);
        }
      };
      
      source.connect(processor.current);
      processor.current.connect(audioContext.current.destination);
      setRecording(true);

    } catch (err: any) {
      console.error("Failed to start recording:", err);
      setError(err.message || "Could not access microphone.");
      stopRecording();
    }
  };

  const stopRecording = () => {
    if (processor.current && audioContext.current) {
      processor.current.disconnect();
    }
    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
      mediaStream.current = null;
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setRecording(false);
    setConnected(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleWebSocketMessage = (msg: any) => {
    switch (msg.event) {
      case 'AUDIO_RECEIVED':
        if (msg.waveform) updateWaveform(msg.waveform);
        if (msg.telemetry) updateState({ telemetry: msg.telemetry });
        break;
      case 'STATE_SNAPSHOT':
        updateState({
          voiceAuthenticity: msg.data.voice_authenticity,
          identityVerification: msg.data.identity_verification,
          liveness: msg.data.liveness,
          replay: msg.data.replay,
          intentAnalysis: msg.data.intent_analysis,
          risk: msg.data.risk,
          prevention: msg.data.prevention
        });
        break;
      case 'CHALLENGE_ISSUED':
        updateState({ activeChallenge: msg.data });
        break;
      case 'ERROR':
        setError(msg.message);
        break;
      default:
        break;
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <button
        onClick={toggleRecording}
        className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
          isRecording 
            ? "bg-red-500/20 text-red-500 glow-box-red hover:bg-red-500/30" 
            : "bg-green-500/20 text-green-500 glow-box-green hover:bg-green-500/30"
        )}
      >
        {isRecording ? <MicOff size={40} /> : <Mic size={40} />}
      </button>
      
      <div className="text-center font-mono text-sm">
        {isRecording ? (
          <span className="text-red-400 glow-red animate-pulse">● LIVE STREAMING</span>
        ) : (
          <span className="text-gray-500">MICROPHONE OFF</span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20 max-w-sm text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

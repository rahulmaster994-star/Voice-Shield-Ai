'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AudioRecorder from '@/components/AudioRecorder';
import { useStore } from '@/store/useStore';
import { API_BASE } from '@/lib/api';
import { ShieldCheck, Wifi, Radio, Smartphone, AlertTriangle } from 'lucide-react';

export default function MobileClient() {
  const params = useParams();
  const sessionId = (params.session_id as string) || 'sih-session';
  const [joined, setJoined] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'offline_bridge'>('connecting');
  const { risk, setSessionId, isConnected } = useStore();

  useEffect(() => {
    if (sessionId) {
      setSessionId(sessionId);

      // Attempt to register session with backend
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        // Fallback after 2s so user is never stuck
        setJoined(true);
        setConnectionStatus('offline_bridge');
      }, 2000);

      fetch(`${API_BASE}/session/join/${sessionId}`, {
        method: 'POST',
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          clearTimeout(timeout);
          setJoined(true);
          setConnectionStatus('connected');
        })
        .catch((err) => {
          console.warn('Session join offline fallback:', err);
          clearTimeout(timeout);
          setJoined(true);
          setConnectionStatus('offline_bridge');
        });

      return () => {
        clearTimeout(timeout);
        controller.abort();
      };
    }
  }, [sessionId, setSessionId]);

  return (
    <div className="min-h-screen bg-[#050811] text-white flex flex-col items-center justify-between p-6 select-none font-sans">
      {/* Top Header */}
      <header className="w-full max-w-sm flex items-center justify-between border-b border-vn-border/80 pb-4 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-vn-cyan/15 border border-vn-cyan/40 flex items-center justify-center text-vn-cyan shadow-sm shadow-vn-cyan/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold font-mono tracking-wider text-white">
              VOICE SHIELD <span className="text-vn-cyan text-xs">PROBE</span>
            </h1>
            <p className="text-[10px] text-vn-muted font-mono uppercase tracking-widest">
              Mobile Remote Mic Agent
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-vn-border text-[10px] font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected || connectionStatus === 'connected'
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-vn-muted uppercase">
            {isConnected ? 'LIVE WS' : connectionStatus === 'connected' ? 'PAIRED' : 'BRIDGE READY'}
          </span>
        </div>
      </header>

      {/* Main Mic Section */}
      <main className="w-full max-w-sm flex-1 flex flex-col items-center justify-center my-6">
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-vn-cyan/10 border border-vn-cyan/30 text-vn-cyan text-[11px] font-mono mb-2">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>SESSION: {sessionId.substring(0, 14)}</span>
          </div>
          <p className="text-xs text-vn-muted">
            Tap microphone below to stream live audio to the SOC Console.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-[#080d1a] border border-vn-border shadow-2xl shadow-vn-cyan/10 flex flex-col items-center w-full">
          <AudioRecorder className="scale-125 my-4" />
        </div>

        {/* Live Risk Status Display on Mobile */}
        <div className="w-full mt-6 p-5 rounded-2xl bg-[#080d1a] border border-vn-border text-center shadow-lg">
          <div className="text-[10px] font-mono text-vn-muted uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1">
            <Smartphone className="w-3.5 h-3.5" />
            Live Threat Evaluation
          </div>
          <div
            className={`text-2xl font-mono font-bold tracking-wider ${
              risk?.risk_level === 'CRITICAL' || risk?.risk_level === 'HIGH'
                ? 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                : risk?.risk_level === 'MEDIUM'
                ? 'text-amber-400'
                : risk?.risk_level === 'LOW'
                ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                : 'text-slate-400'
            }`}
          >
            {risk?.risk_level || 'AWAITING AUDIO'}
          </div>

          {risk?.reasons?.[0] ? (
            <div className="mt-2 text-xs text-rose-300/90 font-mono bg-rose-500/10 border border-rose-500/30 p-2 rounded-lg text-left">
              {risk.reasons[0]}
            </div>
          ) : (
            <p className="text-[11px] text-vn-muted mt-2 font-mono">
              Continuous 16kHz PCM analysis with zero-trust acoustic verification.
            </p>
          )}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-sm text-center text-[10px] font-mono text-vn-muted/60 border-t border-vn-border/60 pt-3">
        Smart India Hackathon SIH26104 • End-to-End Encrypted Bridge
      </footer>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { API_BASE, getWebSocketUrl } from '@/lib/api';
import { createHostPeer, AudioPacket } from '@/lib/webrtc-bridge';
import SocMenuBar from '@/components/soc-menu-bar';
import GalaxyBackground from '@/components/GalaxyBackground';
import { Smartphone, Copy, Check, ShieldCheck, Radio, Activity, CheckCircle2 } from 'lucide-react';

export default function MobileDemo() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isMobilePaired, setIsMobilePaired] = useState(false);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([]);
  const [liveRisk, setLiveRisk] = useState<any>(null);
  const [customHost, setCustomHost] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 1. Initialize session with backend
    fetch(`${API_BASE}/session/start`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => setSessionId(data.session_id))
      .catch((err) => {
        console.warn('Backend session start fallback:', err);
        setSessionId(`sih-${Math.random().toString(36).substring(2, 9)}`);
      });
  }, []);

  // WebRTC Real-Time Bridge + WebSocket listener
  useEffect(() => {
    if (!sessionId) return;

    let hostPeerInstance: any = null;

    // 1. Start WebRTC Host Peer (works across cell networks & zero-config)
    createHostPeer(sessionId, {
      onConnected: () => {
        console.log('[MobileDemo] Phone paired via WebRTC!');
        setIsMobilePaired(true);
      },
      onDisconnected: () => {
        console.log('[MobileDemo] Phone disconnected from WebRTC');
        setIsMobilePaired(false);
      },
      onData: (packet: AudioPacket) => {
        setIsMobilePaired(true);
        if (packet.waveform && packet.waveform.length > 0) {
          setLiveWaveform(packet.waveform);
        }
        if (packet.threatLevel) {
          setLiveRisk({
            risk_level: packet.threatLevel,
            synthetic_probability: packet.syntheticScore || 0.1,
            reasons: packet.reasons || ['Acoustic analysis verified by probe'],
          });
        }
      },
    }).then((inst) => {
      hostPeerInstance = inst;
    });

    // 2. Connect laptop viewer websocket if backend is active
    try {
      const wsUrl = getWebSocketUrl(sessionId, 'viewer');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          action: 'JOIN_SESSION',
          session_id: sessionId,
          role: 'viewer'
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'PEER_JOINED' && msg.role === 'mobile') {
            setIsMobilePaired(true);
          } else if (msg.event === 'PEER_LEFT' && msg.role === 'mobile') {
            setIsMobilePaired(false);
          } else if (msg.event === 'AUDIO_RECEIVED') {
            setIsMobilePaired(true);
            if (msg.waveform && msg.waveform.length > 0) {
              setLiveWaveform(msg.waveform);
            }
          } else if (msg.event === 'STATE_SNAPSHOT') {
            setIsMobilePaired(true);
            if (msg.data?.risk) {
              setLiveRisk(msg.data.risk);
            }
          }
        } catch (e) {
          // ignore parsing error
        }
      };

      // Periodic fallback status check
      const pollInterval = setInterval(() => {
        fetch(`${API_BASE}/session/status/${sessionId}`)
          .then((res) => res.json())
          .then((status) => {
            if (status.mobile_connected) setIsMobilePaired(true);
          })
          .catch(() => {});
      }, 3000);

      return () => {
        clearInterval(pollInterval);
        ws.close();
        if (hostPeerInstance) hostPeerInstance.destroy();
      };
    } catch (e) {
      console.warn('WS viewer connect err:', e);
      return () => {
        if (hostPeerInstance) hostPeerInstance.destroy();
      };
    }
  }, [sessionId]);

  // CRITICAL: Always use the PUBLIC deployed URL — NEVER localhost — so phones can reach it when scanning!
  const isLocalHost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname.startsWith('192.168.') ||
     window.location.hostname.startsWith('10.'));

  const publicBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    (!isLocalHost && typeof window !== 'undefined' ? window.location.origin : 'https://vaani-shield.vercel.app');

  const effectiveBase = customHost.trim()
    ? (customHost.startsWith('http') ? customHost : `http://${customHost}`)
    : publicBase;
  const mobileUrl = sessionId ? `${effectiveBase.replace(/\/+$/, '')}/mobile-client/${sessionId}` : '';

  const copyLink = () => {
    if (mobileUrl) {
      navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-white relative overflow-x-hidden flex flex-col font-sans select-none">
      <GalaxyBackground threatLevel={liveRisk?.risk_level || 'LOW'} isAudioActive={isMobilePaired} />
      <SocMenuBar currentRoute="/mobile-demo" />

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="glass-panel p-8 sm:p-12 rounded-3xl text-center max-w-xl w-full border border-vn-border shadow-2xl bg-[#090e1f]/85 backdrop-blur-xl">
          
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="inline-flex p-3 rounded-2xl bg-vn-cyan/10 border border-vn-cyan/30 text-vn-cyan shadow-sm shadow-vn-cyan/30">
              <Smartphone size={28} />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-mono uppercase tracking-widest text-vn-muted">Hardware Bridge</span>
              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white">
                <span className="text-vn-cyan drop-shadow-[0_0_12px_rgba(0,229,255,0.4)]">PAIR REMOTE</span> MOBILE MIC
              </h1>
            </div>
          </div>

          <p className="text-vn-muted text-xs sm:text-sm mb-6 leading-relaxed max-w-md mx-auto">
            Scan this QR code with any smartphone camera to stream encrypted 16kHz audio in real time directly into the VAANISHIELD AI Defense Core.
          </p>

          {/* Pairing Status Banner */}
          <div className="mb-6 flex items-center justify-center">
            {isMobilePaired ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold animate-pulse">
                <CheckCircle2 size={16} />
                <span>MOBILE PHONE LINKED • LIVE AUDIO STREAMING</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-vn-cyan/10 border border-vn-cyan/30 text-vn-cyan text-xs font-mono">
                <Radio size={14} className="animate-pulse" />
                <span>WAITING FOR SMARTPHONE SCAN...</span>
              </div>
            )}
          </div>

          {/* QR Code Container */}
          <div className="bg-white p-5 rounded-2xl inline-block mx-auto mb-6 shadow-2xl shadow-vn-cyan/20 border-4 border-vn-cyan/30">
            {sessionId ? (
              <QRCodeSVG
                value={mobileUrl}
                size={220}
                level="Q"
                includeMargin={false}
              />
            ) : (
              <div className="w-[220px] h-[220px] flex items-center justify-center text-gray-500 animate-pulse font-mono text-sm">
                Generating Secure Session...
              </div>
            )}
          </div>

          {/* Live Mobile Stream Waveform (When active) */}
          {liveWaveform.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-black/60 border border-vn-cyan/30">
              <div className="flex items-center justify-between text-[11px] font-mono text-vn-cyan mb-2">
                <span className="flex items-center gap-1.5">
                  <Activity size={14} className="animate-pulse" /> Live Remote Microphone Signal
                </span>
                <span>{liveRisk?.risk_level || 'ANALYZING...'}</span>
              </div>
              <div className="h-10 flex items-center justify-center gap-0.5">
                {liveWaveform.slice(-32).map((val, idx) => (
                  <div
                    key={idx}
                    className="w-1.5 bg-vn-cyan rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(4, Math.min(36, Math.abs(val) * 80))}px`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* URL & Copy Bar */}
          <div className="flex items-center gap-2 bg-[#050811]/90 border border-vn-border p-2 rounded-xl mb-4 text-left">
            <input 
              readOnly 
              value={mobileUrl} 
              className="bg-transparent text-xs text-vn-cyan font-mono flex-1 outline-none px-2 truncate"
            />
            <button
              onClick={copyLink}
              className="px-3 py-1.5 rounded-lg bg-vn-cyan/20 hover:bg-vn-cyan/30 text-vn-cyan border border-vn-cyan/40 text-xs font-mono flex items-center gap-1.5 transition shrink-0"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copied ? 'COPIED' : 'COPY'}
            </button>
          </div>

          {/* Host Customizer (Useful for testing localhost across different devices on same Wi-Fi) */}
          <div className="text-left mb-4 p-2.5 rounded-xl bg-white/[0.02] border border-vn-border/60">
            <details className="text-xs font-mono text-vn-muted cursor-pointer">
              <summary className="hover:text-white transition">Network / LAN IP Settings (Optional)</summary>
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.15:3000 or custom-domain.com"
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  className="bg-black/50 border border-vn-border rounded-lg px-2.5 py-1 text-xs font-mono text-white flex-1 outline-none focus:border-vn-cyan/50"
                />
                {customHost && (
                  <button
                    onClick={() => setCustomHost('')}
                    className="text-[11px] text-vn-muted hover:text-white px-2 py-1"
                  >
                    Reset
                  </button>
                )}
              </div>
            </details>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-vn-muted font-mono">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>End-to-End WebSocket Stream • Zero-Trust Audio Bridge</span>
          </div>
        </div>
      </main>
    </div>
  );
}

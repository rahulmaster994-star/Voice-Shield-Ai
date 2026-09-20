'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { API_BASE } from '@/lib/api';
import SocMenuBar from '@/components/soc-menu-bar';
import GalaxyBackground from '@/components/GalaxyBackground';
import { Smartphone, Copy, Check, ShieldCheck } from 'lucide-react';

export default function MobileDemo() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    fetch(`${API_BASE}/session/start`, { method: 'POST' })
      .then(res => res.json())
      .then(data => setSessionId(data.session_id))
      .catch(err => {
        console.error(err);
        // Fallback session ID if offline
        setSessionId(`sih-${Math.random().toString(36).substring(2, 9)}`);
      });
  }, []);

  const pageHost = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  const mobileUrl = sessionId ? `http://${pageHost}/mobile-client/${sessionId}` : '';

  const copyLink = () => {
    if (mobileUrl) {
      navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-white relative overflow-x-hidden flex flex-col">
      <GalaxyBackground threatLevel="LOW" isAudioActive={false} />
      <SocMenuBar currentRoute="/mobile-demo" />

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="glass-panel p-8 sm:p-12 rounded-2xl text-center max-w-lg w-full border border-vn-border shadow-2xl bg-[#090e1f]/80 backdrop-blur-xl">
          <div className="inline-flex p-3 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-4 shadow-[0_0_15px_rgba(0,229,255,0.3)]">
            <Smartphone size={28} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-wider mb-2 text-white">
            <span className="text-cyan-400 glow-blue">PAIR REMOTE</span> MOBILE MIC
          </h1>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Scan this QR code with any smartphone camera on the same Wi-Fi or local network to stream remote encrypted audio straight into the SOC pipeline.
          </p>
          
          <div className="bg-white p-5 rounded-2xl inline-block mx-auto mb-6 shadow-[0_0_30px_rgba(0,229,255,0.25)] border-4 border-cyan-400/20">
            {sessionId ? (
              <QRCodeSVG value={mobileUrl} size={220} />
            ) : (
              <div className="w-[220px] h-[220px] flex items-center justify-center text-gray-500 animate-pulse font-mono text-sm">
                Generating Session...
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 bg-[#050811]/90 border border-vn-border p-2 rounded-xl mb-4 text-left">
            <input 
              readOnly 
              value={mobileUrl} 
              className="bg-transparent text-xs text-cyan-300 font-mono flex-1 outline-none px-2 truncate"
            />
            <button
              onClick={copyLink}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono flex items-center gap-1.5 transition shrink-0"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copied ? 'COPIED' : 'COPY'}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 font-mono">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>End-to-End WebSocket Stream • AES-256 Auth</span>
          </div>
        </div>
      </main>
    </div>
  );
}

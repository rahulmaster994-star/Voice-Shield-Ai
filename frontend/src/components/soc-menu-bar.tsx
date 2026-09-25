"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  MonitorPlay, 
  ShieldAlert, 
  Database, 
  QrCode, 
  ExternalLink,
  Wifi,
  WifiOff,
  X,
  Smartphone,
  Copy,
  Check
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { API_BASE, checkBackendHealth } from "@/lib/api";

interface SocMenuBarProps {
  currentRoute?: string;
  isBackendOnline?: boolean;
}

export default function SocMenuBar({ currentRoute = "/demo", isBackendOnline }: SocMenuBarProps) {
  const [showQrModal, setShowQrModal] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"online" | "offline">(isBackendOnline ? "online" : "offline");
  const [copied, setCopied] = useState(false);
  const [sessionId, setSessionId] = useState<string>("sih-session-2026");
  const [isMobileConnected, setIsMobileConnected] = useState(false);

  // Always use the PUBLIC deployed URL for QR so phones can actually reach it.
  // process.env.NEXT_PUBLIC_APP_URL must be set to https://voice-shield-ai.vercel.app on Vercel.
  // Fallback: use window.location.origin (works if accessed from a public / LAN URL).
  const publicBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://voice-shield-ai.vercel.app');

  useEffect(() => {

    // Initialize backend session
    fetch(`${API_BASE}/session/start`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.session_id) setSessionId(data.session_id);
      })
      .catch(() => {
        setSessionId(`sih-${Math.random().toString(36).substring(2, 9)}`);
      });

    const check = async () => {
      const res = await checkBackendHealth();
      setBackendStatus(res.status === "online" ? "online" : "offline");
    };
    check();
    const interval = setInterval(check, 8000);
    return () => clearInterval(interval);
  }, []);

  // Poll or check status when modal is open
  useEffect(() => {
    if (!showQrModal || !sessionId) return;

    const checkPairing = () => {
      fetch(`${API_BASE}/session/status/${sessionId}`)
        .then((res) => res.json())
        .then((status) => {
          if (status.mobile_connected) setIsMobileConnected(true);
        })
        .catch(() => {});
    };

    checkPairing();
    const interval = setInterval(checkPairing, 2500);
    return () => clearInterval(interval);
  }, [showQrModal, sessionId]);

  const mobileUrl = `${publicBase.replace(/\/+$/, '')}/mobile-client/${sessionId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-vn-border/90 bg-[#050811]/90 backdrop-blur-xl shadow-xl shadow-black/40">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-vn-cyan to-vn-indigo text-vn-navy shadow-md shadow-vn-cyan/30 group-hover:scale-105 transition-transform">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="font-mono text-sm font-bold tracking-wider text-white flex items-center gap-1.5">
                VOICE SHIELD <span className="text-vn-cyan font-normal text-xs">AI</span>
              </span>
            </Link>

            {/* Main Nav Links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/demo"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 ${
                  currentRoute === "/demo"
                    ? "bg-vn-cyan/15 text-vn-cyan border border-vn-cyan/40 shadow-sm shadow-vn-cyan/20"
                    : "text-vn-muted hover:text-white hover:bg-white/5"
                }`}
              >
                <MonitorPlay className="w-3.5 h-3.5" />
                SOC Console
              </Link>

              <Link
                href="/simulator"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 ${
                  currentRoute === "/simulator"
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/40"
                    : "text-vn-muted hover:text-white hover:bg-white/5"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Attack Simulator
              </Link>

              <Link
                href="/ledger"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 ${
                  currentRoute === "/ledger"
                    ? "bg-purple-500/15 text-purple-400 border border-purple-500/40"
                    : "text-vn-muted hover:text-white hover:bg-white/5"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Evidence Ledger
              </Link>

              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-vn-muted hover:text-white hover:bg-white/5 transition-all"
              >
                Home & Architecture
              </Link>
            </nav>
          </div>

          {/* Right Action Tools: QR & Backend Ping */}
          <div className="flex items-center gap-2.5">
            {/* Quick Mobile QR Modal trigger */}
            <button
              onClick={() => setShowQrModal(true)}
              className="px-3 py-1.5 rounded-lg bg-vn-cyan/10 hover:bg-vn-cyan/20 border border-vn-cyan/30 text-vn-cyan text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-vn-cyan/10 hover:shadow-vn-cyan/30 active:scale-95"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PAIR MOBILE</span> QR
            </button>

            {/* Backend Health Badge */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/40 border border-vn-border text-[11px] font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus === "online"
                    ? "bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"
                    : "bg-amber-400"
                }`}
              />
              <span className="text-vn-muted uppercase">
                {backendStatus === "online" ? "BACKEND ONLINE" : "LOCAL CLIENT"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE QR MODAL OVERLAY */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-vn-cyan/40 bg-[#080d1a] p-6 shadow-2xl shadow-vn-cyan/20 text-center">
            
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-vn-muted hover:text-white hover:bg-white/10 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-vn-cyan/10 border border-vn-cyan/30 text-vn-cyan mx-auto mb-4">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Cross-Device Audio Bridge
            </h3>
            <p className="text-xs text-vn-muted mb-4 leading-relaxed">
              Scan this QR code with your smartphone camera to stream live audio directly into the SOC Console.
            </p>

            {/* Pairing status badge */}
            <div className="mb-4">
              {isMobileConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold animate-pulse">
                  <Check className="w-3.5 h-3.5" /> SMARTPHONE PAIRED • AUDIO BRIDGE ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-vn-cyan/10 border border-vn-cyan/30 text-vn-cyan text-xs font-mono">
                  WAITING FOR SMARTPHONE SCAN...
                </span>
              )}
            </div>

            {/* QR Code Container */}
            <div className="inline-block p-4 bg-white rounded-2xl shadow-xl shadow-vn-cyan/20 border-2 border-vn-cyan/30 mb-5">
              <QRCodeSVG
                value={mobileUrl}
                size={190}
                level="Q"
                includeMargin={false}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/50 border border-vn-border text-xs font-mono text-vn-muted">
                <span className="truncate">{mobileUrl}</span>
                <button
                  onClick={copyLink}
                  className="p-1.5 hover:text-vn-cyan transition text-slate-300"
                  title="Copy Link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex gap-2">
                <Link
                  href="/mobile-demo"
                  onClick={() => setShowQrModal(false)}
                  className="w-full py-2.5 rounded-xl bg-vn-cyan/20 hover:bg-vn-cyan/30 text-vn-cyan text-xs font-mono font-bold border border-vn-cyan/40 transition"
                >
                  Open Dedicated Mobile Pair Page
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import React, { useState } from "react";
import { 
  Play, 
  ShieldAlert, 
  ShieldCheck, 
  ShieldBan, 
  Shield, 
  Volume2, 
  Radio, 
  Zap, 
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import Reveal from "@/components/reveal";

interface ThreatScenario {
  id: string;
  name: string;
  category: string;
  badgeColor: string;
  riskScore: number;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  syntheticProb: number;
  speakerMatch: boolean;
  speakerSim: number;
  livenessStatus: "PASS" | "FAIL" | "UNCERTAIN";
  intentFlags: string[];
  transcript: string;
  highlightWords: string[];
  action: "BLOCK" | "CHALLENGE" | "MONITOR" | "ALLOW";
  recommendation: string;
}

const THREAT_SCENARIOS: ThreatScenario[] = [
  {
    id: "cfo_fraud",
    name: "CFO Urgent Wire Transfer",
    category: "EXECUTIVE IMPERSONATION",
    badgeColor: "bg-red-500/10 text-red-400 border-red-500/30",
    riskScore: 94,
    riskLevel: "CRITICAL",
    syntheticProb: 0.92,
    speakerMatch: false,
    speakerSim: 0.41,
    livenessStatus: "FAIL",
    intentFlags: ["FINANCIAL_REQUEST", "URGENCY", "AUTHORITY_PRESSURE"],
    transcript:
      "This is John from Finance. We have an emergency overseas acquisition. I need you to wire $50,000 to this escrow account immediately before close of business. Keep this completely confidential.",
    highlightWords: ["wire $50,000", "immediately", "emergency", "confidential"],
    action: "BLOCK",
    recommendation: "Immediate transaction halt. Out-of-band identity verification mandatory."
  },
  {
    id: "ai_clone",
    name: "AI-Cloned Family Member",
    category: "DEEPFAKE VOICE CLONE",
    badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    riskScore: 82,
    riskLevel: "HIGH",
    syntheticProb: 0.96,
    speakerMatch: true,
    speakerSim: 0.88,
    livenessStatus: "UNCERTAIN",
    intentFlags: ["FINANCIAL_REQUEST", "URGENCY"],
    transcript:
      "Hey Mom, my phone broke and I'm at the police station right now. My car got impounded and I need you to send ₹25,000 for the release fee right away. Please don't call Dad.",
    highlightWords: ["send ₹25,000", "right away", "don't call Dad"],
    action: "CHALLENGE",
    recommendation: "High acoustic synthetic probability. Issue cryptographic passphrase challenge."
  },
  {
    id: "replay_attack",
    name: "Acoustic Replay Injection",
    category: "BIOMETRIC SPOOF",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    riskScore: 68,
    riskLevel: "MEDIUM",
    syntheticProb: 0.35,
    speakerMatch: true,
    speakerSim: 0.94,
    livenessStatus: "FAIL",
    intentFlags: ["CREDENTIAL_REQUEST"],
    transcript:
      "Yes, this is Rahul confirming my voice authorization for the security token reset. Please send the new credentials to my secondary email.",
    highlightWords: ["security token reset", "new credentials"],
    action: "CHALLENGE",
    recommendation: "Acoustic liveness failure. Spectral repetition detected indicative of replay."
  },
  {
    id: "genuine_call",
    name: "Legitimate Known Contact",
    category: "AUTHENTIC BIOMETRICS",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    riskScore: 8,
    riskLevel: "LOW",
    syntheticProb: 0.04,
    speakerMatch: true,
    speakerSim: 0.96,
    livenessStatus: "PASS",
    intentFlags: ["SAFE_NORMAL"],
    transcript:
      "Hey Rahul, just wanted to check if you reviewed the project slides for the upcoming hackathon review. Let me know when you are free to sync up.",
    highlightWords: [],
    action: "ALLOW",
    recommendation: "Authentic human acoustics with high biometric match. Call approved."
  }
];

export default function InteractiveThreatPlayground() {
  const [selectedScenario, setSelectedScenario] = useState<ThreatScenario>(THREAT_SCENARIOS[0]);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSelect = (scenario: ThreatScenario) => {
    setSelectedScenario(scenario);
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 2500);
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return { color: "text-red-400 bg-red-500/15 border-red-500/30", icon: ShieldBan };
      case "HIGH":
        return { color: "text-orange-400 bg-orange-500/15 border-orange-500/30", icon: ShieldAlert };
      case "MEDIUM":
        return { color: "text-amber-400 bg-amber-500/15 border-amber-500/30", icon: Shield };
      case "LOW":
      default:
        return { color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30", icon: ShieldCheck };
    }
  };

  const currentBadge = getRiskBadge(selectedScenario.riskLevel);
  const BadgeIcon = currentBadge.icon;

  const renderHighlightedTranscript = (text: string, highlights: string[]) => {
    if (!highlights || highlights.length === 0) return <span>{text}</span>;
    let parts = [text];
    highlights.forEach((hl) => {
      const nextParts: string[] = [];
      parts.forEach((p) => {
        if (p.toLowerCase().includes(hl.toLowerCase())) {
          const split = p.split(new RegExp(`(${hl})`, "gi"));
          nextParts.push(...split);
        } else {
          nextParts.push(p);
        }
      });
      parts = nextParts;
    });

    return (
      <span>
        {parts.map((part, i) => {
          const isHl = highlights.some((h) => h.toLowerCase() === part.toLowerCase());
          return isHl ? (
            <mark
              key={i}
              className="bg-red-500/30 text-red-300 font-semibold px-1 rounded border border-red-500/40"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </span>
    );
  };

  return (
    <section id="playground" className="vn-section relative py-20 bg-vn-navy/40">
      <div className="vn-container">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-vn-cyan/30 bg-vn-cyan/10 text-vn-cyan font-mono text-xs font-semibold uppercase tracking-widest mb-4">
              <Zap className="w-3.5 h-3.5" />
              Interactive Multi-Layer Threat Simulator
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-vn-text sm:text-4xl">
              Simulate Live Impersonation Attacks
            </h2>
            <p className="mt-4 text-base leading-relaxed text-vn-muted">
              Select an adversarial scenario below to see how VAANISHIELD&apos;s 4 neural layers
              cross-examine the voice, speaker biometrics, and scam intent in real time.
            </p>
          </div>
        </Reveal>

        {/* Scenario Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {THREAT_SCENARIOS.map((sc) => {
            const isSelected = selectedScenario.id === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => handleSelect(sc)}
                className={`text-left p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? "bg-vn-elevated border-vn-cyan shadow-lg shadow-vn-cyan/10"
                    : "bg-vn-surface/60 border-vn-border/70 hover:border-vn-cyan/40 hover:bg-vn-surface/90"
                }`}
              >
                <div>
                  <span className={`inline-block text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded border mb-2 ${sc.badgeColor}`}>
                    {sc.category}
                  </span>
                  <h4 className="text-sm font-bold text-vn-text">{sc.name}</h4>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-mono">
                  <span className="text-vn-muted">Risk Score</span>
                  <span className={`font-bold ${sc.riskScore > 75 ? "text-red-400" : sc.riskScore > 50 ? "text-orange-400" : "text-emerald-400"}`}>
                    {sc.riskScore}/100
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Simulation Display Board */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-vn-border">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Risk Score & Action Card (4 cols) */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-vn-surface/90 border border-vn-border text-center">
              <div className="flex items-center gap-2 mb-4">
                <Radio className={`w-4 h-4 ${isPlaying ? "text-vn-cyan animate-pulse" : "text-vn-muted"}`} />
                <span className="font-mono text-xs uppercase tracking-widest text-vn-muted">
                  {isPlaying ? "Simulating Stream..." : "Engine Verdict"}
                </span>
              </div>

              {/* Central Risk Dial */}
              <div className="relative w-40 h-40 flex items-center justify-center my-2">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="#1e2c4d"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke={
                      selectedScenario.riskScore > 75
                        ? "#f43f5e"
                        : selectedScenario.riskScore > 50
                        ? "#f97316"
                        : "#10b981"
                    }
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={264}
                    strokeDashoffset={264 - (264 * selectedScenario.riskScore) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-extrabold font-mono tracking-tight text-white">
                    {selectedScenario.riskScore}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-vn-muted">
                    Risk / 100
                  </span>
                </div>
              </div>

              <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${currentBadge.color}`}>
                <BadgeIcon className="w-3.5 h-3.5" />
                {selectedScenario.riskLevel} THREAT
              </div>

              <div className="mt-4 pt-4 border-t border-vn-border/60 w-full">
                <div className="text-[11px] font-mono text-vn-muted uppercase mb-1">Recommended Action</div>
                <div className={`font-mono text-sm font-extrabold tracking-wider ${
                  selectedScenario.action === "BLOCK"
                    ? "text-red-400"
                    : selectedScenario.action === "CHALLENGE"
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}>
                  [{selectedScenario.action}]
                </div>
              </div>
            </div>

            {/* Right: 4 Layer Telemetry Details (8 cols) */}
            <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
              
              {/* Waveform Bar simulation */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-vn-navy/70 border border-vn-border">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-vn-cyan" />
                  <div>
                    <div className="text-xs font-bold text-vn-text">{selectedScenario.name}</div>
                    <div className="text-[11px] font-mono text-vn-muted">16kHz Mono Stream Telemetry</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 h-6">
                  {[40, 75, 90, 60, 85, 45, 95, 30, 70, 85, 50, 65, 80, 40, 90].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-gradient-to-t from-vn-cyan to-vn-indigo rounded-full"
                      style={{
                        height: isPlaying ? `${Math.random() * 80 + 20}%` : `${h}%`,
                        transition: "height 0.2s ease"
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* 4 Layer Meters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Layer 1: Synthetic Voice */}
                <div className="p-4 rounded-xl bg-vn-surface/60 border border-vn-border">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono text-vn-muted">Layer 1 · Synthetic Prob</span>
                    <span className="font-mono font-bold text-vn-cyan">
                      {(selectedScenario.syntheticProb * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-vn-navy h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ${
                        selectedScenario.syntheticProb > 0.5 ? "bg-red-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${selectedScenario.syntheticProb * 100}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[10px] text-vn-muted">
                    Wav2Vec2 acoustic artifact detector
                  </div>
                </div>

                {/* Layer 2: Speaker Verification */}
                <div className="p-4 rounded-xl bg-vn-surface/60 border border-vn-border">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono text-vn-muted">Layer 2 · Voiceprint Match</span>
                    <span className={`font-mono font-bold ${selectedScenario.speakerMatch ? "text-emerald-400" : "text-red-400"}`}>
                      {selectedScenario.speakerMatch ? "MATCHED" : "MISMATCH"} ({(selectedScenario.speakerSim * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-vn-navy h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ${
                        selectedScenario.speakerMatch ? "bg-emerald-500" : "bg-red-500"
                      }`}
                      style={{ width: `${selectedScenario.speakerSim * 100}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[10px] text-vn-muted">
                    ECAPA-TDNN 192-dim speaker embeddings
                  </div>
                </div>

                {/* Layer 3: Anti-Spoof Liveness */}
                <div className="p-4 rounded-xl bg-vn-surface/60 border border-vn-border">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono text-vn-muted">Layer 3 · Liveness & Replay</span>
                    <span className={`font-mono font-bold ${
                      selectedScenario.livenessStatus === "PASS"
                        ? "text-emerald-400"
                        : selectedScenario.livenessStatus === "FAIL"
                        ? "text-red-400"
                        : "text-amber-400"
                    }`}>
                      {selectedScenario.livenessStatus}
                    </span>
                  </div>
                  <div className="w-full bg-vn-navy h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ${
                        selectedScenario.livenessStatus === "PASS"
                          ? "w-full bg-emerald-500"
                          : selectedScenario.livenessStatus === "FAIL"
                          ? "w-1/4 bg-red-500"
                          : "w-2/3 bg-amber-500"
                      }`}
                    />
                  </div>
                  <div className="mt-2 text-[10px] text-vn-muted">
                    Spectral flux & dynamic repetition analysis
                  </div>
                </div>

                {/* Layer 4: Scam Intent Flags */}
                <div className="p-4 rounded-xl bg-vn-surface/60 border border-vn-border">
                  <div className="text-xs font-mono text-vn-muted mb-2">Layer 4 · Triggered Intent Vectors</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedScenario.intentFlags.map((flag) => (
                      <span
                        key={flag}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          flag === "SAFE_NORMAL"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        #{flag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-[10px] text-vn-muted">
                    faster-whisper STT + heuristic pressure rules
                  </div>
                </div>

              </div>

              {/* Live Transcript Box */}
              <div className="p-4 rounded-xl bg-vn-navy border border-vn-border/70">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-vn-muted uppercase tracking-wider">
                    Audio Transcript & Pattern Extraction
                  </span>
                  <span className="text-[10px] font-mono text-vn-cyan">ASR: faster-whisper</span>
                </div>
                <p className="text-sm font-mono text-vn-text/90 leading-relaxed">
                  &ldquo;{renderHighlightedTranscript(selectedScenario.transcript, selectedScenario.highlightWords)}&rdquo;
                </p>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <p className="text-xs text-vn-muted max-w-md">
                  <strong className="text-vn-text">Defense Strategy:</strong> {selectedScenario.recommendation}
                </p>
                <Link
                  href={`/simulator`}
                  className="inline-flex items-center gap-2 text-xs font-mono font-bold text-vn-cyan hover:underline"
                >
                  Run full attack in SOC Console
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

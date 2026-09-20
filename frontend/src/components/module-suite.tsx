"use client";

import Link from "next/link";
import { 
  MonitorPlay, 
  ShieldAlert, 
  Database, 
  Smartphone, 
  ArrowUpRight,
  Radio,
  Cpu,
  Fingerprint,
  Lock
} from "lucide-react";
import Reveal from "@/components/reveal";

const MODULES = [
  {
    title: "SOC Command Console",
    tag: "LIVE OPERATIONS",
    tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    href: "/demo",
    icon: MonitorPlay,
    iconColor: "text-emerald-400",
    glowColor: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.25)]",
    borderColor: "hover:border-emerald-500/40",
    badge: "Active Intercept",
    description:
      "Full Security Operations Center dashboard. Stream live microphone audio over WebSockets, inspect rolling 3.0s telemetry, test interactive challenge-response verification, and enroll trusted speaker voiceprints.",
    features: [
      "Real-time WebSocket audio streaming",
      "Dynamic 4-layer threat breakdown",
      "Biometric voiceprint enrollment",
      "Interactive OTP & phrase challenge"
    ]
  },
  {
    title: "Threat Attack Simulator",
    tag: "ADVERSARIAL REPLAY",
    tagColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    href: "/simulator",
    icon: ShieldAlert,
    iconColor: "text-rose-400",
    glowColor: "group-hover:shadow-[0_0_30px_rgba(244,63,94,0.25)]",
    borderColor: "hover:border-rose-500/40",
    badge: "Multi-Vector Tests",
    description:
      "Execute pre-configured cyber threat scenarios. Watch the neural pipeline progressively dissect CFO wire transfer scams, high-fidelity deepfake clones, and synthetic voice replay injections in real time.",
    features: [
      "Real-world audio fraud scenarios",
      "Synchronized audio player & progress",
      "Progressive layer revelation",
      "Automated threat vector scoring"
    ]
  },
  {
    title: "Tamper-Evident Ledger",
    tag: "CRYPTOGRAPHIC AUDIT",
    tagColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    href: "/ledger",
    icon: Database,
    iconColor: "text-purple-400",
    glowColor: "group-hover:shadow-[0_0_30px_rgba(168,85,247,0.25)]",
    borderColor: "hover:border-purple-500/40",
    badge: "SHA-256 Chain",
    description:
      "Immutable forensic evidence chain. Every flagged impersonation incident is hashed and chained into a tamper-evident blockchain with cryptographic validation and live simulated DB tampering.",
    features: [
      "Cryptographic block hash links",
      "Full incident forensic telemetry",
      "Live chain integrity verifier",
      "Interactive DB tamper simulation"
    ]
  },
  {
    title: "Mobile Zero-Trust Pairing",
    tag: "CROSS-DEVICE",
    tagColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    href: "/mobile-demo",
    icon: Smartphone,
    iconColor: "text-cyan-400",
    glowColor: "group-hover:shadow-[0_0_30px_rgba(0,229,255,0.25)]",
    borderColor: "hover:border-cyan-500/40",
    badge: "QR Handshake",
    description:
      "Bridge physical mobile calls to enterprise security. Scan an encrypted QR code with any smartphone to stream live audio directly into the central SOC terminal with zero client-side installation.",
    features: [
      "Dynamic session QR generation",
      "No-app mobile web client",
      "Continuous biometric authentication",
      "Real-time synchronized terminal telemetry"
    ]
  }
];

export default function ModuleSuite() {
  return (
    <section id="modules" className="vn-section relative py-20">
      <div className="vn-container">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-vn-cyan/30 bg-vn-cyan/10 text-vn-cyan font-mono text-xs font-semibold uppercase tracking-widest mb-4">
              <Cpu className="w-3.5 h-3.5" />
              Unified Cyber Defense Platform
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-vn-text sm:text-4xl">
              Enterprise Voice Security Suite
            </h2>
            <p className="mt-4 text-base leading-relaxed text-vn-muted">
              Explore four fully interactive defense modules engineered for Smart India Hackathon 2026.
              From live SOC operations to cross-device mobile pairing.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MODULES.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <Reveal key={mod.title} delay={idx * 100}>
                <Link
                  href={mod.href}
                  className={`group relative glass-panel p-7 rounded-2xl border border-vn-border/80 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 ${mod.borderColor} ${mod.glowColor}`}
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <div className="flex items-center gap-3">
                        <span className={`p-3 rounded-xl bg-white/5 border border-white/10 ${mod.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-6 h-6" />
                        </span>
                        <div>
                          <span className={`text-[10px] font-mono font-bold tracking-widest px-2.5 py-0.5 rounded-full border ${mod.tagColor}`}>
                            {mod.tag}
                          </span>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 font-mono text-xs text-vn-muted group-hover:text-vn-cyan transition-colors">
                        Launch
                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-vn-text mb-2 group-hover:text-white transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-sm text-vn-muted leading-relaxed mb-6">
                      {mod.description}
                    </p>
                  </div>

                  {/* Bullet features */}
                  <div className="pt-4 border-t border-vn-border/60">
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-vn-muted">
                      {mod.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-vn-cyan/60" />
                          <span className="truncate">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

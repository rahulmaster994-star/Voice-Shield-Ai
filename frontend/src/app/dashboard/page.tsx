'use client';

import { useStore } from '@/store/useStore';
import AudioRecorder from '@/components/AudioRecorder';
import { Shield, ShieldAlert, ShieldBan, ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  const { 
    risk, 
    voiceAuthenticity, 
    identityVerification, 
    liveness, 
    replay, 
    intentAnalysis,
    telemetry
  } = useStore();

  const getRiskColor = (level: string) => {
    switch(level) {
      case 'LOW': return 'text-green-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'HIGH': return 'text-orange-500';
      case 'CRITICAL': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getRiskIcon = (level: string) => {
    switch(level) {
      case 'LOW': return <ShieldCheck className="w-12 h-12 text-green-400" />;
      case 'MEDIUM': return <Shield className="w-12 h-12 text-yellow-400" />;
      case 'HIGH': return <ShieldAlert className="w-12 h-12 text-orange-500" />;
      case 'CRITICAL': return <ShieldBan className="w-12 h-12 text-red-500" />;
      default: return <Shield className="w-12 h-12 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-200 p-6 font-sans selection:bg-green-500/30">
      <header className="mb-8 border-b border-gray-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-wider text-white">
            <span className="text-green-500">VOICE SHIELD</span> AI
          </h1>
          <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest">Security Operations Center</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase tracking-widest">System Status</div>
            <div className="text-green-400 glow-green font-bold text-sm">ONLINE</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column - Controls */}
        <div className="glass-panel p-6 rounded-xl flex flex-col items-center">
          <h2 className="text-lg font-semibold mb-6 text-gray-300 w-full border-b border-gray-800 pb-2">Live Monitor</h2>
          <AudioRecorder className="my-8" />
          
          <div className="w-full mt-auto">
            <div className="text-xs text-gray-500 mb-1 flex justify-between">
              <span>Speech Detected</span>
              <span className={telemetry?.speech_detected ? "text-green-400" : "text-gray-600"}>
                {telemetry?.speech_detected ? "YES" : "NO"}
              </span>
            </div>
            <div className="text-xs text-gray-500 flex justify-between">
              <span>Energy (RMS)</span>
              <span>{telemetry?.rms_energy?.toFixed(4) || "0.0000"}</span>
            </div>
          </div>
        </div>

        {/* Center Columns - Risk Analysis */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Main Risk Status */}
          <div className="glass-panel p-6 rounded-xl flex items-center gap-6">
            <div className="shrink-0 p-4 bg-black/50 rounded-full border border-gray-800">
              {getRiskIcon(risk?.risk_level || 'UNKNOWN')}
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-400 uppercase tracking-wider mb-1">Overall Threat Level</div>
              <div className={`text-4xl font-bold ${getRiskColor(risk?.risk_level || 'UNKNOWN')}`}>
                {risk?.risk_level || 'AWAITING AUDIO'}
              </div>
            </div>
            {risk && (
              <div className="text-right">
                <div className="text-sm text-gray-400 uppercase tracking-wider mb-1">Risk Score</div>
                <div className="text-3xl font-mono text-white">{risk.risk_score} / 100</div>
              </div>
            )}
          </div>

          {/* AI Signals Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Deepfake */}
            <div className="glass-panel p-5 rounded-xl">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Deepfake / Synthetic</div>
              <div className="text-2xl font-mono mb-1">
                {(voiceAuthenticity?.synthetic_probability * 100)?.toFixed(1) || 0}%
              </div>
              <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${voiceAuthenticity?.synthetic_probability > 0.5 ? 'bg-red-500 glow-box-red' : 'bg-green-500 glow-box-green'}`}
                  style={{ width: `${(voiceAuthenticity?.synthetic_probability || 0) * 100}%` }}
                />
              </div>
            </div>

            {/* Replay */}
            <div className="glass-panel p-5 rounded-xl">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Replay Detection</div>
              <div className="text-2xl font-mono mb-1">
                {(replay?.replay_probability * 100)?.toFixed(1) || 0}%
              </div>
              <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${replay?.replay_probability > 0.5 ? 'bg-red-500 glow-box-red' : 'bg-green-500 glow-box-green'}`}
                  style={{ width: `${(replay?.replay_probability || 0) * 100}%` }}
                />
              </div>
            </div>

            {/* Liveness */}
            <div className="glass-panel p-5 rounded-xl">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Liveness Status</div>
              <div className={`text-xl font-bold ${liveness?.status === 'FAIL' ? 'text-red-500' : liveness?.status === 'PASS' ? 'text-green-500' : 'text-yellow-500'}`}>
                {liveness?.status || 'UNKNOWN'}
              </div>
              <div className="text-xs text-gray-400 mt-2 truncate">
                {liveness?.reasons?.[0] || 'No alerts'}
              </div>
            </div>

            {/* Identity */}
            <div className="glass-panel p-5 rounded-xl">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Speaker Verification</div>
              <div className={`text-xl font-bold ${identityVerification?.match ? 'text-green-500' : 'text-red-500'}`}>
                {identityVerification?.match ? 'MATCHED' : 'MISMATCH'}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Sim: {(identityVerification?.similarity * 100)?.toFixed(1) || 0}% 
                ({identityVerification?.speaker_name || 'Unregistered'})
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Intent & Transcripts */}
        <div className="glass-panel p-6 rounded-xl flex flex-col">
          <h2 className="text-lg font-semibold mb-4 text-gray-300 border-b border-gray-800 pb-2">Conversation Risk</h2>
          
          <div className="mb-6">
            <div className="text-xs text-gray-500 uppercase mb-2">Social Engineering Flags</div>
            <div className="flex flex-wrap gap-2">
              {intentAnalysis?.triggered_intents?.length > 0 ? (
                intentAnalysis.triggered_intents.map((intent: string) => (
                  <span key={intent} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded">
                    {intent.replace('_', ' ').toUpperCase()}
                  </span>
                ))
              ) : (
                <span className="px-2 py-1 text-xs bg-green-500/10 text-green-500 border border-green-500/20 rounded">
                  SAFE / NORMAL
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="text-xs text-gray-500 uppercase mb-2">Live Transcript</div>
            <div className="flex-1 overflow-y-auto bg-black/40 rounded-lg p-3 text-sm text-gray-300 font-mono border border-gray-800">
              {intentAnalysis?.transcript || <span className="text-gray-600 italic">Awaiting speech...</span>}
            </div>
          </div>
          
          {risk?.reasons?.length > 0 && (
            <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
              <div className="text-xs text-red-400 uppercase mb-2 font-semibold">Threat Vectors Detected</div>
              <ul className="text-xs text-red-300/80 space-y-1 list-disc pl-4">
                {risk.reasons.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

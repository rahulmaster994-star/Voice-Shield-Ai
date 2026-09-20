'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { API_BASE } from '@/lib/api';
import { Play, Square, Activity, Radio, ShieldAlert } from 'lucide-react';
import SocMenuBar from '@/components/soc-menu-bar';
import GalaxyBackground from '@/components/GalaxyBackground';

export default function Simulator() {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const { updateState, risk } = useStore();

  useEffect(() => {
    fetch(`${API_BASE}/demo/scenarios`)
      .then(res => res.json())
      .then(data => setScenarios(data.scenarios))
      .catch(err => console.error(err));
  }, []);

  const stopSimulation = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsRunning(false);
    setActiveScenario(null);
    setProgress(0);
  };

  const runScenario = async (id: string, file_path: string) => {
    stopSimulation(); // reset
    setIsRunning(true);
    setActiveScenario(id);
    
    // reset global state for the dashboard UI
    updateState({
      voiceAuthenticity: null,
      identityVerification: null,
      liveness: null,
      replay: null,
      intentAnalysis: null,
      risk: null,
      prevention: null
    });

    // Extract filename from the file_path to play the static file
    const filename = file_path.split(/[/\\]/).pop();
    const audioUrl = `${API_BASE}/static/audio/${filename}`;
    
    // Play Audio
    audioRef.current = new Audio(audioUrl);
    audioRef.current.play().catch(e => console.error("Audio play failed", e));
    
    // Simulate real-time progress bar
    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return p + 5;
      });
    }, 200);

    try {
      const res = await fetch(`${API_BASE}/demo/run/${id}`, { method: 'POST' });
      const data = await res.json();
      
      // We got the full result, let's reveal it progressively for dramatic effect
      setTimeout(() => {
        updateState({ voiceAuthenticity: data.voice_authenticity, liveness: data.liveness });
        setProgress(60);
      }, 500);

      setTimeout(() => {
        updateState({ identityVerification: data.identity_verification, replay: data.replay });
        setProgress(80);
      }, 1500);

      setTimeout(() => {
        updateState({ intentAnalysis: data.intent_analysis });
        setProgress(90);
      }, 2500);

      setTimeout(() => {
        setProgress(100);
        updateState({ risk: data.risk, prevention: data.prevention });
        setIsRunning(false);
        setActiveScenario(null);
        clearInterval(progressInterval);
      }, 3500);

    } catch (err) {
      console.error(err);
      setIsRunning(false);
      setActiveScenario(null);
      clearInterval(progressInterval);
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-gray-200 relative overflow-x-hidden">
      <GalaxyBackground
        threatLevel={risk?.risk_level || (isRunning ? 'HIGH' : 'LOW')}
        isAudioActive={isRunning}
      />
      <SocMenuBar currentRoute="/simulator" />

      <main className="max-w-7xl mx-auto p-6 relative z-10">
        <header className="mb-8 border-b border-vn-border/60 pb-4 relative z-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-wider text-white flex items-center gap-3">
            <Activity className="text-cyan-400 animate-pulse" size={32} />
            <span className="text-cyan-400 glow-blue">LIVE INTERCEPT</span> SIMULATOR
          </h1>
          <p className="text-gray-400 text-sm mt-2 uppercase tracking-widest font-mono">
            Intercept calls & observe SOC pipeline execution
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        
        {/* Scenario List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="text-red-500 animate-pulse" size={20} />
            <h2 className="text-xl text-gray-200 font-bold uppercase tracking-widest">Active Channels</h2>
          </div>
          
          {scenarios.map(sc => {
            const isActive = activeScenario === sc.id;
            return (
              <div 
                key={sc.id} 
                className={`glass-panel p-5 rounded-xl border transition-all duration-300 ${
                  isActive ? 'border-cyan-500 glow-box-blue bg-cyan-900/20' : 'border-gray-800 hover:border-gray-600'
                } flex items-center justify-between`}
              >
                <div>
                  <h3 className={`font-bold text-lg uppercase tracking-wide ${isActive ? 'text-cyan-400 glow-blue' : 'text-white'}`}>
                    {sc.title}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1 font-mono">{sc.description}</p>
                </div>
                
                <button
                  disabled={isRunning && !isActive}
                  onClick={() => isActive ? stopSimulation() : runScenario(sc.id, sc.file)}
                  className={`ml-4 p-4 rounded-full transition-all flex-shrink-0 ${
                    isActive 
                      ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(255,0,0,0.6)]' 
                      : 'bg-cyan-900/30 text-cyan-400 hover:bg-cyan-800/50 hover:shadow-[0_0_10px_rgba(0,229,255,0.4)] disabled:opacity-20'
                  }`}
                >
                  {isActive ? <Square size={24} /> : <Play size={24} className="ml-1" />}
                </button>
              </div>
            );
          })}
        </div>

        {/* Results Panel */}
        <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center min-h-[500px] border border-gray-800 relative overflow-hidden">
          {/* Scanning Animation Background */}
          {isRunning && (
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,229,255,0.1)_50%,transparent_100%)] h-[20%] w-full animate-[scanlines_2s_linear_infinite]" />
          )}

          {!risk && !isRunning ? (
            <div className="flex flex-col items-center opacity-50">
              <ShieldAlert size={64} className="text-gray-600 mb-4" />
              <div className="text-gray-500 uppercase tracking-widest font-mono text-center typewriter">
                NO ACTIVE INTERCEPTS...
              </div>
            </div>
          ) : (
            <div className="w-full z-10 relative">
              
              {isRunning && (
                <div className="mb-8 w-full">
                  <div className="flex justify-between text-xs text-cyan-400 font-mono mb-2">
                    <span>ANALYZING AUDIO STREAM</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.8)] transition-all duration-300" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                  
                  {/* Fake Audio Waveform */}
                  <div className="flex items-end justify-center gap-1 h-16 mt-6 opacity-70">
                    {Array.from({length: 40}).map((_, i) => (
                      <div 
                        key={i}
                        className="w-1 bg-cyan-400"
                        style={{
                          height: `${Math.max(10, Math.random() * 100)}%`,
                          animation: `pulse ${0.5 + Math.random()}s infinite alternate`
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {risk && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center mb-8">
                    <div className="text-xs uppercase text-gray-500 font-mono mb-2">Final Threat Assessment</div>
                    <div className={`text-6xl font-black mb-2 tracking-tighter ${
                      risk.risk_level === 'CRITICAL' || risk.risk_level === 'HIGH' ? 'text-red-500 glow-red' : 'text-green-500 glow-green'
                    }`}>
                      {risk.risk_level}
                    </div>
                    <div className="text-gray-300 font-mono bg-black/40 inline-block px-4 py-1 rounded-full border border-gray-700">
                      Score: {risk.risk_score} / 100
                    </div>
                  </div>

                  <div className="bg-black/60 p-5 rounded-xl border border-gray-800 backdrop-blur-md">
                    <h4 className="text-xs uppercase text-gray-400 mb-4 font-mono border-b border-gray-800 pb-2">Analysis Telemetry</h4>
                    <div className="space-y-3 text-sm text-gray-200 font-mono">
                      {[
                        { label: 'Synthetic Voice', val: risk.breakdown.synthetic_voice_risk },
                        { label: 'Identity Mismatch', val: risk.breakdown.identity_mismatch_risk },
                        { label: 'Replay Attack', val: risk.breakdown.replay_risk },
                        { label: 'Liveness Failure', val: risk.breakdown.liveness_risk },
                        { label: 'Malicious Intent', val: risk.breakdown.intent_risk }
                      ].map(item => (
                        <div key={item.label} className="flex justify-between items-center group">
                          <span className="text-gray-400 group-hover:text-white transition-colors">{item.label}</span>
                          <span className={`font-bold ${item.val > 0.5 ? 'text-red-400 glow-red' : 'text-green-400 glow-green'}`}>
                            {(item.val * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </main>
    </div>
  );
}

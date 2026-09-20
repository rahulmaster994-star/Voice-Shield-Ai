'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AudioRecorder from '@/components/AudioRecorder';
import { useStore } from '@/store/useStore';
import { API_BASE } from '@/lib/api';
import { Shield } from 'lucide-react';

export default function MobileClient() {
  const params = useParams();
  const sessionId = params.session_id as string;
  const [joined, setJoined] = useState(false);
  const { risk, setSessionId } = useStore();

  useEffect(() => {
    if (sessionId) {
      setSessionId(sessionId);
      fetch(`${API_BASE}/session/join/${sessionId}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data.success) setJoined(true);
        })
        .catch(err => console.error(err));
    }
  }, [sessionId, setSessionId]);

  if (!joined) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Connecting to session...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col p-6 items-center">
      <header className="w-full text-center mb-12 mt-8">
        <Shield className="w-12 h-12 text-green-500 mx-auto mb-2" />
        <h1 className="text-2xl font-bold tracking-widest text-green-500">VOICE SHIELD</h1>
        <p className="text-xs text-gray-500 uppercase">Mobile Remote Agent</p>
      </header>
      
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        <AudioRecorder className="mb-12 scale-150 transform" />
        
        <div className="glass-panel w-full p-6 rounded-2xl text-center mt-12">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Live Risk Status</div>
          <div className={`text-3xl font-bold ${
            risk?.risk_level === 'CRITICAL' || risk?.risk_level === 'HIGH' ? 'text-red-500 glow-red' : 
            risk?.risk_level === 'MEDIUM' ? 'text-yellow-500' : 
            risk?.risk_level === 'LOW' ? 'text-green-500 glow-green' : 'text-gray-500'
          }`}>
            {risk?.risk_level || 'AWAITING AUDIO'}
          </div>
          {risk?.reasons?.[0] && (
            <div className="text-xs text-red-400 mt-4 truncate">
              Alert: {risk.reasons[0]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api';
import { ShieldCheck, ShieldAlert, FileSearch, HardDrive, RefreshCw, AlertTriangle } from 'lucide-react';
import SocMenuBar from '@/components/soc-menu-bar';
import GalaxyBackground from '@/components/GalaxyBackground';

export default function LedgerExplorer() {
  const [validation, setValidation] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [tampering, setTampering] = useState(false);

  const fetchLedger = () => {
    fetch(`${API_BASE}/ledger`)
      .then(res => res.json())
      .then(data => setValidation(data))
      .catch(err => console.error(err));
  };

  const fetchIncidents = () => {
    fetch(`${API_BASE}/incidents`)
      .then(res => res.json())
      .then(data => setIncidents(data.incidents || []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchLedger();
    fetchIncidents();
  }, []);

  const simulateTamper = async () => {
    if (incidents.length === 0) {
      alert("No incidents to tamper with. Run a simulator attack first.");
      return;
    }
    setTampering(true);
    // Tamper with block 1 (genesis is 0)
    try {
      await fetch(`${API_BASE}/ledger/tamper/1`, { method: 'POST' });
      fetchLedger();
    } finally {
      setTampering(false);
    }
  };

  const isTampered = validation && !validation.valid;

  return (
    <div className="min-h-screen bg-[#050811] text-gray-200 relative overflow-x-hidden">
      <GalaxyBackground
        threatLevel={isTampered ? "CRITICAL" : "LOW"}
        isAudioActive={tampering}
      />
      <SocMenuBar currentRoute="/ledger" />

      <main className="max-w-7xl mx-auto p-6 relative z-10">
        <header className="mb-8 border-b border-vn-border/60 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-wider text-white">
              <span className="text-cyan-400 glow-blue">TAMPER-EVIDENT</span> LEDGER
            </h1>
            <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest font-mono">Cryptographic Evidence Chain</p>
          </div>
          <div className="flex gap-4">
            <button onClick={fetchLedger} className="flex items-center gap-2 px-4 py-2 bg-[#0c1427]/80 hover:bg-[#13203c] border border-vn-border rounded-xl text-sm transition">
              <RefreshCw size={16} /> Verify Chain
            </button>
            <button disabled={tampering} onClick={simulateTamper} className="flex items-center gap-2 px-4 py-2 bg-red-900/40 hover:bg-red-900/70 border border-red-500/50 text-red-300 rounded-xl text-sm transition">
              <AlertTriangle size={16} /> Simulate DB Tampering
            </button>
          </div>
        </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chain Status */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-xl flex flex-col items-center justify-center text-center">
          {validation ? (
            validation.valid ? (
              <div className="text-green-500">
                <ShieldCheck className="w-24 h-24 mx-auto mb-4 glow-green" />
                <h2 className="text-2xl font-bold mb-2 uppercase tracking-wider">Chain Valid</h2>
                <p className="text-sm text-gray-400">All cryptographic hashes match.</p>
              </div>
            ) : (
              <div className="text-red-500">
                <ShieldAlert className="w-24 h-24 mx-auto mb-4 glow-red animate-pulse" />
                <h2 className="text-2xl font-bold mb-2 uppercase tracking-wider">Tampering Detected</h2>
                <p className="text-sm text-red-400">{validation.message}</p>
              </div>
            )
          ) : (
            <div className="text-gray-500 animate-pulse">Loading Ledger Status...</div>
          )}
        </div>

        {/* Incident Log */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-800 pb-2">Recent Immutable Incidents</h3>
          
          <div className="space-y-4">
            {incidents.length === 0 ? (
              <div className="text-gray-500 text-sm italic">No incidents recorded on the ledger.</div>
            ) : (
              incidents.map((inc) => (
                <div key={inc.incident_id} className="bg-black/40 border border-gray-800 p-4 rounded-lg flex items-start gap-4">
                  <div className="shrink-0 pt-1">
                    <FileSearch className={inc.risk_level === 'CRITICAL' ? 'text-red-500' : 'text-yellow-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-sm text-blue-400">{inc.incident_id}</span>
                      <span className="text-xs text-gray-500">{new Date(inc.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-sm text-gray-300 truncate mb-2">
                      <span className={`font-bold mr-2 ${inc.risk_level === 'CRITICAL' ? 'text-red-500' : 'text-yellow-500'}`}>
                        {inc.risk_level}
                      </span>
                      {inc.reasons?.[0] || 'Unknown reason'}
                    </div>
                    <div className="text-xs text-gray-500 font-mono flex items-center gap-1">
                      <HardDrive size={12} /> Stored on immutable ledger
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}

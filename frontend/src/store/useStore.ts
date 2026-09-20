import { create } from 'zustand';

interface Telemetry {
  rms_energy: number;
  speech_detected: boolean;
  snr_db: number;
}

interface PipelineState {
  isConnected: boolean;
  isRecording: boolean;
  telemetry: Telemetry | null;
  waveform: number[];
  voiceAuthenticity: any;
  identityVerification: any;
  liveness: any;
  replay: any;
  intentAnalysis: any;
  risk: any;
  prevention: any;
  activeChallenge: any;
  sessionId: string | null;
  claimedIdentity: string | null;
  
  setConnected: (status: boolean) => void;
  setRecording: (status: boolean) => void;
  updateState: (data: any) => void;
  updateWaveform: (data: number[]) => void;
  setSessionId: (id: string) => void;
  setClaimedIdentity: (identity: string) => void;
  setChallenge: (challenge: any) => void;
}

export const useStore = create<PipelineState>((set) => ({
  isConnected: false,
  isRecording: false,
  telemetry: null,
  waveform: [],
  voiceAuthenticity: null,
  identityVerification: null,
  liveness: null,
  replay: null,
  intentAnalysis: null,
  risk: null,
  prevention: null,
  activeChallenge: null,
  sessionId: null,
  claimedIdentity: null,

  setConnected: (status) => set({ isConnected: status }),
  setRecording: (status) => set({ isRecording: status }),
  updateState: (data) => set((state) => ({ ...state, ...data })),
  updateWaveform: (waveform) => set({ waveform }),
  setSessionId: (id) => set({ sessionId: id }),
  setClaimedIdentity: (id) => set({ claimedIdentity: id }),
  setChallenge: (challenge) => set({ activeChallenge: challenge }),
}));

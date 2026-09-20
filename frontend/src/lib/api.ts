// Returns the backend API base URL, supporting NEXT_PUBLIC_API_BASE for Vercel/cloud deployments
export const API_BASE = 
  process.env.NEXT_PUBLIC_API_BASE || 
  (typeof window !== 'undefined'
    ? `http://${window.location.hostname}:8000`
    : 'http://localhost:8000');

export function getWebSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window === 'undefined') return 'ws://localhost:8000/ws/analyze';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:8000/ws/analyze`;
}

export async function checkBackendHealth(): Promise<{ status: string; registered_speakers?: string[]; [key: string]: any }> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { status: 'offline' };
    return await res.json();
  } catch {
    return { status: 'offline' };
  }
}

export async function fetchVoices(): Promise<{ voices: string[] }> {
  const res = await fetch(`${API_BASE}/voices`);
  if (!res.ok) throw new Error(`Failed to fetch voices: ${res.status}`);
  return await res.json();
}

export async function registerVoiceprint(name: string, audio: Blob | File): Promise<{ status: string; registered: string; message: string }> {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('audio', audio, audio instanceof File ? audio.name : 'voiceprint.webm');
  const res = await fetch(`${API_BASE}/register-voice`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Registration failed: ${res.status}`);
  }
  return await res.json();
}

export async function issueChallengeRequest(claimedIdentity?: string): Promise<any> {
  const formData = new FormData();
  if (claimedIdentity) formData.append('claimed_identity', claimedIdentity);
  const res = await fetch(`${API_BASE}/challenge/issue`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Challenge issue failed: ${res.status}`);
  return await res.json();
}

export async function verifyChallengeResponse(challengeId: string, audio: Blob | File, claimedIdentity?: string): Promise<any> {
  const formData = new FormData();
  formData.append('challenge_id', challengeId);
  formData.append('audio', audio, audio instanceof File ? audio.name : 'challenge_response.webm');
  if (claimedIdentity) formData.append('claimed_identity', claimedIdentity);
  const res = await fetch(`${API_BASE}/challenge/verify`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Challenge verify failed: ${res.status}`);
  return await res.json();
}

export async function triggerDemoScenario(scenarioId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/demo/run/${scenarioId}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Demo scenario failed: ${res.status}`);
  return await res.json();
}

export async function fetchIncidents(): Promise<{ incidents: any[] }> {
  const res = await fetch(`${API_BASE}/incidents`);
  if (!res.ok) throw new Error(`Fetch incidents failed: ${res.status}`);
  return await res.json();
}

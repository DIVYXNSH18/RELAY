/**
 * api.ts — Typed fetch helpers for the Relay Go backend.
 *
 * All functions use the EXPO_PUBLIC_BACKEND_URL env variable as the base.
 * They match the APIResponse[T] / APIError envelope from models.go.
 */

import Constants from 'expo-constants';

const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  if (typeof window !== 'undefined' && (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1')) {
    return 'http://localhost:8080';
  }
  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (metroHost) {
    return `http://${metroHost}:8080`;
  }
  return 'http://192.168.29.45:8080';
};

const BASE_URL = getBaseUrl();

// ─── Domain Types (mirrors models.go) ────────────────────────────────────────

export type Role = 'Coder' | 'Debugger' | 'Deployer';
export type Significance = 'High' | 'Medium' | 'Suppress';

export interface RelevanceDigest {
  event_id: string;
  summary: string;
  significance: Significance;
  target_roles: Role[];
  diff_snippet: string;
  file_path: string;
  source_user: string;
  created_at: string; // ISO-8601 string
}

export interface WorkspaceEvent {
  id: string;
  source_user: string;
  file_path: string;
  raw_diff: string;
  timestamp: string;
}

export interface RoleSession {
  user: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface TerminalStatus {
  status: string;
  uptime: string;
  total_events: number;
  total_digests: number;
  sessions: number;
  timestamp: string;
  logs: string[];
}

interface APIResponse<T> {
  data: T;
}

// ─── Fetch Helpers ────────────────────────────────────────────────────────────

/**
 * Returns all currently active role sessions (online teammates).
 * Endpoint: GET /api/v1/sessions
 */
export async function getSessions(): Promise<RoleSession[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${BASE_URL}/api/v1/sessions`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`getSessions: ${res.status}`);
    const body: APIResponse<RoleSession[]> = await res.json();
    return body.data ?? [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns the latest non-suppressed digest for the given role.
 * Endpoint: GET /api/v1/digest?role=<role>
 * Returns null when no digest exists yet.
 */
export async function getLatestDigest(role: Role): Promise<RelevanceDigest | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${BASE_URL}/api/v1/digest?role=${role}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`getLatestDigest: ${res.status}`);
    const body: APIResponse<RelevanceDigest> = await res.json();
    return body.data ?? null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns full history of all digests.
 * Endpoint: GET /api/v1/digests
 */
export async function getDigestsHistory(): Promise<RelevanceDigest[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${BASE_URL}/api/v1/digests`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const body: APIResponse<RelevanceDigest[]> = await res.json();
    return body.data ?? [];
  } catch (e) {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns full history of all raw workspace events.
 * Endpoint: GET /api/v1/events
 */
export async function getEventsHistory(): Promise<WorkspaceEvent[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${BASE_URL}/api/v1/events`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const body: APIResponse<WorkspaceEvent[]> = await res.json();
    return body.data ?? [];
  } catch (e) {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns terminal status and recent engine logs.
 * Endpoint: GET /api/v1/terminal/logs
 */
export async function getTerminalLogs(): Promise<TerminalStatus | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${BASE_URL}/api/v1/terminal/logs`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body: APIResponse<TerminalStatus> = await res.json();
    return body.data ?? null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Submits a voice/terminal command to the backend.
 * Endpoint: POST /api/v1/cmd
 */
export async function sendCommand(targetUser: string, command: string, intent: Record<string, any> = {}): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/cmd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        target_user: targetUser,
        command: command,
        intent: intent,
      }),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Posts a new workspace event (diff).
 * Endpoint: POST /api/v1/events
 */
export async function postEvent(sourceUser: string, filePath: string, rawDiff: string): Promise<RelevanceDigest | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        source_user: sourceUser,
        file_path: filePath,
        raw_diff: rawDiff,
        timestamp: new Date().toISOString(),
      }),
    });
    if (!res.ok) return null;
    const body: APIResponse<RelevanceDigest> = await res.json();
    return body.data ?? null;
  } catch (e) {
    return null;
  }
}

/**
 * Returns the SSE stream URL for the given role.
 * Use with SSEClient from sse.ts.
 * Endpoint: GET /api/v1/stream?role=<role>
 */
export function getStreamUrl(role: Role): string {
  return `${BASE_URL}/api/v1/stream?role=${role}`;
}

/**
 * Registers or updates the current user's session (role claim).
 * Endpoint: POST /api/v1/sessions
 */
export async function upsertSession(user: string, role: Role): Promise<RoleSession> {
  const res = await fetch(`${BASE_URL}/api/v1/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ user, role }),
  });
  if (!res.ok) throw new Error(`upsertSession: ${res.status}`);
  const body: APIResponse<RoleSession> = await res.json();
  return body.data;
}

// ─── Legacy RelayApi Class Compatibility ────────────────────────────────────

export class RelayApi {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async upsertSession(user: string, role: Role): Promise<RoleSession> {
    return upsertSession(user, role);
  }

  async getLatestDigest(role: Role): Promise<RelevanceDigest | null> {
    return getLatestDigest(role);
  }

  async getSessions(): Promise<RoleSession[]> {
    return getSessions();
  }

  async postEvent(sourceUser: string, filePath: string, rawDiff: string): Promise<RelevanceDigest | null> {
    return postEvent(sourceUser, filePath, rawDiff);
  }
}

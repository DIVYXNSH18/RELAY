/**
 * relayClient.ts — Typed HTTP client for the Relay context engine backend.
 *
 * Design principles:
 *  - All methods are async and return typed results.
 *  - Network errors are caught and surfaced as RelayApiError instances so
 *    callers can distinguish transport failures from application errors.
 *  - No global state — the client is constructed with a base URL and reused.
 *  - Request timeouts are enforced via AbortController to prevent hanging.
 */

export interface RelevanceDigest {
  event_id: string;
  summary: string;
  significance: 'High' | 'Medium' | 'Suppress';
  target_roles: string[];
  diff_snippet: string;
  file_path: string;
  source_user: string;
  created_at: string;
}

export interface RoleSession {
  user: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface PendingCommand {
  id: string;
  target_user: string;
  command: string;
  intent: Record<string, unknown>;
  digest_event_id: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  code: string;
  message: string;
}

/** Represents a failure from the Relay backend or from the network. */
export class RelayApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'RelayApiError';
  }
}

const DEFAULT_TIMEOUT_MS = 8_000;

export class RelayClient {
  constructor(private readonly baseUrl: string) {}

  // ─── Events ──────────────────────────────────────────────────────────────

  /** Push a diff event from the IDE to the context engine. */
  async postEvent(payload: {
    source_user: string;
    file_path: string;
    raw_diff: string;
    timestamp: string;
  }): Promise<RelevanceDigest> {
    const res = await this.fetch<ApiResponse<RelevanceDigest>>(
      '/api/v1/events',
      { method: 'POST', body: JSON.stringify(payload) },
    );
    return res.data;
  }

  // ─── Digest ───────────────────────────────────────────────────────────────

  /** Fetch the latest relevant digest for a given role. */
  async getDigest(role: string): Promise<RelevanceDigest | null> {
    try {
      const res = await this.fetch<ApiResponse<RelevanceDigest>>(
        `/api/v1/digest?role=${encodeURIComponent(role)}`,
        { method: 'GET' },
      );
      return res.data;
    } catch (err) {
      if (err instanceof RelayApiError && err.statusCode === 404) {
        return null; // No digest yet — not an error
      }
      throw err;
    }
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  /** Register or update the caller's role session. */
  async upsertSession(user: string, role: string): Promise<RoleSession> {
    const res = await this.fetch<ApiResponse<RoleSession>>(
      '/api/v1/sessions',
      { method: 'POST', body: JSON.stringify({ user, role }) },
    );
    return res.data;
  }

  /** List all active sessions and roles in the team workspace. */
  async listSessions(): Promise<RoleSession[]> {
    try {
      const res = await this.fetch<ApiResponse<RoleSession[]>>(
        '/api/v1/sessions',
        { method: 'GET' },
      );
      return res.data ?? [];
    } catch {
      return [];
    }
  }

  // ─── Pending Commands ─────────────────────────────────────────────────────

  /**
   * Poll for a pending voice command for this user.
   * Returns null if no command is waiting (204 No Content).
   * This is consume-once: the command is deleted server-side on retrieval.
   */
  async consumeCommand(user: string): Promise<PendingCommand | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const resp = await fetch(
        `${this.baseUrl}/api/v1/pending-cmd?user=${encodeURIComponent(user)}`,
        { signal: controller.signal },
      );
      if (resp.status === 204) { return null; }
      if (!resp.ok) { return null; }
      const body = await resp.json() as ApiResponse<PendingCommand>;
      return body.data;
    } catch {
      return null; // Polling failures are non-fatal
    } finally {
      clearTimeout(timer);
    }
  }

  // ─── Health ───────────────────────────────────────────────────────────────

  /** Returns true if the backend is reachable. */
  async isHealthy(): Promise<boolean> {
    try {
      await this.fetch<{ status: string }>('/health', { method: 'GET' });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Internal fetch wrapper ───────────────────────────────────────────────

  private async fetch<T>(path: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      const resp = await globalThis.fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });

      if (!resp.ok) {
        let code = 'HTTP_ERROR';
        let message = `HTTP ${resp.status}`;
        try {
          const err = await resp.json() as ApiError;
          code = err.code ?? code;
          message = err.message ?? message;
        } catch { /* body was not JSON */ }
        throw new RelayApiError(message, resp.status, code);
      }

      return await resp.json() as T;
    } catch (err) {
      if (err instanceof RelayApiError) { throw err; }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new RelayApiError(`Request to ${path} timed out after ${DEFAULT_TIMEOUT_MS}ms`);
      }
      throw new RelayApiError(`Network error: ${String(err)}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * sse.ts — SSE client for real-time digest push from the Go backend.
 *
 * React Native does not include a built-in EventSource. This implementation
 * uses fetch() with streaming to consume the text/event-stream response.
 * It handles reconnection with exponential backoff automatically.
 *
 * Usage:
 *   const client = new SSEClient(url, (digest) => { ... });
 *   client.connect();
 *   // ... later:
 *   client.disconnect();
 */

import { RelevanceDigest } from './api';

type DigestHandler = (digest: RelevanceDigest) => void;
type ErrorHandler = (err: Error) => void;

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

export class SSEClient {
  private abortController: AbortController | null = null;
  private reconnectDelay = RECONNECT_BASE_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    private readonly url: string,
    private readonly onDigest: DigestHandler,
    private readonly onError?: ErrorHandler,
  ) {}

  /** Open the SSE connection. Reconnects automatically on failure. */
  connect(): void {
    this.stopped = false;
    this.openStream();
  }

  /** Permanently close the connection and stop reconnection attempts. */
  disconnect(): void {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.abortController?.abort();
    this.abortController = null;
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private openStream(): void {
    if (this.stopped) return;

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    fetch(this.url, { signal })
      .then(async (resp) => {
        if (!resp.ok || !resp.body) {
          throw new Error(`SSE: server returned ${resp.status}`);
        }
        // Reset backoff on successful connection.
        this.reconnectDelay = RECONNECT_BASE_MS;

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done || this.stopped) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE events are separated by double newlines.
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? ''; // Last element may be incomplete

          for (const event of events) {
            const dataLine = event
              .split('\n')
              .find((l) => l.startsWith('data:'));
            if (!dataLine) continue;

            const jsonStr = dataLine.slice('data:'.length).trim();
            if (!jsonStr) continue;

            try {
              const digest = JSON.parse(jsonStr) as RelevanceDigest;
              this.onDigest(digest);
            } catch {
              // Malformed JSON — skip silently
            }
          }
        }
      })
      .catch((err: Error) => {
        if (this.stopped || err.name === 'AbortError') return;
        this.onError?.(err);
        this.scheduleReconnect();
      });
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
      this.openStream();
    }, this.reconnectDelay);
  }
}

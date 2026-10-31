/**
 * config.ts — Typed wrapper around VS Code workspace configuration for Relay.
 *
 * All settings reads go through this module so:
 *  1. Types are enforced in one place.
 *  2. Defaults are centralised — no magic strings scattered across the codebase.
 *  3. Other modules never call `vscode.workspace.getConfiguration` directly.
 */

import * as vscode from 'vscode';

export type RelayRole = 'Coder' | 'Debugger' | 'Deployer';

export interface RelayConfig {
  backendUrl: string;
  username: string;
  role: RelayRole;
  debounceMs: number;
  enabled: boolean;
}

const SECTION = 'relay';

/**
 * Reads the current Relay configuration from VS Code workspace settings.
 * Returns a fully-typed, immutable snapshot — call this each time you need
 * fresh values rather than caching, since settings may change at runtime.
 */
export function getConfig(): RelayConfig {
  const cfg = vscode.workspace.getConfiguration(SECTION);
  return {
    backendUrl: cfg.get<string>('backendUrl', 'http://localhost:8080').replace(/\/$/, ''),
    username:   cfg.get<string>('username', ''),
    role:       cfg.get<RelayRole>('role', 'Coder'),
    debounceMs: cfg.get<number>('debounceMs', 2000),
    enabled:    cfg.get<boolean>('enabled', true),
  };
}

/**
 * Validates that required config fields are present.
 * Returns an error message string, or null if everything is fine.
 */
export function validateConfig(cfg: RelayConfig): string | null {
  if (!cfg.username.trim()) {
    return 'Relay: username is not set. Please configure relay.username in settings.';
  }
  if (!cfg.backendUrl.startsWith('http')) {
    return `Relay: backendUrl "${cfg.backendUrl}" does not look like a valid URL.`;
  }
  return null;
}

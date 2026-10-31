/**
 * capture.ts — Listens to file save events in VS Code, computes git diffs,
 * and posts WorkspaceEvents to the Relay backend.
 *
 * Key design decisions:
 *  - Debouncing: rapid saves within debounceMs of each other are collapsed
 *    into a single event to avoid flooding the backend.
 *  - Git execution: uses Node's child_process.execSync with a timeout so a
 *    hanging git process cannot freeze VS Code.
 *  - Error isolation: any failure in capture is caught and logged; it never
 *    propagates to VS Code or disrupts the user's workflow.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { execSync } from 'child_process';
import { getConfig } from './config';
import { RelayClient } from './relayClient';
import { StatusBarManager } from './statusBar';

const GIT_TIMEOUT_MS = 5_000;

export class CaptureManager implements vscode.Disposable {
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly disposables: vscode.Disposable[] = [];
  private onDiffSynced?: (digest: any, filePath: string, diffSnippet: string) => void;

  constructor(
    private readonly client: RelayClient,
    private readonly statusBar: StatusBarManager,
    private readonly outputChannel: vscode.OutputChannel,
  ) {}

  /** Register a callback invoked when a diff is successfully synced. */
  public setOnDiffSynced(cb: (digest: any, filePath: string, diffSnippet: string) => void): void {
    this.onDiffSynced = cb;
  }

  /** Start listening to document save events. */
  activate(): void {
    const listener = vscode.workspace.onDidSaveTextDocument(
      (doc) => this.onSave(doc),
    );
    this.disposables.push(listener);
    this.log('Capture listener registered.');
  }

  dispose(): void {
    this.debounceTimers.forEach((t) => clearTimeout(t));
    this.debounceTimers.clear();
    this.disposables.forEach((d) => d.dispose());
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private onSave(doc: vscode.TextDocument): void {
    const cfg = getConfig();
    if (!cfg.enabled || !cfg.username) { return; }

    // Skip unsaved (untitled) files and non-file URIs (e.g. git: scheme).
    if (doc.uri.scheme !== 'file') { return; }

    const filePath = doc.uri.fsPath;

    // Cancel any pending timer for this file (debounce).
    const existing = this.debounceTimers.get(filePath);
    if (existing) { clearTimeout(existing); }

    const timer = setTimeout(
      () => this.captureAndSend(filePath, cfg.username, cfg.role),
      cfg.debounceMs,
    );
    this.debounceTimers.set(filePath, timer);
  }

  private async captureAndSend(
    filePath: string,
    username: string,
    role: string,
  ): Promise<void> {
    this.debounceTimers.delete(filePath);

    const workspaceRoot = this.getWorkspaceRoot(filePath);
    if (!workspaceRoot) {
      this.log(`Skipping ${filePath}: not inside a workspace folder.`);
      return;
    }

    const rawDiff = this.getGitDiff(filePath, workspaceRoot);
    if (!rawDiff.trim()) {
      this.log(`Skipping ${filePath}: no diff (file may not be tracked by git).`);
      return;
    }

    this.log(`Sending diff for ${path.basename(filePath)} (${role})…`);
    this.statusBar.setSyncing();

    try {
      const digest = await this.client.postEvent({
        source_user: username,
        file_path: filePath,
        raw_diff: rawDiff,
        timestamp: new Date().toISOString(),
      });

      this.statusBar.setLastSync(digest.significance, new Date());
      this.log(
        `✓ Synced ${path.basename(filePath)} → ${digest.significance} (${digest.summary})`,
      );
      if (this.onDiffSynced) {
        this.onDiffSynced(digest, filePath, rawDiff.slice(0, 300));
      }
    } catch (err) {
      this.statusBar.setError();
      this.log(`✗ Sync failed: ${String(err)}`);
    }
  }

  /**
   * Runs `git diff HEAD -- <file>` and returns the unified diff string.
   * Returns an empty string if git is unavailable or the file is untracked.
   */
  private getGitDiff(filePath: string, workspaceRoot: string): string {
    try {
      // Use a relative path so the command is portable.
      const relativePath = path.relative(workspaceRoot, filePath);
      const output = execSync(
        `git diff HEAD -- "${relativePath}"`,
        {
          cwd: workspaceRoot,
          encoding: 'utf8',
          timeout: GIT_TIMEOUT_MS,
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      );
      return output;
    } catch (err) {
      // git not available, file not tracked, or repo has no commits yet.
      this.log(`git diff skipped: ${String(err)}`);
      return '';
    }
  }

  /** Returns the workspace folder containing filePath, or undefined. */
  private getWorkspaceRoot(filePath: string): string | undefined {
    const folder = vscode.workspace.getWorkspaceFolder(
      vscode.Uri.file(filePath),
    );
    return folder?.uri.fsPath;
  }

  private log(message: string): void {
    this.outputChannel.appendLine(`[Capture] ${message}`);
  }
}

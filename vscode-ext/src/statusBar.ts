/**
 * statusBar.ts — Manages the Relay status bar item in VS Code.
 *
 * The status bar sits in the bottom bar and provides instant visual feedback:
 *  $(relay-icon) Relay: Coder  ← idle
 *  $(sync~spin)  Relay: Syncing…  ← sending diff
 *  $(check)      Relay: High · 12:01  ← last sync result
 *  $(error)      Relay: Error  ← backend unreachable
 */

import * as vscode from 'vscode';

export class StatusBarManager implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.item.command = 'relay.showStatus';
    this.item.tooltip = 'Relay — click to show status';
    this.setIdle('Coder');
    this.item.show();
  }

  /** Show idle state with the current role. */
  setIdle(role: string): void {
    this.item.text = `$(radio-tower) Relay: ${role}`;
    this.item.backgroundColor = undefined;
    this.item.color = undefined;
  }

  /** Show a spinning sync indicator while a request is in flight. */
  setSyncing(): void {
    this.item.text = '$(sync~spin) Relay: Syncing…';
    this.item.backgroundColor = undefined;
    this.item.color = undefined;
  }

  /** Show the result of the last successful sync. */
  setLastSync(significance: string, at: Date): void {
    const time = at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const icon = significance === 'High' ? '$(warning)' : '$(check)';
    this.item.text = `${icon} Relay: ${significance} · ${time}`;
    this.item.backgroundColor = undefined;
    this.item.color =
      significance === 'High'
        ? new vscode.ThemeColor('statusBarItem.warningBackground')
        : undefined;
  }

  /** Show an error state when the backend is unreachable. */
  setError(): void {
    this.item.text = '$(error) Relay: Error';
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    this.item.color = undefined;
  }

  /** Show that an incoming command was received from the phone. */
  setCommandReceived(): void {
    this.item.text = '$(comment) Relay: Command ▶';
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
  }

  dispose(): void {
    this.item.dispose();
  }
}

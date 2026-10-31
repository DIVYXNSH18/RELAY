/**
 * sidebarView.ts — Activity Bar Sidebar Webview for Relay.
 *
 * Provides a dedicated, persistent panel on the VS Code Activity Bar:
 *  1. Header: Live connection indicator, editable username, and 1-tap role selector chips (Coder, Debugger, Deployer).
 *  2. Chat-like Feed: Chronological stream of team diff digests, file links, and incoming mobile voice commands.
 *  3. Interactive: Clickable file links open directly in VS Code editor.
 *  4. Quick Input: Chat-style bottom bar to post notes or triggers into the session.
 */

import * as vscode from 'vscode';
import { RelayClient, RelevanceDigest, PendingCommand } from './relayClient';
import { getConfig, RelayRole } from './config';
import { StatusBarManager } from './statusBar';

export interface FeedItem {
  id: string;
  type: 'digest' | 'outgoing' | 'command' | 'message';
  author: string;
  role: string;
  timestamp: string;
  summary: string;
  significance?: 'High' | 'Medium' | 'Suppress';
  filePath?: string;
  diffSnippet?: string;
}

export class RelaySidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'relay.sidebarView';

  private _view?: vscode.WebviewView;
  private _feedItems: FeedItem[] = [];
  private _isHealthy = false;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly client: RelayClient,
    private readonly statusBar: StatusBarManager,
    private readonly outputChannel: vscode.OutputChannel,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview();

    // Handle messages from the webview UI
    webviewView.webview.onDidReceiveMessage(async (msg: { type: string; payload?: any }) => {
      switch (msg.type) {
        case 'ready':
          await this._checkHealth();
          await this._sendState();
          break;

        case 'setRole':
          await this._handleSetRole(msg.payload?.role);
          break;

        case 'setUsername':
          await this._handleSetUsername(msg.payload?.username);
          break;

        case 'toggleCapture':
          await this._handleToggleCapture();
          break;

        case 'openFile':
          await this._handleOpenFile(msg.payload?.filePath);
          break;

        case 'sendMessage':
          await this._handleSendMessage(msg.payload?.text);
          break;

        case 'openSettings':
          await vscode.commands.executeCommand('relay.setup');
          break;

        case 'clearFeed':
          this._feedItems = [];
          await this._sendState();
          break;

        case 'checkHealth':
          await this._checkHealth();
          await this._sendState();
          break;
      }
    });
  }

  // ─── Public Feed Methods ───────────────────────────────────────────────────

  /** Add a digest received from a teammate or fetched from backend. */
  public addDigest(digest: RelevanceDigest): void {
    this.addFeedItem({
      type: 'digest',
      author: digest.source_user,
      role: digest.target_roles.includes('Debugger') ? 'Debugger' : 'Coder',
      summary: digest.summary,
      significance: digest.significance,
      filePath: digest.file_path,
      diffSnippet: digest.diff_snippet,
    });
  }

  /** Add an outgoing diff created by the local user. */
  public addOutgoingDiff(filePath: string, summary: string, diffSnippet?: string): void {
    const cfg = getConfig();
    this.addFeedItem({
      type: 'outgoing',
      author: cfg.username || 'You',
      role: cfg.role,
      summary: summary || `Saved ${filePath}`,
      significance: 'Medium',
      filePath,
      diffSnippet,
    });
  }

  /** Add an incoming phone command notification. */
  public addIncomingCommand(cmd: PendingCommand): void {
    this.addFeedItem({
      type: 'command',
      author: 'Phone (Voice)',
      role: 'Mobile',
      summary: `Voice command: "${cmd.command}"`,
      significance: 'High',
    });
  }

  /** Generic feed item inserter. */
  public addFeedItem(item: Omit<FeedItem, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): void {
    const feedItem: FeedItem = {
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: item.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...item,
    };

    // Prepend item to maintain reverse-chronological order
    this._feedItems.unshift(feedItem);
    if (this._feedItems.length > 50) {
      this._feedItems.pop();
    }

    if (this._view) {
      this._view.webview.postMessage({
        type: 'newItem',
        item: feedItem,
      });
    }
  }

  /** Notify webview of external configuration changes. */
  public async notifyConfigChanged(): Promise<void> {
    await this._checkHealth();
    await this._sendState();
  }

  // ─── Private Handlers ──────────────────────────────────────────────────────

  private async _checkHealth(): Promise<void> {
    try {
      this._isHealthy = await this.client.isHealthy();
    } catch {
      this._isHealthy = false;
    }
  }

  private async _sendState(): Promise<void> {
    if (!this._view) { return; }
    const cfg = getConfig();
    await this._view.webview.postMessage({
      type: 'state',
      payload: {
        username: cfg.username,
        role: cfg.role,
        backendUrl: cfg.backendUrl,
        enabled: cfg.enabled,
        isHealthy: this._isHealthy,
        feedItems: this._feedItems,
      },
    });
  }

  private async _handleSetRole(newRole?: RelayRole): Promise<void> {
    if (!newRole || !['Coder', 'Debugger', 'Deployer'].includes(newRole)) { return; }
    await vscode.workspace.getConfiguration('relay').update('role', newRole, vscode.ConfigurationTarget.Global);
    this.statusBar.setIdle(newRole);
    this.outputChannel.appendLine(`Sidebar: role changed to ${newRole}`);

    const cfg = getConfig();
    if (cfg.username) {
      try {
        await this.client.upsertSession(cfg.username, newRole);
      } catch (err) {
        this.outputChannel.appendLine(`Sidebar: session update failed: ${String(err)}`);
      }
    }
    await this._sendState();
  }

  private async _handleSetUsername(newUsername?: string): Promise<void> {
    if (!newUsername) { return; }
    const trimmed = newUsername.trim();
    await vscode.workspace.getConfiguration('relay').update('username', trimmed, vscode.ConfigurationTarget.Global);
    this.outputChannel.appendLine(`Sidebar: username changed to ${trimmed}`);

    const cfg = getConfig();
    if (trimmed) {
      try {
        await this.client.upsertSession(trimmed, cfg.role);
      } catch (err) {
        this.outputChannel.appendLine(`Sidebar: session update failed: ${String(err)}`);
      }
    }
    await this._sendState();
  }

  private async _handleToggleCapture(): Promise<void> {
    const cfg = getConfig();
    const newValue = !cfg.enabled;
    await vscode.workspace.getConfiguration('relay').update('enabled', newValue, vscode.ConfigurationTarget.Global);
    this.outputChannel.appendLine(`Sidebar: capture set to ${newValue}`);
    await this._sendState();
  }

  private async _handleOpenFile(filePath?: string): Promise<void> {
    if (!filePath) { return; }
    try {
      let targetUri: vscode.Uri | undefined;
      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const root = vscode.workspace.workspaceFolders[0].uri;
        targetUri = vscode.Uri.joinPath(root, filePath);
      } else {
        targetUri = vscode.Uri.file(filePath);
      }

      const doc = await vscode.workspace.openTextDocument(targetUri);
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch {
      // Try fuzzy find if exact workspace join fails
      const files = await vscode.workspace.findFiles(`**/${filePath.split(/[\\/]/).pop()}`, undefined, 1);
      if (files.length > 0) {
        const doc = await vscode.workspace.openTextDocument(files[0]);
        await vscode.window.showTextDocument(doc, { preview: false });
      } else {
        vscode.window.showWarningMessage(`Relay: Could not find file ${filePath} in workspace.`);
      }
    }
  }

  private async _handleSendMessage(text?: string): Promise<void> {
    if (!text || !text.trim()) { return; }
    const cfg = getConfig();
    const cleanText = text.trim();

    this.addFeedItem({
      type: 'message',
      author: cfg.username || 'You',
      role: cfg.role,
      summary: cleanText,
      significance: 'Medium',
    });

    this.outputChannel.appendLine(`Note added to Relay feed: ${cleanText}`);
  }

  // ─── Webview HTML ─────────────────────────────────────────────────────────

  private _getHtmlForWebview(): string {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relay Activity Feed</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:          var(--vscode-sideBar-background, #080B14);
    --surface:     var(--vscode-sideBarSectionHeader-background, #0F1724);
    --card-bg:     rgba(255, 255, 255, 0.035);
    --card-hover:  rgba(255, 255, 255, 0.06);
    --border:      var(--vscode-sideBar-border, rgba(255, 255, 255, 0.08));
    --text:        var(--vscode-sideBar-foreground, #E8ECF4);
    --muted:       var(--vscode-descriptionForeground, #7A89A8);
    --accent:      #6366F1;
    --accent-glow: rgba(99, 102, 241, 0.25);
    --coder:       #6366F1;
    --debugger:    #00D4FF;
    --deployer:    #FFB800;
    --green:       #22D3A0;
    --red:         #F87171;
    --radius-sm:   6px;
    --radius-md:   10px;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  /* ── Top Header ─────────────────────────────────────────── */
  .header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-shrink: 0;
  }

  .status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 7px;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: -0.2px;
  }
  .brand-icon {
    font-size: 15px;
    color: var(--accent);
  }

  .conn-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: var(--muted);
    background: rgba(255, 255, 255, 0.04);
    padding: 3px 8px;
    border-radius: 12px;
    border: 1px solid var(--border);
    cursor: pointer;
  }
  .conn-badge:hover { color: var(--text); }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--muted);
  }
  .dot.ok { background: var(--green); box-shadow: 0 0 6px rgba(34, 211, 160, 0.7); }
  .dot.err { background: var(--red);   box-shadow: 0 0 6px rgba(248, 113, 113, 0.7); }

  /* User Row */
  .user-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .user-input-wrap {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }
  .user-at {
    position: absolute;
    left: 9px;
    color: var(--muted);
    font-size: 12px;
    pointer-events: none;
  }
  .username-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    padding: 5px 8px 5px 23px;
    font-size: 12px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
  }
  .username-input:focus {
    border-color: var(--accent);
  }

  .btn-icon {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--muted);
    padding: 5px 8px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-icon:hover {
    color: var(--text);
    border-color: var(--accent);
  }

  /* Role Chips */
  .role-chips {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .chip {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 6px 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.18s ease;
    user-select: none;
  }
  .chip:hover {
    background: rgba(255, 255, 255, 0.07);
    color: var(--text);
  }
  .chip.active[data-role="Coder"] {
    background: rgba(99, 102, 241, 0.18);
    border-color: var(--coder);
    color: #A5B4FC;
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.25);
  }
  .chip.active[data-role="Debugger"] {
    background: rgba(0, 212, 255, 0.18);
    border-color: var(--debugger);
    color: #7DD3FC;
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.25);
  }
  .chip.active[data-role="Deployer"] {
    background: rgba(255, 184, 0, 0.18);
    border-color: var(--deployer);
    color: #FCD34D;
    box-shadow: 0 0 10px rgba(255, 184, 0, 0.25);
  }

  /* ── Feed Stream ────────────────────────────────────────── */
  .feed {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .feed::-webkit-scrollbar { width: 5px; }
  .feed::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }

  /* Empty State */
  .empty-state {
    margin: auto;
    text-align: center;
    padding: 24px 16px;
    color: var(--muted);
  }
  .empty-icon {
    font-size: 32px;
    margin-bottom: 8px;
    opacity: 0.8;
    animation: float 3s ease-in-out infinite;
  }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  .empty-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 4px;
  }
  .empty-subtitle {
    font-size: 11px;
    line-height: 1.5;
  }

  /* Card */
  .feed-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 11px 12px;
    display: flex;
    flex-direction: column;
    gap: 7px;
    animation: fadeIn 0.25s ease-out;
    transition: background 0.15s, border-color 0.15s;
  }
  .feed-card:hover {
    background: var(--card-hover);
    border-color: rgba(255, 255, 255, 0.14);
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

  .feed-card.command-card {
    border-left: 3px solid #C084FC;
    background: rgba(192, 132, 252, 0.05);
  }
  .feed-card.outgoing-card {
    border-left: 3px solid var(--coder);
  }

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .card-author-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
  }
  .author-avatar {
    font-size: 13px;
  }
  .author-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .author-role {
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    color: var(--muted);
  }

  .card-badges {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
  }
  .sig-badge {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 5px;
    border-radius: 4px;
    letter-spacing: 0.3px;
  }
  .sig-High     { background: rgba(248, 113, 113, 0.2); color: var(--red); border: 1px solid rgba(248, 113, 113, 0.3); }
  .sig-Medium   { background: rgba(245, 158, 11, 0.2);  color: #FBBF24;     border: 1px solid rgba(245, 158, 11, 0.3); }
  .sig-Suppress { background: rgba(107, 114, 128, 0.2); color: #9CA3AF;     border: 1px solid rgba(107, 114, 128, 0.3); }

  .card-time {
    font-size: 10px;
    color: var(--muted);
  }

  .card-summary {
    font-size: 12px;
    line-height: 1.45;
    color: var(--text);
  }

  .file-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: #93C5FD;
    background: rgba(59, 130, 246, 0.12);
    border: 1px solid rgba(59, 130, 246, 0.25);
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    width: fit-content;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: all 0.15s;
  }
  .file-pill:hover {
    background: rgba(59, 130, 246, 0.25);
    color: #BFDBFE;
    text-decoration: underline;
  }

  .diff-box {
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-sm);
    padding: 6px 8px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 10.5px;
    color: #D1D5DB;
    overflow-x: auto;
    max-height: 90px;
    white-space: pre;
    line-height: 1.4;
  }

  /* ── Bottom Input Bar ───────────────────────────────────── */
  .footer {
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .msg-input {
    flex: 1;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    padding: 7px 10px;
    font-size: 12px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
  }
  .msg-input:focus {
    border-color: var(--accent);
  }
  .btn-send {
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .btn-send:hover { opacity: 0.9; }

  /* ── Mobile Pairing Card ────────────────────────────────── */
  .pair-card {
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    margin: 10px 14px 6px 14px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
  }
  .pair-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .pair-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .pair-badge {
    font-size: 9px;
    background: rgba(34, 211, 160, 0.15);
    color: var(--green);
    border: 1px solid rgba(34, 211, 160, 0.3);
    padding: 1px 5px;
    border-radius: 4px;
    font-weight: 700;
  }
  .pair-code-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-sm);
    padding: 6px 10px;
  }
  .pair-pin-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pair-pin-label {
    font-size: 9px;
    color: var(--muted);
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .pair-pin-val {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 16px;
    font-weight: 800;
    color: #FFFFFF;
    letter-spacing: 2px;
  }
  .btn-copy-pin {
    background: rgba(99, 102, 241, 0.25);
    border: 1px solid var(--accent);
    color: #FFFFFF;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-copy-pin:hover {
    background: var(--accent);
  }
  .btn-toggle-qr {
    background: transparent;
    border: none;
    color: var(--muted);
    font-size: 11px;
    cursor: pointer;
    text-decoration: underline;
  }
  .btn-toggle-qr:hover {
    color: var(--text);
  }
  .qr-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0 4px 0;
    gap: 8px;
  }
  .qr-box {
    background: #FFFFFF;
    padding: 8px;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .qr-caption {
    font-size: 10.5px;
    color: var(--muted);
    text-align: center;
    line-height: 1.3;
  }
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <div class="status-row">
    <div class="brand">
      <span class="brand-icon">📡</span>
      <span>Relay Feed</span>
    </div>
    <div class="conn-badge" id="connBadge" onclick="checkHealth()" title="Click to test backend connection">
      <div class="dot" id="connDot"></div>
      <span id="connText">Checking…</span>
    </div>
    <button class="btn-icon" onclick="openSettings()" title="Open Full Setup Window">⚙</button>
  </div>

  <div class="user-row">
    <div class="user-input-wrap">
      <span class="user-at">@</span>
      <input
        type="text"
        id="usernameInput"
        class="username-input"
        placeholder="Enter your name…"
        spellcheck="false"
      />
    </div>
    <button class="btn-icon" onclick="saveUsername()" title="Save username">✓</button>
    <button class="btn-icon" onclick="clearFeed()" title="Clear Feed">🗑</button>
  </div>

  <!-- Role Selector Chips -->
  <div class="role-chips">
    <div class="chip" data-role="Coder" onclick="selectRole('Coder')">
      <span>💻</span> Coder
    </div>
    <div class="chip" data-role="Debugger" onclick="selectRole('Debugger')">
      <span>🔍</span> Debugger
    </div>
    <div class="chip" data-role="Deployer" onclick="selectRole('Deployer')">
      <span>🚀</span> Deployer
    </div>
  </div>
</div>

<!-- Mobile App Pairing Banner -->
<div class="pair-card" id="pairCard">
  <div class="pair-header">
    <div class="pair-title">
      <span>📱 Mobile Pairing</span>
      <span class="pair-badge">READY</span>
    </div>
    <button class="btn-toggle-qr" onclick="toggleQr()" id="qrToggleBtn">Hide QR</button>
  </div>

  <div class="pair-code-row">
    <div class="pair-pin-group">
      <div class="pair-pin-label">PIN CODE</div>
      <div class="pair-pin-val" id="sessionPin">849-201</div>
    </div>
    <button class="btn-copy-pin" id="btnCopyPin" onclick="copyPin()">Copy</button>
  </div>

  <div class="qr-container" id="qrContainer">
    <div class="qr-box">
      <svg viewBox="0 0 100 100" width="120" height="120" shape-rendering="crispEdges">
        <!-- Finder Top-Left -->
        <rect x="6" y="6" width="28" height="28" fill="#000000" rx="3"/>
        <rect x="10" y="10" width="20" height="20" fill="#FFFFFF" rx="2"/>
        <rect x="14" y="14" width="12" height="12" fill="#000000" rx="1"/>

        <!-- Finder Top-Right -->
        <rect x="66" y="6" width="28" height="28" fill="#000000" rx="3"/>
        <rect x="70" y="10" width="20" height="20" fill="#FFFFFF" rx="2"/>
        <rect x="74" y="14" width="12" height="12" fill="#000000" rx="1"/>

        <!-- Finder Bottom-Left -->
        <rect x="6" y="66" width="28" height="28" fill="#000000" rx="3"/>
        <rect x="10" y="70" width="20" height="20" fill="#FFFFFF" rx="2"/>
        <rect x="14" y="74" width="12" height="12" fill="#000000" rx="1"/>

        <!-- Timing Patterns -->
        <rect x="38" y="10" width="4" height="4" fill="#000000"/>
        <rect x="46" y="10" width="4" height="4" fill="#000000"/>
        <rect x="54" y="10" width="4" height="4" fill="#000000"/>
        <rect x="10" y="38" width="4" height="4" fill="#000000"/>
        <rect x="10" y="46" width="4" height="4" fill="#000000"/>
        <rect x="10" y="54" width="4" height="4" fill="#000000"/>

        <!-- Alignment / Data Pattern -->
        <rect x="42" y="20" width="4" height="4" fill="#000000"/>
        <rect x="50" y="20" width="4" height="4" fill="#000000"/>
        <rect x="58" y="20" width="4" height="4" fill="#000000"/>
        <rect x="38" y="28" width="4" height="4" fill="#000000"/>
        <rect x="48" y="28" width="4" height="4" fill="#000000"/>
        <rect x="56" y="28" width="4" height="4" fill="#000000"/>
        <rect x="44" y="36" width="4" height="4" fill="#000000"/>
        <rect x="52" y="36" width="4" height="4" fill="#000000"/>
        <rect x="64" y="36" width="4" height="4" fill="#000000"/>
        <rect x="72" y="36" width="4" height="4" fill="#000000"/>
        <rect x="80" y="36" width="4" height="4" fill="#000000"/>
        <rect x="88" y="36" width="4" height="4" fill="#000000"/>

        <rect x="22" y="44" width="4" height="4" fill="#000000"/>
        <rect x="30" y="44" width="4" height="4" fill="#000000"/>
        <rect x="40" y="44" width="4" height="4" fill="#000000"/>
        <rect x="50" y="44" width="4" height="4" fill="#000000"/>
        <rect x="60" y="44" width="4" height="4" fill="#000000"/>
        <rect x="70" y="44" width="4" height="4" fill="#000000"/>
        <rect x="84" y="44" width="4" height="4" fill="#000000"/>

        <rect x="38" y="52" width="4" height="4" fill="#000000"/>
        <rect x="46" y="52" width="4" height="4" fill="#000000"/>
        <rect x="56" y="52" width="4" height="4" fill="#000000"/>
        <rect x="66" y="52" width="4" height="4" fill="#000000"/>
        <rect x="78" y="52" width="4" height="4" fill="#000000"/>
        <rect x="86" y="52" width="4" height="4" fill="#000000"/>

        <rect x="40" y="62" width="4" height="4" fill="#000000"/>
        <rect x="50" y="62" width="4" height="4" fill="#000000"/>
        <rect x="60" y="62" width="4" height="4" fill="#000000"/>
        <rect x="72" y="62" width="4" height="4" fill="#000000"/>
        <rect x="82" y="62" width="4" height="4" fill="#000000"/>

        <rect x="44" y="72" width="4" height="4" fill="#000000"/>
        <rect x="54" y="72" width="4" height="4" fill="#000000"/>
        <rect x="64" y="72" width="4" height="4" fill="#000000"/>
        <rect x="76" y="72" width="4" height="4" fill="#000000"/>
        <rect x="86" y="72" width="4" height="4" fill="#000000"/>

        <rect x="38" y="82" width="4" height="4" fill="#000000"/>
        <rect x="48" y="82" width="4" height="4" fill="#000000"/>
        <rect x="58" y="82" width="4" height="4" fill="#000000"/>
        <rect x="70" y="82" width="4" height="4" fill="#000000"/>
        <rect x="80" y="82" width="4" height="4" fill="#000000"/>
      </svg>
    </div>
    <div class="qr-caption">Scan with Relay mobile app camera<br><span style="color:var(--accent);">http://10.15.179.153:8080</span></div>
  </div>
</div>

<!-- Feed Stream -->
<div class="feed" id="feed">
  <div class="empty-state" id="emptyState">
    <div class="empty-icon">📡</div>
    <div class="empty-title">Listening for team activity…</div>
    <div class="empty-subtitle">
      When you or teammates save changes, diff cards and voice commands will slide in here.
    </div>
  </div>
</div>

<!-- Chat Input Bar -->
<div class="footer">
  <input
    type="text"
    id="msgInput"
    class="msg-input"
    placeholder="Type a team note or prompt…"
    onkeydown="handleKey(event)"
  />
  <button class="btn-send" onclick="sendMessage()">Send</button>
</div>

<script>
  const vscode = acquireVsCodeApi();
  let currentRole = 'Coder';

  // Tell extension webview is ready
  vscode.postMessage({ type: 'ready' });

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'state') {
      const p = msg.payload;
      currentRole = p.role || 'Coder';
      updateHeader(p);
      renderFeed(p.feedItems || []);
    }
    if (msg.type === 'newItem') {
      appendItem(msg.item);
    }
  });

  function updateHeader(state) {
    document.getElementById('usernameInput').value = state.username || '';

    // Connection badge
    const dot = document.getElementById('connDot');
    const text = document.getElementById('connText');
    if (state.isHealthy) {
      dot.className = 'dot ok';
      text.textContent = 'Live';
    } else {
      dot.className = 'dot err';
      text.textContent = 'Offline';
    }

    // Role chips
    document.querySelectorAll('.chip').forEach(el => {
      el.classList.toggle('active', el.dataset.role === state.role);
    });
  }

  function selectRole(role) {
    currentRole = role;
    document.querySelectorAll('.chip').forEach(el => {
      el.classList.toggle('active', el.dataset.role === role);
    });
    vscode.postMessage({ type: 'setRole', payload: { role } });
  }

  function saveUsername() {
    const username = document.getElementById('usernameInput').value.trim();
    if (username) {
      vscode.postMessage({ type: 'setUsername', payload: { username } });
    }
  }

  document.getElementById('usernameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { saveUsername(); }
  });

  function checkHealth() {
    vscode.postMessage({ type: 'checkHealth' });
  }

  function openSettings() {
    vscode.postMessage({ type: 'openSettings' });
  }

  function clearFeed() {
    vscode.postMessage({ type: 'clearFeed' });
  }

  function openFile(filePath) {
    vscode.postMessage({ type: 'openFile', payload: { filePath } });
  }

  function sendMessage() {
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    vscode.postMessage({ type: 'sendMessage', payload: { text } });
  }

  function handleKey(e) {
    if (e.key === 'Enter') { sendMessage(); }
  }

  function renderFeed(items) {
    const feed = document.getElementById('feed');
    feed.innerHTML = '';

    if (!items || items.length === 0) {
      feed.innerHTML = \`
        <div class="empty-state" id="emptyState">
          <div class="empty-icon">📡</div>
          <div class="empty-title">Listening for team activity…</div>
          <div class="empty-subtitle">
            When you or teammates save changes, diff cards and voice commands will slide in here.
          </div>
        </div>
      \`;
      return;
    }

    items.forEach(item => {
      feed.appendChild(createCardElement(item));
    });
  }

  function appendItem(item) {
    const feed = document.getElementById('feed');
    const emptyState = document.getElementById('emptyState');
    if (emptyState) { emptyState.remove(); }

    const el = createCardElement(item);
    feed.insertBefore(el, feed.firstChild);
  }

  function createCardElement(item) {
    const div = document.createElement('div');
    const isCmd = item.type === 'command';
    const isOut = item.type === 'outgoing';

    div.className = 'feed-card' + (isCmd ? ' command-card' : '') + (isOut ? ' outgoing-card' : '');

    const avatar = isCmd ? '📱' : (item.role === 'Debugger' ? '🔍' : (item.role === 'Deployer' ? '🚀' : '💻'));

    let fileHtml = '';
    if (item.filePath) {
      const fileName = item.filePath.split(/[\\\\/]/).pop() || item.filePath;
      fileHtml = \`<div class="file-pill" onclick="openFile('\${escapeHtml(item.filePath)}')" title="Click to open file in VS Code">📄 \${escapeHtml(fileName)}</div>\`;
    }

    let diffHtml = '';
    if (item.diffSnippet) {
      diffHtml = \`<div class="diff-box">\${escapeHtml(item.diffSnippet)}</div>\`;
    }

    let sigHtml = '';
    if (item.significance) {
      sigHtml = \`<span class="sig-badge sig-\${item.significance}">\${item.significance}</span>\`;
    }

    div.innerHTML = \`
      <div class="card-top">
        <div class="card-author-wrap">
          <span class="author-avatar">\${avatar}</span>
          <span class="author-name">@\${escapeHtml(item.author || 'teammate')}</span>
          <span class="author-role">\${escapeHtml(item.role || 'Coder')}</span>
        </div>
        <div class="card-badges">
          \${sigHtml}
          <span class="card-time">\${item.timestamp || ''}</span>
        </div>
      </div>
      <div class="card-summary">\${escapeHtml(item.summary)}</div>
      \${fileHtml}
      \${diffHtml}
    \`;

    return div;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  let qrVisible = true;
  function toggleQr() {
    qrVisible = !qrVisible;
    const box = document.getElementById('qrContainer');
    const btn = document.getElementById('qrToggleBtn');
    if (box) box.style.display = qrVisible ? 'flex' : 'none';
    if (btn) btn.innerText = qrVisible ? 'Hide QR' : 'Show QR';
  }

  function copyPin() {
    navigator.clipboard.writeText('849201').then(() => {
      const btn = document.getElementById('btnCopyPin');
      if (btn) {
        btn.innerText = 'Copied ✓';
        setTimeout(() => { btn.innerText = 'Copy'; }, 2000);
      }
    });
  }
</script>
</body>
</html>`;
  }
}

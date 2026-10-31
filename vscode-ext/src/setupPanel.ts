/**
 * setupPanel.ts — WebView-based onboarding & settings UI for the Relay extension.
 *
 * Opens a rich HTML panel (dark glassmorphism theme) that lets the user:
 *  1. Enter their username.
 *  2. Pick a role via animated cards (Coder / Debugger / Deployer).
 *  3. Optionally change the backend URL.
 *  4. Hit "Connect" which persists settings and registers the session.
 *
 * The panel uses VS Code's postMessage API to communicate bidirectionally:
 *  extension → webview: { type: 'init', payload: { username, role, backendUrl } }
 *  webview → extension: { type: 'save',   payload: { username, role, backendUrl } }
 *  webview → extension: { type: 'close' }
 */

import * as vscode from 'vscode';
import { RelayClient } from './relayClient';
import { getConfig } from './config';
import { StatusBarManager } from './statusBar';

export class SetupPanel implements vscode.Disposable {
  static readonly viewType = 'relay.setup';
  private static _instance: SetupPanel | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  /** Open or reveal the panel. Only one instance exists at a time. */
  static open(
    _context: vscode.ExtensionContext,
    client: RelayClient,
    statusBar: StatusBarManager,
    outputChannel: vscode.OutputChannel,
  ): SetupPanel {
    if (SetupPanel._instance) {
      SetupPanel._instance._panel.reveal();
      return SetupPanel._instance;
    }
    const panel = new SetupPanel(client, statusBar, outputChannel);
    SetupPanel._instance = panel;
    return panel;
  }

  private constructor(
    private readonly client: RelayClient,
    private readonly statusBar: StatusBarManager,
    private readonly outputChannel: vscode.OutputChannel,
  ) {
    this._panel = vscode.window.createWebviewPanel(
      SetupPanel.viewType,
      'Relay — Setup',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    this._panel.iconPath = vscode.Uri.parse(
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%236366f1"/></svg>',
    );

    this._panel.webview.html = this._buildHtml();

    // Send current config to the webview once it is ready.
    this._panel.webview.onDidReceiveMessage(
      async (msg: { type: string; payload?: Record<string, string> }) => {
        switch (msg.type) {
          case 'ready':
            await this._sendInit();
            break;
          case 'save':
            await this._handleSave(msg.payload ?? {});
            break;
          case 'testConnection':
            await this._handleTestConnection(msg.payload?.backendUrl ?? '');
            break;
          case 'close':
            this._panel.dispose();
            break;
        }
      },
      null,
      this._disposables,
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  private async _sendInit(): Promise<void> {
    const cfg = getConfig();
    await this._panel.webview.postMessage({
      type: 'init',
      payload: {
        username:   cfg.username,
        role:       cfg.role,
        backendUrl: cfg.backendUrl,
      },
    });
  }

  private async _handleSave(payload: Record<string, string>): Promise<void> {
    const { username, role, backendUrl } = payload;
    const ws = vscode.workspace.getConfiguration('relay');

    if (username) { await ws.update('username',   username.trim(), vscode.ConfigurationTarget.Global); }
    if (role)     { await ws.update('role',       role,            vscode.ConfigurationTarget.Global); }
    if (backendUrl) { await ws.update('backendUrl', backendUrl.trim(), vscode.ConfigurationTarget.Global); }

    this.statusBar.setIdle(role ?? getConfig().role);
    this.outputChannel.appendLine(`Settings saved — user: ${username}, role: ${role}`);

    // Register session with backend.
    try {
      const cfg = getConfig();
      await this.client.upsertSession(cfg.username, cfg.role);
      this.outputChannel.appendLine(`Session registered: ${cfg.username} as ${cfg.role}`);
      await this._panel.webview.postMessage({ type: 'saveResult', success: true });
    } catch (err) {
      this.outputChannel.appendLine(`Session registration failed: ${String(err)}`);
      await this._panel.webview.postMessage({ type: 'saveResult', success: false, error: String(err) });
    }
  }

  private async _handleTestConnection(backendUrl: string): Promise<void> {
    const url = backendUrl.trim() || getConfig().backendUrl;
    try {
      const tmpClient = new RelayClient(url);
      const ok = await tmpClient.isHealthy();
      await this._panel.webview.postMessage({ type: 'connectionResult', ok, url });
    } catch {
      await this._panel.webview.postMessage({ type: 'connectionResult', ok: false, url });
    }
  }

  dispose(): void {
    SetupPanel._instance = undefined;
    this._panel.dispose();
    for (const d of this._disposables) { d.dispose(); }
    this._disposables = [];
  }

  // ─── HTML ─────────────────────────────────────────────────────────────────

  private _buildHtml(): string {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Relay Setup</title>
<style>
  /* ── Reset & Base ─────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #080B14;
    --surface:   #0F1724;
    --elevated:  #151E30;
    --border:    rgba(255,255,255,0.08);
    --glass:     rgba(255,255,255,0.04);
    --text:      #E8ECF4;
    --muted:     #6B7A9F;
    --accent:    #6366F1;
    --accent-hi: #818CF8;
    --green:     #22D3A0;
    --red:       #F87171;
    --coder:     #6366F1;
    --debugger:  #F59E0B;
    --deployer:  #22D3A0;
    --radius:    14px;
    --radius-sm: 8px;
    --shadow:    0 8px 32px rgba(0,0,0,0.5);
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
    min-height: 100vh;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 32px 16px 64px;
  }

  /* ── Layout ───────────────────────────────────────────── */
  .container {
    width: 100%;
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  /* ── Header ───────────────────────────────────────────── */
  .header {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .logo {
    width: 44px; height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent) 0%, #8B5CF6 100%);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
    box-shadow: 0 0 20px rgba(99,102,241,0.4);
  }
  .header-text h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
  .header-text p  { font-size: 13px; color: var(--muted); margin-top: 2px; }

  /* ── Card ─────────────────────────────────────────────── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
    box-shadow: var(--shadow);
  }
  .card-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 14px;
  }

  /* ── Username Input ───────────────────────────────────── */
  .input-wrap {
    position: relative;
  }
  .input-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    font-size: 16px; pointer-events: none;
  }
  input[type="text"] {
    width: 100%;
    background: var(--elevated);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 15px;
    padding: 12px 14px 12px 40px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    font-family: inherit;
  }
  input[type="text"]:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
  }
  input[type="text"]::placeholder { color: var(--muted); }

  /* ── Role Cards ───────────────────────────────────────── */
  .roles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .role-card {
    background: var(--elevated);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 14px;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    user-select: none;
    position: relative;
    overflow: hidden;
  }
  .role-card::before {
    content: '';
    position: absolute; inset: 0;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .role-card[data-role="Coder"]::before    { background: radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%); }
  .role-card[data-role="Debugger"]::before { background: radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.15) 0%, transparent 70%); }
  .role-card[data-role="Deployer"]::before { background: radial-gradient(ellipse at 50% 0%, rgba(34,211,160,0.15) 0%, transparent 70%); }

  .role-card:hover { transform: translateY(-3px); }
  .role-card:hover::before { opacity: 1; }

  .role-card.selected {
    transform: translateY(-3px);
  }
  .role-card.selected::before { opacity: 1; }
  .role-card[data-role="Coder"].selected    { border-color: var(--coder);    box-shadow: 0 0 0 3px rgba(99,102,241,0.2);  }
  .role-card[data-role="Debugger"].selected { border-color: var(--debugger); box-shadow: 0 0 0 3px rgba(245,158,11,0.2);  }
  .role-card[data-role="Deployer"].selected { border-color: var(--deployer); box-shadow: 0 0 0 3px rgba(34,211,160,0.2);  }

  .role-icon { font-size: 28px; margin-bottom: 8px; display: block; }
  .role-name {
    font-size: 13px; font-weight: 700; letter-spacing: 0.2px;
    margin-bottom: 4px;
  }
  .role-card[data-role="Coder"]    .role-name { color: var(--coder);    }
  .role-card[data-role="Debugger"] .role-name { color: var(--debugger); }
  .role-card[data-role="Deployer"] .role-name { color: var(--deployer); }

  .role-desc { font-size: 11px; color: var(--muted); line-height: 1.4; }

  .check-badge {
    position: absolute; top: 8px; right: 8px;
    width: 18px; height: 18px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .role-card[data-role="Coder"].selected    .check-badge { background: var(--coder);    opacity: 1; }
  .role-card[data-role="Debugger"].selected .check-badge { background: var(--debugger); opacity: 1; }
  .role-card[data-role="Deployer"].selected .check-badge { background: var(--deployer); opacity: 1; }

  /* ── Backend URL ──────────────────────────────────────── */
  .url-row {
    display: flex;
    gap: 8px;
  }
  .url-row input { flex: 1; }
  .btn-test {
    background: var(--elevated);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
    padding: 0 14px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    font-family: inherit;
  }
  .btn-test:hover { border-color: var(--accent); color: var(--accent); }

  .conn-status {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; margin-top: 8px; min-height: 18px;
    transition: opacity 0.3s;
  }
  .dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--muted);
    flex-shrink: 0;
  }
  .dot.ok  { background: var(--green); box-shadow: 0 0 6px rgba(34,211,160,0.6); }
  .dot.err { background: var(--red);   box-shadow: 0 0 6px rgba(248,113,113,0.6); }
  .dot.checking { animation: pulse 1s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

  /* ── Connect Button ───────────────────────────────────── */
  .btn-connect {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: var(--radius);
    background: linear-gradient(135deg, var(--accent) 0%, #8B5CF6 100%);
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    letter-spacing: 0.3px;
    font-family: inherit;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(99,102,241,0.35);
  }
  .btn-connect:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(99,102,241,0.5);
  }
  .btn-connect:active { transform: translateY(0); }
  .btn-connect:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* ── Result Toast ─────────────────────────────────────── */
  .toast {
    display: none;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    animation: slideIn 0.3s ease;
  }
  .toast.show { display: flex; }
  .toast.success { background: rgba(34,211,160,0.12); border: 1px solid rgba(34,211,160,0.3); color: var(--green); }
  .toast.error   { background: rgba(248,113,113,0.12); border: 1px solid rgba(248,113,113,0.3); color: var(--red); }
  @keyframes slideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }

  /* ── Footer ───────────────────────────────────────────── */
  .footer {
    text-align: center;
    font-size: 11px;
    color: var(--muted);
    line-height: 1.6;
  }
</style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div class="header">
    <div class="logo">📡</div>
    <div class="header-text">
      <h1>Relay Setup</h1>
      <p>Configure your identity and role in the team session.</p>
    </div>
  </div>

  <!-- Username -->
  <div class="card">
    <div class="card-label">Your Name</div>
    <div class="input-wrap">
      <span class="input-icon">👤</span>
      <input id="username" type="text" placeholder="e.g. divya" autocomplete="off" spellcheck="false" />
    </div>
  </div>

  <!-- Role -->
  <div class="card">
    <div class="card-label">Your Role</div>
    <div class="roles">
      <div class="role-card" data-role="Coder" onclick="selectRole('Coder')">
        <span class="check-badge">✓</span>
        <span class="role-icon">💻</span>
        <div class="role-name">Coder</div>
        <div class="role-desc">Writing features. Sends diffs to the team.</div>
      </div>
      <div class="role-card" data-role="Debugger" onclick="selectRole('Debugger')">
        <span class="check-badge">✓</span>
        <span class="role-icon">🐛</span>
        <div class="role-name">Debugger</div>
        <div class="role-desc">Receives high-significance change alerts.</div>
      </div>
      <div class="role-card" data-role="Deployer" onclick="selectRole('Deployer')">
        <span class="check-badge">✓</span>
        <span class="role-icon">🚀</span>
        <div class="role-name">Deployer</div>
        <div class="role-desc">Tracks env, config & breaking changes.</div>
      </div>
    </div>
  </div>

  <!-- Backend -->
  <div class="card">
    <div class="card-label">Backend URL</div>
    <div class="url-row">
      <div class="input-wrap" style="flex:1">
        <span class="input-icon">🔗</span>
        <input id="backendUrl" type="text" placeholder="http://localhost:8080" spellcheck="false" />
      </div>
      <button class="btn-test" onclick="testConnection()">Test</button>
    </div>
    <div class="conn-status" id="connStatus">
      <div class="dot" id="connDot"></div>
      <span id="connText">Enter URL and press Test</span>
    </div>
  </div>

  <!-- Toast -->
  <div class="toast" id="toast">
    <span id="toastIcon"></span>
    <span id="toastMsg"></span>
  </div>

  <!-- Connect -->
  <button class="btn-connect" id="btnConnect" onclick="save()">
    ⚡ Connect to Relay
  </button>

  <div class="footer">
    Settings are saved globally in VS Code.<br/>
    Your username must match the name you enter in the Relay mobile app.
  </div>

</div>

<script>
  const vscode = acquireVsCodeApi();
  let selectedRole = 'Coder';

  // Notify extension that we are ready.
  vscode.postMessage({ type: 'ready' });

  // Receive messages from extension.
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'init') {
      const p = msg.payload;
      document.getElementById('username').value   = p.username   || '';
      document.getElementById('backendUrl').value = p.backendUrl || 'http://localhost:8080';
      selectRole(p.role || 'Coder');
    }
    if (msg.type === 'connectionResult') {
      const dot  = document.getElementById('connDot');
      const text = document.getElementById('connText');
      dot.className  = 'dot ' + (msg.ok ? 'ok' : 'err');
      text.textContent = msg.ok
        ? '✓ Connected to ' + msg.url
        : '✗ Cannot reach ' + msg.url;
    }
    if (msg.type === 'saveResult') {
      const btn = document.getElementById('btnConnect');
      btn.disabled = false;
      btn.textContent = '⚡ Connect to Relay';
      showToast(msg.success, msg.success
        ? 'Session registered! Relay is now active.'
        : 'Saved locally, but backend registration failed: ' + (msg.error || 'unknown error'));
    }
  });

  function selectRole(role) {
    selectedRole = role;
    document.querySelectorAll('.role-card').forEach(el => {
      el.classList.toggle('selected', el.dataset.role === role);
    });
  }

  function testConnection() {
    const url = document.getElementById('backendUrl').value.trim();
    const dot  = document.getElementById('connDot');
    const text = document.getElementById('connText');
    dot.className  = 'dot checking';
    text.textContent = 'Checking…';
    vscode.postMessage({ type: 'testConnection', payload: { backendUrl: url } });
  }

  function save() {
    const username   = document.getElementById('username').value.trim();
    const backendUrl = document.getElementById('backendUrl').value.trim();
    if (!username) {
      document.getElementById('username').focus();
      document.getElementById('username').style.borderColor = 'var(--red)';
      setTimeout(() => document.getElementById('username').style.borderColor = '', 1500);
      return;
    }
    const btn = document.getElementById('btnConnect');
    btn.disabled = true;
    btn.textContent = 'Connecting…';
    vscode.postMessage({ type: 'save', payload: { username, role: selectedRole, backendUrl } });
  }

  function showToast(success, msg) {
    const t   = document.getElementById('toast');
    const ico = document.getElementById('toastIcon');
    const txt = document.getElementById('toastMsg');
    t.className   = 'toast show ' + (success ? 'success' : 'error');
    ico.textContent = success ? '✓' : '✗';
    txt.textContent = msg;
    setTimeout(() => { t.className = 'toast'; }, 6000);
  }
</script>
</body>
</html>`;
  }
}

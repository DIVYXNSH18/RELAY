/**
 * extension.ts — Relay VS Code Extension entry point.
 *
 * Responsibilities:
 *  - Construct all managers (RelayClient, CaptureManager, StatusBarManager,
 *    RelayParticipant) with their dependencies injected.
 *  - Register all VS Code commands.
 *  - Start the CommandPoller that checks for incoming phone commands.
 *  - Register the session with the backend on startup.
 *  - Dispose all resources cleanly when the extension is deactivated.
 *
 * Nothing business-logic-specific lives here. This file is pure wiring.
 */

import * as vscode from 'vscode';
import { getConfig, validateConfig } from './config';
import { RelayClient } from './relayClient';
import { CaptureManager } from './capture';
import * as path from 'path';
import { StatusBarManager } from './statusBar';
import { RelayParticipant } from './chatParticipant';
import { SetupPanel } from './setupPanel';
import { RelaySidebarViewProvider } from './sidebarView';

// How often to poll /pending-cmd for incoming voice commands (ms).
const POLL_INTERVAL_MS = 2_000;

// How long between connectivity checks / session re-registration (ms).
const HEARTBEAT_INTERVAL_MS = 30_000;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel('Relay');
  outputChannel.appendLine('Relay extension activating…');

  const cfg = getConfig();

  // ── Construct core services ──────────────────────────────────────────────
  const client = new RelayClient(cfg.backendUrl);
  const statusBar = new StatusBarManager();
  const capture = new CaptureManager(client, statusBar, outputChannel);
  const participant = new RelayParticipant(client, outputChannel);
  const sidebar = new RelaySidebarViewProvider(context.extensionUri, client, statusBar, outputChannel);

  // Hook local file diff saves into the sidebar feed
  capture.setOnDiffSynced((digest, filePath, diffSnippet) => {
    const currentCfg = getConfig();
    sidebar.addFeedItem({
      type: 'outgoing',
      author: currentCfg.username || 'You',
      role: currentCfg.role,
      summary: digest.summary || `Saved ${path.basename(filePath)}`,
      significance: digest.significance,
      filePath,
      diffSnippet,
    });
  });

  // ── Activate services ────────────────────────────────────────────────────
  capture.activate();
  participant.activate(context);
  statusBar.setIdle(cfg.role);

  // ── Register session with backend (non-fatal if backend is down) ─────────
  await registerSession(client, outputChannel);

  // ── Command poller: check for incoming voice commands from phone ─────────
  const pollTimer = setInterval(
    () => pollForCommands(client, statusBar, outputChannel, sidebar),
    POLL_INTERVAL_MS,
  );

  // ── Heartbeat: re-register session, check digests and connectivity ───────
  const heartbeatTimer = setInterval(
    async () => {
      await registerSession(client, outputChannel);
      await checkTeammateDigests(client, sidebar);
      await sidebar.notifyConfigChanged();
    },
    HEARTBEAT_INTERVAL_MS,
  );

  // ── VS Code Commands ──────────────────────────────────────────────────────
  const openSetup = () => SetupPanel.open(context, client, statusBar, outputChannel);
  const commands = [
    vscode.commands.registerCommand('relay.focusSidebar',  () => vscode.commands.executeCommand('relay.sidebarView.focus')),
    vscode.commands.registerCommand('relay.setup',         openSetup),
    vscode.commands.registerCommand('relay.setUsername',   openSetup),
    vscode.commands.registerCommand('relay.setRole',       () => setRoleCommand(statusBar, outputChannel, sidebar)),
    vscode.commands.registerCommand('relay.toggleEnabled', () => toggleEnabledCommand(statusBar, outputChannel, sidebar)),
    vscode.commands.registerCommand('relay.showStatus',    () => showStatusCommand(client, outputChannel, openSetup)),
    vscode.commands.registerCommand('relay.showSessionPin',() => showPairingPinCommand(outputChannel)),
  ];

  // ── Register all disposables ─────────────────────────────────────────────
  context.subscriptions.push(
    outputChannel,
    statusBar,
    capture,
    participant,
    vscode.window.registerWebviewViewProvider(RelaySidebarViewProvider.viewType, sidebar),
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration('relay')) {
        await sidebar.notifyConfigChanged();
      }
    }),
    ...commands,
    // Ensure timers are cleaned up when the extension deactivates.
    new vscode.Disposable(() => {
      clearInterval(pollTimer);
      clearInterval(heartbeatTimer);
      outputChannel.appendLine('Relay extension deactivated. Timers cleared.');
    }),
  );

  outputChannel.appendLine(`Relay active — role: ${cfg.role}, user: ${cfg.username || '(not set)'}`);

  // Auto-open setup panel if username hasn't been configured yet.
  if (!cfg.username.trim()) {
    setTimeout(() => SetupPanel.open(context, client, statusBar, outputChannel), 800);
  } else {
    const validationError = validateConfig(cfg);
    if (validationError) {
      vscode.window.showWarningMessage(
        validationError,
        'Open Setup',
      ).then(choice => {
        if (choice === 'Open Setup') {
          SetupPanel.open(context, client, statusBar, outputChannel);
        }
      });
    }
  }
}

export function deactivate(): void {
  // VS Code calls dispose() on all context.subscriptions automatically.
  // Nothing additional needed here.
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function registerSession(
  client: RelayClient,
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  const cfg = getConfig();
  if (!cfg.username) { return; }
  try {
    await client.upsertSession(cfg.username, cfg.role);
    outputChannel.appendLine(`Session registered: ${cfg.username} as ${cfg.role}`);
  } catch (err) {
    outputChannel.appendLine(`Session registration failed: ${String(err)}`);
  }
}

let lastDigestEventId = '';

async function checkTeammateDigests(
  client: RelayClient,
  sidebar: RelaySidebarViewProvider,
): Promise<void> {
  const cfg = getConfig();
  if (!cfg.username || !cfg.enabled) { return; }
  try {
    const digest = await client.getDigest(cfg.role);
    if (digest && digest.event_id && digest.event_id !== lastDigestEventId) {
      lastDigestEventId = digest.event_id;
      if (digest.source_user !== cfg.username) {
        sidebar.addDigest(digest);
      }
    }
  } catch {
    // Non-fatal if backend is busy or digest not available yet
  }
}

async function pollForCommands(
  client: RelayClient,
  statusBar: StatusBarManager,
  outputChannel: vscode.OutputChannel,
  sidebar?: RelaySidebarViewProvider,
): Promise<void> {
  const cfg = getConfig();
  if (!cfg.username || !cfg.enabled) { return; }

  const cmd = await client.consumeCommand(cfg.username);
  if (!cmd) { return; }

  outputChannel.appendLine(`📱 Command received: "${cmd.command}" from phone`);
  statusBar.setCommandReceived();
  sidebar?.addIncomingCommand(cmd);

  // Execute the command as a @relay chat prompt.
  await vscode.commands.executeCommand('workbench.action.chat.open', {
    query: `@relay ${cmd.command}`,
  });

  // Reset status bar after a short delay.
  setTimeout(() => {
    const currentCfg = getConfig();
    statusBar.setIdle(currentCfg.role);
  }, 3_000);
}

async function setRoleCommand(
  statusBar: StatusBarManager,
  outputChannel: vscode.OutputChannel,
  sidebar?: RelaySidebarViewProvider,
): Promise<void> {
  const picked = await vscode.window.showQuickPick(
    ['Coder', 'Debugger', 'Deployer'],
    { title: 'Relay: Select Your Role', placeHolder: 'Choose your role for this session' },
  );
  if (!picked) { return; }

  await vscode.workspace
    .getConfiguration('relay')
    .update('role', picked, vscode.ConfigurationTarget.Global);

  statusBar.setIdle(picked);
  outputChannel.appendLine(`Role changed to: ${picked}`);
  vscode.window.showInformationMessage(`Relay: Role set to ${picked}`);
  await sidebar?.notifyConfigChanged();
}

async function toggleEnabledCommand(
  statusBar: StatusBarManager,
  outputChannel: vscode.OutputChannel,
  sidebar?: RelaySidebarViewProvider,
): Promise<void> {
  const cfg = getConfig();
  const newValue = !cfg.enabled;
  await vscode.workspace
    .getConfiguration('relay')
    .update('enabled', newValue, vscode.ConfigurationTarget.Global);

  const msg = newValue ? 'Relay capture enabled.' : 'Relay capture disabled.';
  outputChannel.appendLine(msg);
  vscode.window.showInformationMessage(msg);
  if (!newValue) { statusBar.setIdle('Paused'); }
  await sidebar?.notifyConfigChanged();
}

async function showStatusCommand(
  client: RelayClient,
  outputChannel: vscode.OutputChannel,
  openSetup: () => void,
): Promise<void> {
  const cfg = getConfig();
  const healthy = await client.isHealthy();
  const panel = [
    `**Relay Status**`,
    `- Backend: ${cfg.backendUrl} → ${healthy ? '✅ reachable' : '❌ unreachable'}`,
    `- User: ${cfg.username || '_(not set)_'}`,
    `- Role: ${cfg.role}`,
    `- Capture: ${cfg.enabled ? 'enabled' : 'disabled'}`,
    `- Debounce: ${cfg.debounceMs}ms`,
  ].join('\n');

  outputChannel.show();
  const choice = await vscode.window.showInformationMessage(panel, { modal: true }, 'Open Setup');
  if (choice === 'Open Setup') { openSetup(); }
}

async function showPairingPinCommand(outputChannel: vscode.OutputChannel): Promise<void> {
  const pin = '849-201';
  outputChannel.appendLine(`Pairing Pin: ${pin}`);
  const choice = await vscode.window.showInformationMessage(
    `Relay Mobile Pairing Code: ${pin} | Host: http://192.168.29.45:8080`,
    'Copy PIN (849201)',
    'Open Activity Feed'
  );
  if (choice === 'Copy PIN (849201)') {
    await vscode.env.clipboard.writeText('849201');
    vscode.window.showInformationMessage('Relay PIN 849201 copied to clipboard!');
  } else if (choice === 'Open Activity Feed') {
    await vscode.commands.executeCommand('relay.sidebarView.focus');
  }
}

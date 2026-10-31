/**
 * chatParticipant.ts — Registers the @relay VS Code chat participant.
 *
 * When a user types @relay <question>, this handler:
 *  1. Fetches the latest digest for the user's role from the backend.
 *  2. Builds a context-rich prompt: question + digest summary + diff snippet.
 *  3. Selects a Copilot model via the native VS Code LM API (no Copilot hacks).
 *  4. Streams the response back into the VS Code chat panel.
 *
 * The participant also handles incoming phone commands: when the CommandPoller
 * detects a pending command, it can programmatically trigger a chat response
 * by injecting the command text.
 */

import * as vscode from 'vscode';
import { getConfig } from './config';
import { RelayClient, RelevanceDigest } from './relayClient';

export class RelayParticipant implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly client: RelayClient,
    private readonly outputChannel: vscode.OutputChannel,
  ) {}

  activate(context: vscode.ExtensionContext): void {
    const participant = vscode.chat.createChatParticipant(
      'relay.assistant',
      this.handleRequest.bind(this),
    );
    participant.iconPath = vscode.Uri.joinPath(
      context.extensionUri,
      'assets',
      'relay-icon.png',
    );
    this.disposables.push(participant);
    this.log('@relay chat participant registered.');
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }

  // ─── Request Handler ───────────────────────────────────────────────────────

  private async handleRequest(
    request: vscode.ChatRequest,
    _context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
  ): Promise<vscode.ChatResult> {
    const cfg = getConfig();

    if (!cfg.username) {
      stream.markdown(
        '⚠️ **Relay:** `relay.username` is not set in settings. ' +
        'Please set it to your name so Relay can identify you.',
      );
      return {};
    }

    // 1. Fetch the latest digest for this user's role.
    stream.progress('Fetching context from your teammate…');
    let digest: RelevanceDigest | null = null;
    try {
      digest = await this.client.getDigest(cfg.role);
    } catch (err) {
      this.log(`Failed to fetch digest: ${String(err)}`);
      stream.markdown(
        '⚠️ **Relay:** Could not reach the backend. Is the context engine running?\n\n' +
        `Backend URL: \`${cfg.backendUrl}\``,
      );
      return {};
    }

    // 2. Build the system prompt.
    const systemPrompt = this.buildSystemPrompt(digest, cfg.role);

    // 3. Select a model via the native VS Code LM API.
    const models = await vscode.lm.selectChatModels({
      vendor: 'copilot',
      family: 'gpt-4o',
    });

    if (!models.length) {
      stream.markdown(
        '⚠️ **Relay:** No Copilot model is available. ' +
        'Please install the [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) extension.',
      );
      return {};
    }

    const model = models[0];

    // 4. Build messages array.
    const messages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(request.prompt),
    ];

    // 5. Stream the response.
    try {
      const response = await model.sendRequest(messages, {}, token);
      for await (const chunk of response.text) {
        if (token.isCancellationRequested) { break; }
        stream.markdown(chunk);
      }
    } catch (err) {
      if (err instanceof vscode.LanguageModelError) {
        this.log(`LM error: ${err.message} (${err.code})`);
        stream.markdown(`⚠️ **Relay:** LM error: ${err.message}`);
      } else {
        throw err;
      }
    }

    return {};
  }

  // ─── Prompt Builder ────────────────────────────────────────────────────────

  private buildSystemPrompt(
    digest: RelevanceDigest | null,
    role: string,
  ): string {
    const lines: string[] = [
      `You are Relay, an AI context bridge for software teams.`,
      `The user is a ${role}. Answer their question using the teammate context below.`,
      `Be concise and specific. If the context is not relevant, say so clearly.`,
      ``,
    ];

    if (!digest) {
      lines.push(
        `## Context`,
        `No teammate changes have been synced yet. Answer based on general knowledge.`,
      );
    } else {
      lines.push(
        `## Teammate Change Context`,
        `- **Who:** ${digest.source_user}`,
        `- **File:** \`${digest.file_path}\``,
        `- **What:** ${digest.summary}`,
        `- **Significance:** ${digest.significance}`,
        `- **Diff snippet:**`,
        '```',
        digest.diff_snippet || '(no snippet)',
        '```',
      );
    }

    return lines.join('\n');
  }

  private log(message: string): void {
    this.outputChannel.appendLine(`[ChatParticipant] ${message}`);
  }
}

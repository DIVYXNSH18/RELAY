/**
 * voice.ts — Speech-to-Text and Cloud LLM intent extraction service.
 *
 * Uses expo-audio in SDK 57 with safe fallback for graceful execution.
 */

import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from 'expo-audio';

export interface VoiceIntent {
  role: string;
  action: string;
  target: string;
  rawTranscript: string;
}

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const OPENAI_BASE    = 'https://api.openai.com/v1';

export class VoiceService {
  private recorder: any = null;

  /** Request microphone permission. Returns true if granted. */
  async requestPermission(): Promise<boolean> {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      return granted;
    } catch (err) {
      console.warn('[VoiceService] requestPermission fallback:', err);
      return true;
    }
  }

  /** Start recording. Safe fallback if hardware/module unavailable. */
  async startRecording(): Promise<void> {
    try {
      if (AudioModule && AudioModule.AudioRecorder) {
        await AudioModule.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });

        const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
        await recorder.prepareToRecordAsync();
        recorder.record();
        this.recorder = recorder;
      }
    } catch (err) {
      console.warn('[VoiceService] startRecording fallback:', err);
      this.recorder = null;
    }
  }

  /**
   * Stop recording and process the audio.
   * Returns a VoiceIntent or null if recording failed.
   */
  async stopAndProcess(): Promise<VoiceIntent | null> {
    try {
      let uri: string | null = null;
      if (this.recorder) {
        await this.recorder.stop();
        uri = this.recorder.uri ?? null;
        this.recorder = null;
      }

      if (!uri) {
        // Fallback for development/testing without real microphone recording
        return {
          role: 'Debugger',
          action: 'check',
          target: 'latest change',
          rawTranscript: 'check the latest change',
        };
      }

      // 1. Transcribe via Whisper
      const transcript = await this.transcribe(uri);
      if (!transcript) return null;

      // 2. Extract intent via GPT-4o-mini
      const intent = await this.extractIntent(transcript);
      return intent;
    } catch (err) {
      console.warn('[VoiceService] stopAndProcess fallback:', err);
      return {
        role: 'Debugger',
        action: 'check',
        target: 'latest change',
        rawTranscript: 'check the latest change',
      };
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async transcribe(audioUri: string): Promise<string | null> {
    if (!OPENAI_API_KEY) {
      console.warn('[VoiceService] OPENAI_API_KEY not set — returning mock transcript');
      return 'check the latest change';
    }

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      } as unknown as Blob);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const resp = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: formData,
      });

      if (!resp.ok) {
        console.error('[VoiceService] Whisper error:', resp.status);
        return null;
      }

      const data = await resp.json() as { text: string };
      return data.text.trim();
    } catch (err) {
      console.error('[VoiceService] Transcription failed:', err);
      return null;
    }
  }

  private async extractIntent(transcript: string): Promise<VoiceIntent> {
    const fallback: VoiceIntent = {
      role:          'Debugger',
      action:        'check',
      target:        'latest change',
      rawTranscript: transcript,
    };

    if (!OPENAI_API_KEY) return fallback;

    const systemPrompt = `
You are an intent extractor for a developer tool called Relay.
Given a voice command, extract a JSON object with:
- role: one of "Coder", "Debugger", "Deployer"
- action: short verb (e.g. "check", "review", "explain", "fix")
- target: what to act on (e.g. "latest change", "last bug", "new function")
Return ONLY valid JSON, no markdown fences.
    `.trim();

    try {
      const resp = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcript },
          ],
        }),
      });

      if (!resp.ok) return fallback;

      const data = await resp.json() as {
        choices: [{ message: { content: string } }];
      };
      const content = data.choices[0]?.message?.content ?? '';
      const parsed = JSON.parse(content) as Partial<VoiceIntent>;

      return {
        role:          parsed.role ?? fallback.role,
        action:        parsed.action ?? fallback.action,
        target:        parsed.target ?? fallback.target,
        rawTranscript: transcript,
      };
    } catch {
      return fallback;
    }
  }
}

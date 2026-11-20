/**
 * HopperSoft — Creador: Darwin Chavez
 */
import type { AIProviderConfig } from '../../store/types';
import {
  AIProviderError,
  createCombinedAbortSignal,
  mapFetchFailureToError,
  mapHttpStatusToError,
  type AICompleteParams,
  type AIProvider,
  type AITestResult,
} from './types';

export const geminiProvider: AIProvider = {
  id: 'gemini',
  name: 'Google Gemini',
  models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  allowsCustomModel: true,

  async complete({
    system,
    messages,
    signal,
    config,
    timeoutSeconds = 15,
  }: AICompleteParams): Promise<string> {
    if (!config.apiKey.trim()) {
      throw new AIProviderError('AUTH', 'gemini', 'Falta la clave API de Google Gemini.');
    }

    const model = (config.model || 'gemini-2.5-flash').trim();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    const { signal: abortSignal, cleanup, wasTimeout } = createCombinedAbortSignal(
      timeoutSeconds * 1000,
      signal
    );

    try {
      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey.trim(),
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: system }],
          },
          contents,
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
        signal: abortSignal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw mapHttpStatusToError(res.status, 'gemini', errText);
      }

      const json = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new AIProviderError('INVALID_RESPONSE', 'gemini');
      }
      return text;
    } catch (err) {
      throw mapFetchFailureToError(err, 'gemini', wasTimeout());
    } finally {
      cleanup();
    }
  },

  async testConnection(
    config: AIProviderConfig,
    timeoutSeconds = 15
  ): Promise<AITestResult> {
    const start = performance.now();
    try {
      await this.complete({
        system:
          'Responde únicamente con JSON válido: {"intent":"OTHER","date":null,"time":null,"service":null,"fullName":null,"contact":null}.',
        messages: [{ role: 'user', content: 'ping' }],
        config,
        timeoutSeconds,
      });
      return {
        ok: true,
        latencyMs: Math.round(performance.now() - start),
        message: 'Conexión correcta con Google Gemini.',
      };
    } catch (err) {
      const mapped =
        err instanceof AIProviderError
          ? err
          : mapFetchFailureToError(err, 'gemini', false);
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - start),
        errorCode: mapped.code,
        message: mapped.message,
      };
    }
  },
};

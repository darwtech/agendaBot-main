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

export const deepseekProvider: AIProvider = {
  id: 'deepseek',
  name: 'DeepSeek',
  models: ['deepseek-flash', 'deepseek-v4-pro'],
  allowsCustomModel: true,

  async complete({
    system,
    messages,
    signal,
    config,
    timeoutSeconds = 15,
  }: AICompleteParams): Promise<string> {
    if (!config.apiKey.trim()) {
      throw new AIProviderError('AUTH', 'deepseek', 'Falta la clave API de DeepSeek.');
    }

    const { signal: abortSignal, cleanup, wasTimeout } = createCombinedAbortSignal(
      timeoutSeconds * 1000,
      signal
    );

    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: config.model || 'deepseek-flash',
          max_tokens: 1024,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
        signal: abortSignal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw mapHttpStatusToError(res.status, 'deepseek', errText);
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new AIProviderError('INVALID_RESPONSE', 'deepseek');
      }
      return content;
    } catch (err) {
      throw mapFetchFailureToError(err, 'deepseek', wasTimeout());
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
        message: 'Conexión correcta con DeepSeek.',
      };
    } catch (err) {
      const mapped =
        err instanceof AIProviderError
          ? err
          : mapFetchFailureToError(err, 'deepseek', false);
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - start),
        errorCode: mapped.code,
        message: mapped.message,
      };
    }
  },
};

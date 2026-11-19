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

function normalizeBaseUrl(raw?: string): string {
  const cleaned = (raw ?? '').trim().replace(/\/+$/, '');
  if (!cleaned) return 'https://api.openai.com/v1';
  return cleaned;
}

export const openaiCompatibleProvider: AIProvider = {
  id: 'openaiCompatible',
  name: 'Compatible con OpenAI',
  models: ['gpt-4o-mini', 'gpt-4o', 'llama-3.3-70b-instruct'],
  allowsCustomModel: true,
  requiresBaseUrl: true,

  async complete({
    system,
    messages,
    signal,
    config,
    timeoutSeconds = 15,
  }: AICompleteParams): Promise<string> {
    if (!config.apiKey.trim()) {
      throw new AIProviderError(
        'AUTH',
        'openaiCompatible',
        'Falta la clave API del proveedor compatible.'
      );
    }

    const baseUrl = normalizeBaseUrl(config.baseUrl);
    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl}/chat/completions`;

    const { signal: abortSignal, cleanup, wasTimeout } = createCombinedAbortSignal(
      timeoutSeconds * 1000,
      signal
    );

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o-mini',
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
        throw mapHttpStatusToError(res.status, 'openaiCompatible', errText);
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new AIProviderError('INVALID_RESPONSE', 'openaiCompatible');
      }
      return content;
    } catch (err) {
      throw mapFetchFailureToError(err, 'openaiCompatible', wasTimeout());
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
        message: 'Conexión correcta con el endpoint compatible.',
      };
    } catch (err) {
      const mapped =
        err instanceof AIProviderError
          ? err
          : mapFetchFailureToError(err, 'openaiCompatible', false);
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - start),
        errorCode: mapped.code,
        message: mapped.message,
      };
    }
  },
};

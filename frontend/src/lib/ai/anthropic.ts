/**
 * HopperSoft — Creador: Darwin Chavez
 */
import Anthropic, {
  APIConnectionError,
  AuthenticationError,
  InternalServerError,
  RateLimitError,
} from '@anthropic-ai/sdk';
import type { AIProviderConfig } from '../../store/types';
import {
  AIProviderError,
  createCombinedAbortSignal,
  type AICompleteParams,
  type AIProvider,
  type AITestResult,
} from './types';

function mapAnthropicError(err: unknown, wasTimeout: boolean): AIProviderError {
  if (err instanceof AIProviderError) return err;
  if (wasTimeout) {
    return new AIProviderError('TIMEOUT', 'anthropic');
  }
  if (err instanceof AuthenticationError) {
    return new AIProviderError('AUTH', 'anthropic', undefined, 401);
  }
  if (err instanceof RateLimitError) {
    return new AIProviderError('RATE_LIMIT', 'anthropic', undefined, 429);
  }
  if (err instanceof InternalServerError) {
    return new AIProviderError('UNAVAILABLE', 'anthropic', undefined, 500);
  }
  if (err instanceof APIConnectionError) {
    return new AIProviderError('UNAVAILABLE', 'anthropic', 'Sin conexión con Anthropic.');
  }
  if (err instanceof TypeError) {
    return new AIProviderError('CORS', 'anthropic');
  }
  return new AIProviderError('UNAVAILABLE', 'anthropic');
}

export const anthropicProvider: AIProvider = {
  id: 'anthropic',
  name: 'Anthropic (Claude)',
  models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
  allowsCustomModel: true,

  async complete({
    system,
    messages,
    signal,
    config,
    timeoutSeconds = 15,
  }: AICompleteParams): Promise<string> {
    if (!config.apiKey.trim()) {
      throw new AIProviderError('AUTH', 'anthropic', 'Falta la clave API de Anthropic.');
    }

    const client = new Anthropic({
      apiKey: config.apiKey.trim(),
      dangerouslyAllowBrowser: true,
    });

    const { signal: abortSignal, cleanup, wasTimeout } = createCombinedAbortSignal(
      timeoutSeconds * 1000,
      signal
    );

    try {
      const payload = {
        model: config.model || 'claude-opus-5-5',
        max_tokens: 1024,
        system,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        output_config: { effort: 'low' },
      };

      const response = await client.messages.create(
        payload as unknown as Parameters<typeof client.messages.create>[0],
        { signal: abortSignal }
      );

      if ('stop_reason' in response && (response.stop_reason as string) === 'refusal') {
        throw new AIProviderError('REFUSAL', 'anthropic');
      }

      if ('content' in response && Array.isArray(response.content)) {
        const textBlock = response.content.find((b) => b.type === 'text');
        if (textBlock && 'text' in textBlock) {
          return textBlock.text;
        }
      }

      throw new AIProviderError('INVALID_RESPONSE', 'anthropic');
    } catch (err) {
      throw mapAnthropicError(err, wasTimeout());
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
          'Responde únicamente con el JSON {"intent":"OTHER","date":null,"time":null,"service":null,"fullName":null,"contact":null}.',
        messages: [{ role: 'user', content: 'ping' }],
        config,
        timeoutSeconds,
      });
      return {
        ok: true,
        latencyMs: Math.round(performance.now() - start),
        message: 'Conexión correcta con Anthropic.',
      };
    } catch (err) {
      const mapped = err instanceof AIProviderError ? err : mapAnthropicError(err, false);
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - start),
        errorCode: mapped.code,
        message: mapped.message,
      };
    }
  },
};

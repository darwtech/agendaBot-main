/**
 * HopperSoft — Creador: Darwin Chavez
 */
import type { AIProviderConfig, AIProviderId } from '../../store/types';

export type AIErrorCode =
  | 'AUTH'
  | 'NO_BALANCE'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'UNAVAILABLE'
  | 'CORS'
  | 'INVALID_RESPONSE'
  | 'REFUSAL';

export const AI_ERROR_MESSAGES: Record<AIErrorCode, string> = {
  AUTH: 'Clave de API inválida o sin permisos.',
  NO_BALANCE: 'Sin saldo disponible en la cuenta del proveedor.',
  RATE_LIMIT: 'Límite de peticiones alcanzado. Inténtalo en unos segundos.',
  TIMEOUT: 'Tiempo de espera agotado al contactar con el proveedor.',
  UNAVAILABLE: 'El servicio del proveedor no está disponible en este momento.',
  CORS: 'Este proveedor no permite llamadas desde el navegador; usa otro o el Modo demo.',
  INVALID_RESPONSE: 'El proveedor devolvió una respuesta que no cumple el formato JSON esperado.',
  REFUSAL: 'El asistente no pudo procesar esa solicitud por políticas del modelo. Reformula tu mensaje, por favor.',
};

export class AIProviderError extends Error {
  readonly code: AIErrorCode;
  readonly providerId: AIProviderId;
  readonly status?: number;

  constructor(
    code: AIErrorCode,
    providerId: AIProviderId,
    customMessage?: string,
    status?: number
  ) {
    super(customMessage ?? AI_ERROR_MESSAGES[code]);
    this.name = 'AIProviderError';
    this.code = code;
    this.providerId = providerId;
    this.status = status;
  }
}

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AICompleteParams {
  system: string;
  messages: AIChatMessage[];
  signal?: AbortSignal;
  config: AIProviderConfig;
  timeoutSeconds?: number;
}

export interface AITestResult {
  ok: boolean;
  latencyMs: number;
  errorCode?: AIErrorCode;
  message: string;
}

export interface AIProvider {
  id: AIProviderId;
  name: string;
  models: string[];
  allowsCustomModel: boolean;
  requiresBaseUrl?: boolean;
  testConnection(
    config: AIProviderConfig,
    timeoutSeconds?: number
  ): Promise<AITestResult>;
  complete(params: AICompleteParams): Promise<string>;
}

export function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return '••••' + trimmed.slice(-2);
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

export function createCombinedAbortSignal(
  timeoutMs: number,
  externalSignal?: AbortSignal
): { signal: AbortSignal; cleanup: () => void; wasTimeout: () => boolean } {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error('TIMEOUT'));
  }, timeoutMs);

  const onExternalAbort = () => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    wasTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    },
  };
}

export function mapHttpStatusToError(
  status: number,
  providerId: AIProviderId,
  bodyText?: string
): AIProviderError {
  if (status === 401 || status === 403) {
    return new AIProviderError('AUTH', providerId, undefined, status);
  }
  if (status === 402) {
    return new AIProviderError('NO_BALANCE', providerId, undefined, status);
  }
  if (status === 429) {
    return new AIProviderError('RATE_LIMIT', providerId, undefined, status);
  }
  if (status >= 500) {
    return new AIProviderError('UNAVAILABLE', providerId, undefined, status);
  }
  const detail = bodyText ? ` (HTTP ${status})` : '';
  return new AIProviderError(
    'UNAVAILABLE',
    providerId,
    `Error del proveedor${detail}.`,
    status
  );
}

export function mapFetchFailureToError(
  err: unknown,
  providerId: AIProviderId,
  wasTimeout: boolean
): AIProviderError {
  if (err instanceof AIProviderError) return err;
  if (wasTimeout) {
    return new AIProviderError('TIMEOUT', providerId);
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new AIProviderError('TIMEOUT', providerId);
  }
  if (err instanceof TypeError) {
    // Browsers throw TypeError: Failed to fetch when CORS or network blocks the request
    return new AIProviderError('CORS', providerId);
  }
  return new AIProviderError('UNAVAILABLE', providerId);
}

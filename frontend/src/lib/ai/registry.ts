/**
 * HopperSoft — Creador: Darwin Chavez
 */
import type { AIProviderId } from '../../store/types';
import { anthropicProvider } from './anthropic';
import { deepseekProvider } from './deepseek';
import { geminiProvider } from './gemini';
import { groqProvider } from './groq';
import { mockProvider } from './mock';
import { openaiCompatibleProvider } from './openaiCompatible';
import type { AIProvider } from './types';

export const AI_PROVIDERS: Record<AIProviderId, AIProvider> = {
  mock: mockProvider,
  anthropic: anthropicProvider,
  groq: groqProvider,
  gemini: geminiProvider,
  deepseek: deepseekProvider,
  openaiCompatible: openaiCompatibleProvider,
};

export const AI_PROVIDER_LIST: AIProvider[] = [
  mockProvider,
  anthropicProvider,
  groqProvider,
  geminiProvider,
  deepseekProvider,
  openaiCompatibleProvider,
];

export function getAIProvider(id: AIProviderId): AIProvider {
  return AI_PROVIDERS[id] ?? mockProvider;
}

export function formatProviderBadgeLabel(
  id: AIProviderId,
  model?: string
): string {
  if (id === 'mock') return 'Modo demo';
  const provider = getAIProvider(id);
  const shortModel = model ? model.split('/').pop() : '';
  return shortModel ? `${provider.name} · ${shortModel}` : provider.name;
}

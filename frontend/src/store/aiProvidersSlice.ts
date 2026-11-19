import type { StateCreator } from 'zustand';
import { createDefaultProviders } from './seed';
import type { AIProviderConfig, AIProviderId } from './types';

export interface AIProvidersSlice {
  activeProviderId: AIProviderId;
  providers: Record<AIProviderId, AIProviderConfig>;
  setActiveProvider: (id: AIProviderId) => void;
  updateProviderConfig: (
    id: AIProviderId,
    patch: Partial<AIProviderConfig>
  ) => void;
  clearProviderKey: (id: AIProviderId) => void;
}

export const createAIProvidersSlice: StateCreator<
  AIProvidersSlice,
  [],
  [],
  AIProvidersSlice
> = (set) => ({
  activeProviderId: 'mock',
  providers: createDefaultProviders(),
  setActiveProvider: (id) =>
    set((state) => ({
      activeProviderId: id,
      providers: {
        ...state.providers,
        [id]: { ...state.providers[id], enabled: true },
      },
    })),
  updateProviderConfig: (id, patch) =>
    set((state) => ({
      providers: {
        ...state.providers,
        [id]: { ...state.providers[id], ...patch },
      },
    })),
  clearProviderKey: (id) =>
    set((state) => ({
      providers: {
        ...state.providers,
        [id]: { ...state.providers[id], apiKey: '' },
      },
    })),
});

/**
 * HopperSoft — Creador: Darwin Chavez
 */
import type { StateCreator } from 'zustand';
import { createDefaultSettings, DEFAULT_SYSTEM_PROMPT } from './seed';
import type { BusinessSettings } from './types';

export interface SettingsSlice {
  settings: BusinessSettings;
  updateSettings: (patch: Partial<BusinessSettings>) => void;
  resetSystemPrompt: () => void;
}

export const createSettingsSlice: StateCreator<
  SettingsSlice,
  [],
  [],
  SettingsSlice
> = (set) => ({
  settings: createDefaultSettings(),
  updateSettings: (patch) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...patch,
        pinChangedFromDefault:
          patch.adminPin !== undefined
            ? patch.adminPin !== '1234'
            : state.settings.pinChangedFromDefault,
      },
    })),
  resetSystemPrompt: () =>
    set((state) => ({
      settings: {
        ...state.settings,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
      },
    })),
});

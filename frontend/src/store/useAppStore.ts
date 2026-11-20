/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  createAIProvidersSlice,
  type AIProvidersSlice,
} from './aiProvidersSlice';
import {
  createAppointmentsSlice,
  type AppointmentsSlice,
} from './appointmentsSlice';
import { createCatalogSlice, type CatalogSlice } from './catalogSlice';
import {
  createConversationsSlice,
  type ConversationsSlice,
} from './conversationsSlice';
import { createCustomersSlice, type CustomersSlice } from './customersSlice';
import {
  createDefaultProviders,
  createDefaultSettings,
  createDemoSeedData,
  createEmptyDraft,
} from './seed';
import { createSettingsSlice, type SettingsSlice } from './settingsSlice';
import { tenantSlug } from '../lib/tenant';
import { safeLocalStorage } from './storage';
import type {
  AIProviderConfig,
  AIProviderId,
  BusinessSettings,
  DaySchedule,
  ServiceItem,
} from './types';

export interface ExportedConfigPayload {
  version: number;
  exportedAt: string;
  settings: BusinessSettings;
  activeProviderId: AIProviderId;
  providers: Record<AIProviderId, AIProviderConfig>;
  services: ServiceItem[];
  schedule: DaySchedule[];
}

export interface RootActionsSlice {
  adminUnlocked: boolean;
  unlockAdmin: (pin: string) => boolean;
  lockAdmin: () => void;
  resetDemoData: () => void;
  clearAllData: () => void;
  exportConfigJson: (excludeApiKeys: boolean) => string;
  importConfigJson: (rawJson: string) => { ok: boolean; error?: string };
}

export type AppStore = SettingsSlice &
  AIProvidersSlice &
  CatalogSlice &
  CustomersSlice &
  AppointmentsSlice &
  ConversationsSlice &
  RootActionsSlice;

const initialSeed = createDemoSeedData('Europe/Madrid');

export const useAppStore = create<AppStore>()(
  persist(
    (set, get, api) => ({
      ...createSettingsSlice(set, get, api),
      ...createAIProvidersSlice(set, get, api),
      ...createCatalogSlice(set, get, api),
      ...createCustomersSlice(set, get, api),
      ...createAppointmentsSlice(set, get, api),
      ...createConversationsSlice(set, get, api),

      services: initialSeed.services,
      schedule: initialSeed.schedule,
      customers: initialSeed.customers,
      appointments: initialSeed.appointments,
      conversations: initialSeed.conversations,
      activeConversationId: initialSeed.conversations[0].id,

      adminUnlocked: false,
      unlockAdmin: (pin) => {
        const isMatch = pin.trim() === get().settings.adminPin;
        if (isMatch) {
          set({ adminUnlocked: true });
        }
        return isMatch;
      },
      lockAdmin: () => set({ adminUnlocked: false }),

      resetDemoData: () => {
        const tz = get().settings.timezone || 'Europe/Madrid';
        const seed = createDemoSeedData(tz);
        set({
          services: seed.services,
          schedule: seed.schedule,
          customers: seed.customers,
          appointments: seed.appointments,
          conversations: seed.conversations,
          activeConversationId: seed.conversations[0].id,
        });
      },

      clearAllData: () => {
        const nowIso = new Date().toISOString();
        const welcomeId = `conv-${Date.now()}`;
        set({
          settings: createDefaultSettings(),
          activeProviderId: 'mock',
          providers: createDefaultProviders(),
          services: [],
          schedule: createDemoSeedData('Europe/Madrid').schedule,
          customers: [],
          appointments: [],
          conversations: [
            {
              id: welcomeId,
              channel: 'web',
              createdAt: nowIso,
              updatedAt: nowIso,
              draft: createEmptyDraft(),
              messages: [
                {
                  id: `msg-${Date.now()}`,
                  role: 'assistant',
                  content:
                    'Datos reiniciados. Añade servicios en el panel de administración o restablece los datos de demostración para empezar.',
                  timestamp: nowIso,
                  intent: 'OTHER',
                },
              ],
            },
          ],
          activeConversationId: welcomeId,
        });
      },

      exportConfigJson: (excludeApiKeys: boolean) => {
        const state = get();
        const sanitizedProviders = { ...state.providers };
        if (excludeApiKeys) {
          (Object.keys(sanitizedProviders) as AIProviderId[]).forEach((key) => {
            sanitizedProviders[key] = {
              ...sanitizedProviders[key],
              apiKey: '',
            };
          });
        }
        const payload: ExportedConfigPayload = {
          version: 1,
          exportedAt: new Date().toISOString(),
          settings: state.settings,
          activeProviderId: state.activeProviderId,
          providers: sanitizedProviders,
          services: state.services,
          schedule: state.schedule,
        };
        return JSON.stringify(payload, null, 2);
      },

      importConfigJson: (rawJson: string) => {
        try {
          const parsed = JSON.parse(rawJson) as Partial<ExportedConfigPayload>;
          if (!parsed || typeof parsed !== 'object' || !parsed.settings) {
            return {
              ok: false,
              error: 'El archivo JSON no tiene el formato esperado.',
            };
          }
          const current = get();
          const mergedProviders = { ...current.providers };
          if (parsed.providers) {
            (Object.keys(mergedProviders) as AIProviderId[]).forEach((pid) => {
              const incoming = parsed.providers?.[pid];
              if (incoming) {
                mergedProviders[pid] = {
                  ...mergedProviders[pid],
                  ...incoming,
                  // Preserve existing apiKey if imported one is empty
                  apiKey: incoming.apiKey || mergedProviders[pid].apiKey,
                };
              }
            });
          }

          set({
            settings: {
              ...current.settings,
              ...parsed.settings,
            },
            activeProviderId:
              parsed.activeProviderId ?? current.activeProviderId,
            providers: mergedProviders,
            services: Array.isArray(parsed.services)
              ? parsed.services
              : current.services,
            schedule: Array.isArray(parsed.schedule)
              ? parsed.schedule
              : current.schedule,
          });
          return { ok: true };
        } catch {
          return {
            ok: false,
            error: 'No se pudo analizar el JSON proporcionado.',
          };
        }
      },
    }),
    {
      // Una caché local por negocio, para no mezclar datos entre negocios.
      name: tenantSlug ? `agendabot-ai-store-v1:${tenantSlug}` : 'agendabot-ai-store-v1',
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({
        settings: state.settings,
        activeProviderId: state.activeProviderId,
        providers: state.providers,
        services: state.services,
        schedule: state.schedule,
        customers: state.customers,
        appointments: state.appointments,
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
      }),
    }
  )
);

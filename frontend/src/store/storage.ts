/**
 * HopperSoft — Creador: Darwin Chavez
 */
import type { StateStorage } from 'zustand/middleware';

const memoryFallback = new Map<string, string>();

export const safeLocalStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(name);
      }
      return memoryFallback.get(name) ?? null;
    } catch {
      return memoryFallback.get(name) ?? null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(name, value);
      } else {
        memoryFallback.set(name, value);
      }
    } catch {
      memoryFallback.set(name, value);
    }
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name);
      } else {
        memoryFallback.delete(name);
      }
    } catch {
      memoryFallback.delete(name);
    }
  },
};

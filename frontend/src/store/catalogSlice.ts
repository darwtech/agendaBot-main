/**
 * HopperSoft — Creador: Darwin Chavez
 */
import type { StateCreator } from 'zustand';
import { createDefaultSchedule, createDefaultServices } from './seed';
import type { DaySchedule, ServiceItem, TimeBlock } from './types';

export interface CatalogSlice {
  services: ServiceItem[];
  schedule: DaySchedule[];
  addService: (service: Omit<ServiceItem, 'id'>) => ServiceItem;
  updateService: (id: string, patch: Partial<Omit<ServiceItem, 'id'>>) => void;
  toggleServiceActive: (id: string) => void;
  updateDaySchedule: (
    dayOfWeek: DaySchedule['dayOfWeek'],
    patch: Partial<Omit<DaySchedule, 'dayOfWeek'>>
  ) => void;
  addScheduleBlock: (dayOfWeek: DaySchedule['dayOfWeek'], block: TimeBlock) => void;
  removeScheduleBlock: (dayOfWeek: DaySchedule['dayOfWeek'], index: number) => void;
}

export const createCatalogSlice: StateCreator<
  CatalogSlice,
  [],
  [],
  CatalogSlice
> = (set) => ({
  services: createDefaultServices(),
  schedule: createDefaultSchedule(),
  addService: (serviceInput) => {
    const newService: ServiceItem = {
      ...serviceInput,
      id: crypto.randomUUID(),
    };
    set((state) => ({
      services: [...state.services, newService],
    }));
    return newService;
  },
  updateService: (id, patch) =>
    set((state) => ({
      services: state.services.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),
  toggleServiceActive: (id) =>
    set((state) => ({
      services: state.services.map((s) =>
        s.id === id ? { ...s, active: !s.active } : s
      ),
    })),
  updateDaySchedule: (dayOfWeek, patch) =>
    set((state) => ({
      schedule: state.schedule.map((d) =>
        d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d
      ),
    })),
  addScheduleBlock: (dayOfWeek, block) =>
    set((state) => ({
      schedule: state.schedule.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, closed: false, blocks: [...d.blocks, block] }
          : d
      ),
    })),
  removeScheduleBlock: (dayOfWeek, index) =>
    set((state) => ({
      schedule: state.schedule.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const nextBlocks = d.blocks.filter((_, idx) => idx !== index);
        return {
          ...d,
          blocks: nextBlocks,
        };
      }),
    })),
});

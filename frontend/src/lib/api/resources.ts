import type {
  Appointment,
  BusinessSettings,
  Conversation,
  Customer,
  DaySchedule,
  ServiceItem,
} from '@/store/types';
import { api } from './client';

// Contrato REST esperado del backend. Ajusta las rutas aquí, en un solo sitio.
function crud<T extends { id: string }>(base: string) {
  return {
    list: (query?: Record<string, string | number | undefined>) => api.get<T[]>(base, { query }),
    get: (id: string) => api.get<T>(`${base}/${id}`),
    // El id lo genera el cliente; el backend debe aceptarlo (o devolver el suyo).
    create: (data: T) => api.post<T>(base, data),
    update: (id: string, data: Partial<T>) => api.patch<T>(`${base}/${id}`, data),
    remove: (id: string) => api.delete<void>(`${base}/${id}`),
  };
}

export const servicesApi = crud<ServiceItem>('/services');
export const customersApi = crud<Customer>('/customers');
export const conversationsApi = crud<Conversation>('/conversations');

export const appointmentsApi = crud<Appointment>('/appointments');

export const scheduleApi = {
  get: () => api.get<DaySchedule[]>('/schedule'),
  update: (days: DaySchedule[]) => api.put<DaySchedule[]>('/schedule', days),
};

export const settingsApi = {
  get: () => api.get<BusinessSettings>('/settings'),
  update: (data: Partial<BusinessSettings>) => api.patch<BusinessSettings>('/settings', data),
};

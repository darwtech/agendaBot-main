/**
 * HopperSoft — Creador: Darwin Chavez
 */
import type { StateCreator } from 'zustand';
import {
  bookAppointmentPure,
  type BookAppointmentInput,
  type BookAppointmentResult,
} from '../lib/booking/slots';
import type { CatalogSlice } from './catalogSlice';
import type { CustomersSlice } from './customersSlice';
import type { SettingsSlice } from './settingsSlice';
import type { Appointment } from './types';

export interface AppointmentsSlice {
  appointments: Appointment[];
  bookAppointment: (input: BookAppointmentInput) => BookAppointmentResult;
  cancelAppointment: (id: string) => void;
}

export const createAppointmentsSlice: StateCreator<
  AppointmentsSlice & CatalogSlice & CustomersSlice & SettingsSlice,
  [],
  [],
  AppointmentsSlice
> = (set, get) => ({
  appointments: [],
  bookAppointment: (input) => {
    const state = get();
    const result = bookAppointmentPure(input, {
      services: state.services,
      schedule: state.schedule,
      appointments: state.appointments,
      customers: state.customers,
      timezone: state.settings.timezone,
      slotInterval: state.settings.slotInterval,
    });

    if (result.ok) {
      set((curr) => ({
        appointments: [result.appointment, ...curr.appointments],
        customers: result.isNewCustomer
          ? [result.customer, ...curr.customers]
          : curr.customers.map((c) =>
              c.id === result.customer.id ? result.customer : c
            ),
      }));
    }

    return result;
  },
  cancelAppointment: (id) =>
    set((state) => ({
      appointments: state.appointments.map((apt) =>
        apt.id === id
          ? {
              ...apt,
              status: 'cancelled',
              cancelledAt: new Date().toISOString(),
            }
          : apt
      ),
    })),
});

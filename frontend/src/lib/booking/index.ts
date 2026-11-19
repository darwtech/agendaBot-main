import { useAppStore } from '../../store/useAppStore';
import {
  bookAppointmentPure,
  findNextAvailableDates,
  getAvailableSlots as getAvailableSlotsPure,
  type BookAppointmentInput,
  type BookAppointmentResult,
} from './slots';

export * from './slots';
export * from './timezone';

export function getAvailableSlots(date: string, serviceId: string): string[] {
  const state = useAppStore.getState();
  return getAvailableSlotsPure(date, serviceId, {
    services: state.services,
    schedule: state.schedule,
    appointments: state.appointments,
    timezone: state.settings.timezone,
    slotInterval: state.settings.slotInterval,
  });
}

export function bookAppointment(
  input: BookAppointmentInput
): BookAppointmentResult {
  return useAppStore.getState().bookAppointment(input);
}

export function getNextAvailableDatesForStore(
  fromDate: string,
  serviceId: string,
  daysToScan?: number,
  limit?: number
) {
  const state = useAppStore.getState();
  return findNextAvailableDates(
    fromDate,
    serviceId,
    {
      services: state.services,
      schedule: state.schedule,
      appointments: state.appointments,
      timezone: state.settings.timezone,
      slotInterval: state.settings.slotInterval,
    },
    daysToScan,
    limit
  );
}

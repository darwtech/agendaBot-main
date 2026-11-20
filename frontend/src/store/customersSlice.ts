/**
 * HopperSoft — Creador: Darwin Chavez
 */
import type { StateCreator } from 'zustand';
import type { Customer } from './types';

export interface CustomersSlice {
  customers: Customer[];
  upsertCustomer: (customer: Customer) => void;
}

export const createCustomersSlice: StateCreator<
  CustomersSlice,
  [],
  [],
  CustomersSlice
> = (set) => ({
  customers: [],
  upsertCustomer: (customer) =>
    set((state) => {
      const exists = state.customers.some((c) => c.id === customer.id);
      if (exists) {
        return {
          customers: state.customers.map((c) =>
            c.id === customer.id ? customer : c
          ),
        };
      }
      return {
        customers: [customer, ...state.customers],
      };
    }),
});

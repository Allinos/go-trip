import { create } from 'zustand';
import { rentalAPI } from '../services/api';

const unwrapVehicles = (res) => {
  const d = res?.data ?? res;
  return d?.vehicles ?? d?.items ?? (Array.isArray(d) ? d : []);
};

const useRentalStore = create((set, get) => ({
  vehicles: [],
  selectedVehicle: null,
  loading: false,
  error: null,

  setSelectedVehicle: (v) => set({ selectedVehicle: v }),

  searchVehicles: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const res = await rentalAPI.search(params);
      const list = unwrapVehicles(res);
      set({ vehicles: list, loading: false });
      return list;
    } catch (e) {
      const msg = e.response?.data?.error || 'Something went wrong';
      set({ error: msg, loading: false, vehicles: [] });
      throw e;
    }
  },

  bookRental: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await rentalAPI.book(id, data);
      set({ loading: false });
      return res;
    } catch (e) {
      const msg = e.response?.data?.error || 'Something went wrong';
      set({ error: msg, loading: false });
      throw e;
    }
  },
}));

export default useRentalStore;

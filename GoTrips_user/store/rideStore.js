import { create } from 'zustand';
import { rideAPI } from '../services/api';

const unwrapList = (res) => {
  const d = res?.data ?? res;
  return d?.rides ?? d?.bookings ?? d?.items ?? (Array.isArray(d) ? d : []);
};

const useRideStore = create((set, get) => ({
  searchParams: {
    pickup: null,
    drop: null,
    date: null,
    vehicleType: 'taxi',
    seats: 1,
  },
  rides: [],
  bookings: [],
  selectedRide: null,
  loading: false,
  error: null,

  setSearchParams: (partial) =>
    set((state) => ({
      searchParams: { ...state.searchParams, ...partial },
    })),

  searchRides: async (overrideParams) => {
    const params = { ...get().searchParams, ...overrideParams };
    set({ loading: true, error: null });
    try {
      const res = await rideAPI.search({
        pickup: params.pickup?.address || params.pickup?.label,
        drop: params.drop?.address || params.drop?.label,
        date: params.date,
        vehicleType: params.vehicleType,
        seats: params.seats,
      });
      const list = unwrapList(res);
      set({ rides: list, loading: false });
      return list;
    } catch (e) {
      const msg = e.response?.data?.error || 'Something went wrong';
      set({ error: msg, loading: false });
      throw e;
    }
  },

  setSelectedRide: (ride) => set({ selectedRide: ride }),

  bookRide: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await rideAPI.book(id, data);
      set({ loading: false });
      return res;
    } catch (e) {
      const msg = e.response?.data?.error || 'Something went wrong';
      set({ error: msg, loading: false });
      throw e;
    }
  },

  loadBookings: async (query) => {
    set({ loading: true, error: null });
    try {
      const res = await rideAPI.getMyBookings(query);
      const list = unwrapList(res);
      set({ bookings: list, loading: false });
      return list;
    } catch (e) {
      const msg = e.response?.data?.error || 'Something went wrong';
      set({ error: msg, loading: false });
      throw e;
    }
  },

  cancelBooking: async (id, reason) => {
    set({ loading: true, error: null });
    try {
      await rideAPI.cancelBooking(id, reason);
      set({ loading: false });
      await get().loadBookings();
    } catch (e) {
      const msg = e.response?.data?.error || 'Something went wrong';
      set({ error: msg, loading: false });
      throw e;
    }
  },
}));

export default useRideStore;

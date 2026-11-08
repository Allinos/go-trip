import API from "./axiosConfig"; // Your base axios instance

export const createRide = async (rideData) => {
  try {
    const response = await API.post("/rides/create", rideData);
    return response.data;
  } catch (error) {
    console.error("Error creating ride:", error);
    throw error;
  }
};

export const getMyRides = async () => {
  try {
    const response = await API.get("/rides/my-rides");
    return response.data;
  } catch (error) {
    console.error("Error getting rides:", error);
    throw error;
  }
};

export const getRideDetails = async (id) => {
  const response = await API.get(`/rides/${id}`);
  return response.data;
};

export const updateMyRide = async (id, payload) => {
  try {
    const response = await API.put(`/rides/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error("error updating MyRide", error);
    throw error;
  }
};

export const canelRide = async (id) => {
  try {
    const response = await API.post(`/rides/${id}/cancel`);
    return response.data;
  } catch (error) {
    console.error("error Delete MyRide", error);
    throw error;
  }
};

// Get all bookings with optional status filtering
export const getMyBookings = async (page = 1, bookingStatus = "") => {
  const url = `/rides/my-bookings?page=${page}&limit=10${bookingStatus ? `&bookingStatus=${bookingStatus}` : ""}`;
  return API.get(url);
};

// Cancel a specific booking
export const cancelBookingApi = async (id, reason) => {
  return API.post(`/rides/bookings/${id}/cancel`, {
    cancellationReason: reason,
  });
};

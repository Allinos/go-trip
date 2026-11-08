import API from "./axiosConfig"; // Your base axios instance
export const getLocations = async () => {
  try {
    const response = await API.get("/locations");
    return response.data;
  } catch (error) {
    console.error("Error fetching locations", error);
    throw error;
  }
};

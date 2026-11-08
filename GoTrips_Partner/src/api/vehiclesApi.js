import API from "./axiosConfig"; // Your base axios instance

export const createVehicle = async (vehicleData) => {
  try {
    const response = await API.post("/vehicles", vehicleData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const uploadVehiclePhotos = async (vehicleId, imageUris) => {
  try {
    const formData = new FormData();

    imageUris.forEach((item) => {
      const uri = typeof item === "object" ? item.uri : item;
      if (!uri) return; // Skip if undefined
      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      formData.append("vehiclePhotos", {
        uri: uri,
        name: filename,
        type,
      });
    });

    const response = await API.post(`/vehicles/${vehicleId}/photos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    console.error("Upload API Error:", error.response?.data || error.message);
    console.log(error);

    throw error;
  }
};

export const deleteVehiclePhoto = async (id, photoIndex) => {
  try {
    const response = await API.delete(
      `/vehicles/${id}/photos/${photoIndex}`,
    );
    return response.data;
  } catch (error) {
    console.error(
      "Delete Photo API Error:",
      error.response?.data || error.message,
    );
    throw error.response?.data || new Error("Could not delete image");
  }
};

export const registerVehicleWithPhoto = async (vehicleData, imageUri) => {
  const result = await createVehicle(vehicleData);

  const vehicleId = result?.data?.id;

  if (imageUri && vehicleId) {
    await uploadVehiclePhotos(vehicleId, imageUri);
  }

  return result;
};

export const getMyVehicles = async () => {
  try {
    const response = await API.get("/vehicles/my-vehicles");
    return response.data; // This will return the { success, data, message } object
  } catch (error) {
    throw error;
  }
};

export const getVehicleDetails = async (vehicleId) => {
  try {
    const response = await API.get(`/vehicles/${vehicleId}`);
    return response.data; // This will return the { success, data, message } object
  } catch (error) {
    throw error;
  }
};

export const updateVehicle = async (vehicleId, vehicleData) => {
  try {
    const response = await API.put(`/vehicles/${vehicleId}`, vehicleData);
    return response.data;
  } catch (error) {
    console.error(
      "Error updating vehicle:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const deleteVehicle = async (vehicleId) => {
  try {
    const res = await API.delete(`/vehicles/${vehicleId}`);
    return res.data;
  } catch (error) {
    console.error("Delete Vehicle Error:", error);
    throw error;
  }
};

export const updateVehicleAvailability = async (id, data) => {
  try {
    let res = await API.put(`/vehicles/${id}/availability`, data);
    return res.data;
  } catch (error) {
    console.error("Update Vehicle Availability Error:", error);
    throw error;
  }
};

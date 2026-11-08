import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocations } from "api/locationApi";

const STORAGE_KEY = "@locations_data";
const SYNC_KEY = "@last_location_sync";
const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;

export const getStoredLocations = async () => {
  try {
    const lastSync = await AsyncStorage.getItem(SYNC_KEY);
    const now = Date.now();

    // 1. Check if we need to fetch from API (First time OR 5 days passed)
    if (!lastSync || now - parseInt(lastSync) > FIVE_DAYS) {
      console.log("Syncing with Server...");

      const response = await getLocations();
      const data = await response.data;

      // 2. Save to "Virtual Folder" (AsyncStorage)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(SYNC_KEY, now.toString());

      return data;
    }

    // 3. Otherwise, just read from Storage
    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (e) {
    console.error("Storage Error", e);
    return [];
  }
};

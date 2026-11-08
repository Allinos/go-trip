import { useState, useCallback, useRef, useEffect } from 'react';
import * as ExpoLocation from 'expo-location';

export default function useLocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const subRef = useRef(null);

  const requestPermissions = useCallback(async () => {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission denied');
      return false;
    }
    setError(null);
    return true;
  }, []);

  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ok = await requestPermissions();
      if (!ok) {
        setLoading(false);
        return null;
      }
      const pos = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLocation(coords);
      setLoading(false);
      return coords;
    } catch (e) {
      setError(e.message || 'Failed to get location');
      setLoading(false);
      return null;
    }
  }, [requestPermissions]);

  const watchPosition = useCallback(
    async (options) => {
      const ok = await requestPermissions();
      if (!ok) return () => {};
      subRef.current?.remove?.();
      subRef.current = await ExpoLocation.watchPositionAsync(
        {
          accuracy: ExpoLocation.Accuracy.Balanced,
          ...options,
        },
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      );
      return () => {
        subRef.current?.remove?.();
        subRef.current = null;
      };
    },
    [requestPermissions]
  );

  useEffect(() => {
    return () => {
      subRef.current?.remove?.();
    };
  }, []);

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    requestPermissions,
    watchPosition,
  };
}

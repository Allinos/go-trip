import { refreshToken } from "./authApi";

export const refreshAccessToken = async () => {
  const refresh_token = await AsyncStorage.getItem("refresh_token");

  const res = await refreshToken(refresh_token);

  const { access_token } = res.data;

  await AsyncStorage.setItem("access_token", access_token);

  return access_token;
};
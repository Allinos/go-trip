import API from './axiosConfig'; // Your axios instance


// update user profile onboarding and later
export const updateUserOnboarding = async ( userId) => {
  return API.put(`/users/${userId}/profile-onboarding`);
};


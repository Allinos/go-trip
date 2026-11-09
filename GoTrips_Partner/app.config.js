// Extends app.json.
//  - Adds the Firebase config for FCM push only when the file exists, so local/dev builds work without it.
//  - Android blocks plain-HTTP requests in release builds. When the API URL is http:// (a LAN server during
//    testing) the build allows cleartext traffic so an installed APK can reach it. Production must use https.
const fs = require('fs');

module.exports = ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || config.extra?.apiUrl || '';
  const cleartext = apiUrl.startsWith('http://');
  return {
    ...config,
    android: { ...config.android, softwareKeyboardLayoutMode: 'resize', ...(fs.existsSync('./google-services.json') ? { googleServicesFile: './google-services.json' } : {}) },
    plugins: [...(config.plugins || []), ['expo-build-properties', { android: { usesCleartextTraffic: cleartext } }]],
    extra: { ...config.extra, apiUrl },
  };
};

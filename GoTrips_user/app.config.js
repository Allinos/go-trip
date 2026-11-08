// Extends app.json. Adds the Firebase config for FCM push only when the file exists,
// so local/dev builds work without it. Download google-services.json from the Firebase console.
const fs = require('fs');

module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, ...(fs.existsSync('./google-services.json') ? { googleServicesFile: './google-services.json' } : {}) },
  extra: { ...config.extra, apiUrl: process.env.EXPO_PUBLIC_API_URL || config.extra?.apiUrl },
});

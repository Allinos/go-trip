'use strict';
/**
 * Firebase Cloud Messaging. Tokens are FCM device tokens (expo-notifications getDevicePushTokenAsync).
 * Invalid tokens are deactivated automatically.
 */
const env = require('../config/env');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

let messaging = null;
if (env.FCM_ENABLED && env.FIREBASE_PROJECT_ID && env.FIREBASE_PRIVATE_KEY) {
  const admin = require('firebase-admin');
  admin.initializeApp({
    credential: admin.credential.cert({ projectId: env.FIREBASE_PROJECT_ID, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') }),
  });
  messaging = admin.messaging();
  logger.info('FCM enabled');
}

const stringify = (data = {}) => Object.fromEntries(Object.entries(data).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));

/** Push to every active device of a user for one app (user / partner). */
async function sendToUser(userId, app, { title, body, data }) {
  if (!messaging) return 0;
  const tokens = await prisma.pushToken.findMany({ where: { userId, app, isActive: true }, select: { token: true }, take: 10 });
  if (!tokens.length) return 0;
  const res = await messaging.sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: { title, body },
    data: stringify(data),
    android: { priority: 'high', notification: { channelId: 'default', sound: 'default' } },
    apns: { payload: { aps: { sound: 'default' } } },
  });
  const dead = [];
  res.responses.forEach((r, i) => {
    const code = r.error?.code || '';
    if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token') || code.includes('invalid-argument')) dead.push(tokens[i].token);
  });
  if (dead.length) await prisma.pushToken.updateMany({ where: { token: { in: dead } }, data: { isActive: false } });
  return res.successCount;
}

module.exports = { sendToUser, enabled: () => !!messaging };

'use strict';
/**
 * SMS delivery. Cheapest reliable options in India are Fast2SMS / MSG91 (DLT-registered templates required
 * for transactional SMS). "console" just logs (development).
 */
const axios = require('axios');
const env = require('../config/env');
const logger = require('../lib/logger');
const { maskPhone } = require('../lib/util');

const local10 = (phone) => phone.replace(/^\+91/, '').replace(/\D/g, '');

const providers = {
  async console(phone, message) {
    logger.info({ to: phone, message }, '[sms:console]');
  },
  async fast2sms(phone, message, { otp } = {}) {
    const params = otp
      ? env.FAST2SMS_DLT_OTP_TEMPLATE_ID
        ? { route: 'dlt', sender_id: env.FAST2SMS_SENDER_ID, message: env.FAST2SMS_DLT_OTP_TEMPLATE_ID, variables_values: otp, numbers: local10(phone) }
        : { route: 'otp', variables_values: otp, numbers: local10(phone) }
      : { route: 'q', message, numbers: local10(phone) };
    const { data } = await axios.get('https://www.fast2sms.com/dev/bulkV2', { params: { authorization: env.FAST2SMS_API_KEY, ...params }, timeout: 8000 });
    if (data.return !== true) throw new Error(data.message || 'Fast2SMS error');
  },
  async msg91(phone, message, { otp } = {}) {
    const template = otp ? env.MSG91_OTP_TEMPLATE_ID : env.MSG91_ALERT_TEMPLATE_ID;
    await axios.post(
      'https://control.msg91.com/api/v5/flow',
      { template_id: template, short_url: '0', recipients: [{ mobiles: `91${local10(phone)}`, otp, message }] },
      { headers: { authkey: env.MSG91_AUTH_KEY, 'content-type': 'application/json' }, timeout: 8000 }
    );
  },
  async twilio(phone, message) {
    const auth = { username: env.TWILIO_ACCOUNT_SID, password: env.TWILIO_AUTH_TOKEN };
    await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, new URLSearchParams({ To: phone, From: env.TWILIO_FROM, Body: message }), { auth, timeout: 8000 });
  },
};

/** Send an SMS. Never throws for alerts; throws for OTP so the caller can report failure. */
async function send(phone, message, { otp, critical = false } = {}) {
  const provider = providers[env.SMS_PROVIDER] || providers.console;
  try {
    await provider(phone, message, { otp });
    return true;
  } catch (e) {
    logger.error({ to: maskPhone(phone), provider: env.SMS_PROVIDER, err: e.response?.data || e.message }, 'sms failed');
    if (critical) throw e;
    return false;
  }
}

const { OTP_SMS } = require('./messages');
const sendOtp = (phone, otp, lang = 'en') => send(phone, (OTP_SMS[lang] || OTP_SMS.en)(otp, Math.round(env.OTP_TTL_SECONDS / 60)), { otp, critical: true });

module.exports = { send, sendOtp };

'use strict';
/**
 * Email via SMTP (nodemailer). Works with any provider:
 *  - Amazon SES SMTP  (cheapest at scale: ~$0.10 / 1000 mails)   SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
 *  - Brevo free tier (300/day)                                   SMTP_HOST=smtp-relay.brevo.com
 *  - Gmail / Google Workspace with an App Password (low volume)  SMTP_HOST=smtp.gmail.com
 */
const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../lib/logger');

let transport = null;
if (env.EMAIL_ENABLED && env.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    pool: true,
    maxConnections: 3,
  });
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#ef4444;color:#fff;padding:18px 24px;font-size:20px;font-weight:bold">GoTrip</td></tr>
  <tr><td style="padding:24px"><h2 style="margin:0 0 12px;font-size:18px">${esc(title)}</h2>${bodyHtml}</td></tr>
  <tr><td style="padding:16px 24px;font-size:12px;color:#6b7280;border-top:1px solid #eee">This is an automated message from GoTrip.</td></tr>
  </table></td></tr></table></body></html>`;
}

/** Fire-and-forget email. Returns false when email is disabled or fails. */
async function send(to, subject, title, paragraphs = []) {
  if (!to) return false;
  const html = layout(title, paragraphs.map((p) => `<p style="margin:0 0 12px;line-height:1.5">${esc(p)}</p>`).join(''));
  if (!transport) {
    logger.debug({ to, subject }, '[email:disabled]');
    return false;
  }
  try {
    await transport.sendMail({ from: env.EMAIL_FROM, to, subject, html, text: paragraphs.join('\n\n') });
    return true;
  } catch (e) {
    logger.error({ err: e.message, subject }, 'email failed');
    return false;
  }
}

module.exports = { send };

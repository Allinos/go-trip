'use strict';
/**
 * File storage.
 *  - Images are re-encoded with sharp (auto-rotate, max 1600px, JPEG q80, metadata/EXIF stripped).
 *    That cuts photo size ~5-10x and removes GPS data from phone pictures.
 *  - PDFs are accepted for documents after a magic-byte check.
 *  - Every object is private. Clients get short-lived signed URLs (S3 presigned or HMAC-signed local URLs).
 * Drivers: "s3" (AWS S3, Cloudflare R2, MinIO via S3_ENDPOINT) or "local" (single-server/dev).
 */
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const env = require('../config/env');
const { hmac, safeEqual } = require('../lib/util');
const { badRequest } = require('../lib/errors');
const logger = require('../lib/logger');

let s3 = null;
let s3cmd = null;
let presign = null;
if (env.STORAGE_DRIVER === 's3') {
  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  ({ getSignedUrl: presign } = require('@aws-sdk/s3-request-presigner'));
  s3 = new S3Client({
    region: env.AWS_REGION,
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT, forcePathStyle: true } : {}),
    ...(env.AWS_ACCESS_KEY_ID ? { credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY } } : {}),
  });
  s3cmd = { PutObjectCommand, GetObjectCommand, DeleteObjectCommand };
}

const localRoot = path.resolve(env.LOCAL_UPLOAD_DIR);

async function processFile(file, { allowPdf }) {
  if (!file?.buffer?.length) throw badRequest('File is empty');
  const isPdf = file.buffer.subarray(0, 5).toString() === '%PDF-';
  if (isPdf) {
    if (!allowPdf) throw badRequest('Please upload an image (JPG or PNG)');
    return { buffer: file.buffer, ext: 'pdf', contentType: 'application/pdf' };
  }
  try {
    const buffer = await sharp(file.buffer, { failOn: 'error' }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    return { buffer, ext: 'jpg', contentType: 'image/jpeg' };
  } catch {
    throw badRequest('The uploaded file is not a valid image');
  }
}

/** Store an uploaded multer file. Returns the storage key. */
async function save(file, folder, { allowPdf = false } = {}) {
  const { buffer, ext, contentType } = await processFile(file, { allowPdf });
  const d = new Date();
  const key = `${folder}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${ext}`;
  if (s3) {
    await s3.send(new s3cmd.PutObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key, Body: buffer, ContentType: contentType, CacheControl: 'private, max-age=86400' }));
  } else {
    const full = path.join(localRoot, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buffer);
  }
  return key;
}

async function remove(key) {
  if (!key) return;
  try {
    if (s3) await s3.send(new s3cmd.DeleteObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }));
    else await fs.unlink(path.join(localRoot, key));
  } catch (e) {
    logger.warn({ key, err: e.message }, 'storage delete failed');
  }
}

const urlCache = new Map();

/** Signed, expiring URL for a key. ttl in seconds. Cached so list pages don't re-sign the same object. */
async function url(key, ttl = 3600) {
  if (!key) return null;
  const cached = urlCache.get(key);
  if (cached && cached.exp - Date.now() > 5 * 60_000) return cached.url;
  let signed;
  const exp = Date.now() + ttl * 1000;
  if (s3) {
    signed = await presign(s3, new s3cmd.GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }), { expiresIn: ttl });
  } else {
    const e = Math.floor(exp / 1000);
    signed = `${env.PUBLIC_BASE_URL}/files/${key}?e=${e}&s=${hmac(env.FILE_URL_SECRET, `${key}:${e}`).slice(0, 32)}`;
  }
  if (urlCache.size > 5000) urlCache.clear();
  urlCache.set(key, { url: signed, exp });
  return signed;
}

const urls = (keys = [], ttl) => Promise.all((keys || []).map((k) => url(k, ttl)));

/** Express handler for the local driver: GET /files/<key>?e=&s= */
async function serveLocal(req, res) {
  const key = req.params.key.join ? req.params.key.join('/') : req.params.key;
  const e = Number(req.query.e);
  const sig = String(req.query.s || '');
  if (!key || key.includes('..') || !e || e * 1000 < Date.now() || !safeEqual(sig, hmac(env.FILE_URL_SECRET, `${key}:${e}`).slice(0, 32))) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Link expired or invalid' } });
  }
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.join(localRoot, key), (err) => err && !res.headersSent && res.status(404).end());
}

module.exports = { save, remove, url, urls, serveLocal, driver: s3 ? 's3' : 'local' };

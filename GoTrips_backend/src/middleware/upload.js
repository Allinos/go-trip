'use strict';
const multer = require('multer');
const env = require('../config/env');
const { badRequest } = require('../lib/errors');

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const DOC_TYPES = [...IMAGE_TYPES, 'application/pdf'];

const make = (allowed) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 10 },
    fileFilter: (_req, file, cb) => (allowed.includes(file.mimetype) ? cb(null, true) : cb(badRequest(`Unsupported file type (${file.mimetype}). Use JPG, PNG${allowed.includes('application/pdf') ? ' or PDF' : ''}.`))),
  });

module.exports = { imageUpload: make(IMAGE_TYPES), documentUpload: make(DOC_TYPES) };

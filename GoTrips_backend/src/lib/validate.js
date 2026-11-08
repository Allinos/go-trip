'use strict';
const { z } = require('zod');
const { badRequest } = require('./errors');

/**
 * validate({ body, query, params }) -> express middleware.
 * Parsed (coerced, stripped) values replace the originals; unknown keys are dropped.
 */
function validate(schemas) {
  return (req, _res, next) => {
    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
        return next(badRequest(details[0] ? `${details[0].field ? details[0].field + ': ' : ''}${details[0].message}` : 'Invalid input', details, 'VALIDATION_ERROR'));
      }
      // Express 5 makes req.query a getter; define our own property instead of assigning.
      Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true, enumerable: true });
    }
    next();
  };
}

// Reusable field helpers
const id = z.coerce.number().int().positive();
const idParam = z.object({ id });
const trimmed = (max, min = 1) => z.string().trim().min(min).max(max);
const optText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v));
const strList = (maxItems = 20, maxLen = 60) => z.array(z.string().trim().min(1).max(maxLen)).max(maxItems);
const lat = z.coerce.number().min(-90).max(90);
const lng = z.coerce.number().min(-180).max(180);
const money = z.coerce.number().int().min(0).max(10_000_000);
const boolish = z.preprocess((v) => (v === 'true' || v === '1' ? true : v === 'false' || v === '0' ? false : v), z.boolean());
const pageQuery = { page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional() };

module.exports = { validate, z, id, idParam, trimmed, optText, strList, lat, lng, money, boolish, pageQuery };

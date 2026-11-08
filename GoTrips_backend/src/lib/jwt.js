'use strict';
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const ISSUER = 'gotrip-api';

const signAccess = (user, app) => jwt.sign({ sub: String(user.id), app, typ: 'access' }, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL, issuer: ISSUER, audience: app });

const verifyAccess = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: ISSUER, audience: ['user', 'partner'] });

const signAdmin = (admin) => jwt.sign({ sub: String(admin.id), role: admin.role, ver: admin.tokenVersion, typ: 'admin' }, env.JWT_ADMIN_SECRET, { expiresIn: env.ADMIN_TOKEN_TTL, issuer: ISSUER, audience: 'admin' });

const verifyAdmin = (token) => jwt.verify(token, env.JWT_ADMIN_SECRET, { issuer: ISSUER, audience: 'admin' });

module.exports = { signAccess, verifyAccess, signAdmin, verifyAdmin };

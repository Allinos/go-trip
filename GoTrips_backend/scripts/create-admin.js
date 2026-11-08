'use strict';
/**
 * Create (or reset) an admin account.
 *   npm run admin:create -- --email admin@gotrip.in --name "Admin" --role super_admin
 * The password is read from ADMIN_PASSWORD or prompted (never passed on the command line).
 */
require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => (v.startsWith('--') ? [...acc, [v.slice(2), arr[i + 1]]] : acc), []));

function ask(q) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (a) => {
      rl.close();
      resolve(a);
    });
  });
}

(async () => {
  const prisma = new PrismaClient();
  const email = (args.email || (await ask('Email: '))).trim().toLowerCase();
  const name = args.name || 'Administrator';
  const role = args.role || 'super_admin';
  const password = process.env.ADMIN_PASSWORD || (await ask('Password (min 10 chars): '));
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Invalid email');
  if (password.length < 10) throw new Error('Password must be at least 10 characters');
  if (!['super_admin', 'admin', 'support'].includes(role)) throw new Error('Role must be super_admin, admin or support');
  const passwordHash = await bcrypt.hash(password, 12);
  const a = await prisma.adminUser.upsert({ where: { email }, create: { email, name, role, passwordHash }, update: { passwordHash, role, isActive: true, tokenVersion: { increment: 1 } } });
  console.log(`Admin ready: ${a.email} (${a.role})`);
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

const { execSync } = require('child_process');
module.exports = async () => {
  require('./env');
  execSync('npx prisma migrate deploy', { stdio: 'ignore', env: process.env });
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  await prisma.$disconnect();
  execSync('node prisma/seed.js', { stdio: 'ignore', env: process.env });
};

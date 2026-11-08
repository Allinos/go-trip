require('dotenv').config();
const prisma = require('../src/config/database');

async function test() {
  try {
    await prisma.$connect();
    console.log('✅ Connected successfully');
  } catch (err) {
    console.error('❌ Connection failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
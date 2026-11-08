const s3Client = require('../src/config/aws'); // Adjust path to your config file
const { ListBucketsCommand } = require('@aws-sdk/client-s3');

async function testConnection() {
  try {
    const data = await s3Client.send(new ListBucketsCommand({}));
    console.log("Success! Found these buckets:", data.Buckets.map(b => b.Name));
  } catch (err) {
    console.error("❌ Connection failed. Check your keys/permissions!", err.message);
  }
}

testConnection();
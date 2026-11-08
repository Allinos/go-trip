

require('dotenv').config(); // 👈 Add this at the top!
const { S3Client } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

console.log(process.env.AWS_REGION);
console.log(process.env.AWS_SECRET_ACCESS_KEY);
console.log(process.env.AWS_ACCESS_KEY_ID);

console.log('✅ AWS S3 client initialized');

module.exports = s3Client;
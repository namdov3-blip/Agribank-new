// Script test kết nối MongoDB
// Chạy: node test-mongodb-connection.js

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔍 Testing MongoDB Connection...');
console.log('Connection String:', MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Ẩn password

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connection successful!');
    console.log('✅ Connected to:', mongoose.connection.name);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed!');
    console.error('Error:', error.message);
    console.error('\n💡 Possible solutions:');
    console.error('1. Check username and password in MongoDB Atlas');
    console.error('2. Check Network Access in MongoDB Atlas');
    console.error('3. Verify connection string format');
    process.exit(1);
  });

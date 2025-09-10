const mongoose = require('mongoose');
require('dotenv').config();

async function fixDatabase() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate-dapp');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('properties');

    console.log('🔍 Checking existing indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    // Drop the unique index on tokenId if it exists
    try {
      await collection.dropIndex('tokenId_1');
      console.log('✅ Dropped unique index on tokenId');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️ Index tokenId_1 does not exist, skipping...');
      } else {
        console.log('⚠️ Error dropping index:', error.message);
      }
    }

    // Create a sparse index instead
    try {
      await collection.createIndex({ tokenId: 1 }, { sparse: true });
      console.log('✅ Created sparse index on tokenId');
    } catch (error) {
      console.log('⚠️ Error creating sparse index:', error.message);
    }

    console.log('🔍 Final indexes:');
    const finalIndexes = await collection.indexes();
    console.log(finalIndexes.map(idx => idx.name));

    console.log('🎉 Database fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    process.exit(1);
  }
}

fixDatabase();

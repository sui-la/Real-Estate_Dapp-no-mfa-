const mongoose = require('mongoose');
require('dotenv').config();

async function fixDatabase() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate-dapp');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('properties');

    console.log('🔍 Checking ALL existing indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Drop ALL problematic indexes
    const indexesToDrop = ['propertyId_1', 'tokenId_1'];
    
    for (const indexName of indexesToDrop) {
      try {
        await collection.dropIndex(indexName);
        console.log(`✅ Dropped index: ${indexName}`);
      } catch (error) {
        if (error.code === 27) {
          console.log(`ℹ️ Index ${indexName} does not exist, skipping...`);
        } else {
          console.log(`⚠️ Error dropping index ${indexName}:`, error.message);
        }
      }
    }

    // Clear all existing properties to start fresh
    console.log('🧹 Clearing existing properties...');
    const deleteResult = await collection.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing properties`);

    console.log('🔍 Final indexes:');
    const finalIndexes = await collection.indexes();
    console.log(finalIndexes.map(idx => ({ name: idx.name, key: idx.key })));

    console.log('🎉 Database completely fixed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    process.exit(1);
  }
}

fixDatabase();

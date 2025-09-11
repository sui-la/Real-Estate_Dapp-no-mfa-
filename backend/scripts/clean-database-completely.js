const mongoose = require('mongoose');
const Property = require('../models/Property');
require('dotenv').config();

async function cleanDatabaseCompletely() {
  try {
    console.log('🧹 Starting complete database cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/real_estate_dapp');
    console.log('✅ Connected to MongoDB');
    
    // Find all properties in database
    const allProperties = await Property.find({}).sort({ tokenId: 1 });
    console.log(`\n📋 Found ${allProperties.length} properties in database:`);
    allProperties.forEach((p, index) => {
      console.log(`  ${index + 1}. ${p.name} (Token ID: ${p.tokenId})`);
    });
    
    // Delete ALL properties
    const deleteResult = await Property.deleteMany({});
    console.log(`\n🗑️  Deleted ALL ${deleteResult.deletedCount} properties from database`);
    
    // Verify database is empty
    const remainingProperties = await Property.find({});
    console.log(`\n✅ Database now has ${remainingProperties.length} properties (should be 0)`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('🎉 Complete cleanup finished!');
  }
}

// Run the cleanup
if (require.main === module) {
  cleanDatabaseCompletely();
}

module.exports = cleanDatabaseCompletely;

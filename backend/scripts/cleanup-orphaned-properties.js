const mongoose = require('mongoose');
const Property = require('../models/Property');
require('dotenv').config();

async function cleanupOrphanedProperties() {
  try {
    console.log('🧹 Starting cleanup of orphaned properties...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate-dapp');
    console.log('✅ Connected to MongoDB');
    
    // Find all properties in database
    const allProperties = await Property.find({}).sort({ tokenId: 1 });
    console.log('\n📋 Properties currently in database:');
    allProperties.forEach(p => {
      console.log(`  - ${p.name} (Token ID: ${p.tokenId})`);
    });
    
    // Find properties with tokenId > 10 (orphaned after blockchain reset)
    const orphanedProperties = await Property.find({ tokenId: { $gt: 10 } });
    console.log(`\n🔍 Found ${orphanedProperties.length} orphaned properties:`);
    
    if (orphanedProperties.length > 0) {
      orphanedProperties.forEach(p => {
        console.log(`  - ${p.name} (Token ID: ${p.tokenId}) - WILL BE DELETED`);
      });
      
      // Delete orphaned properties
      const deleteResult = await Property.deleteMany({ tokenId: { $gt: 10 } });
      console.log(`\n✅ Successfully deleted ${deleteResult.deletedCount} orphaned properties`);
      
      // Show remaining properties
      const remainingProperties = await Property.find({}).sort({ tokenId: 1 });
      console.log(`\n📋 Remaining properties in database (${remainingProperties.length}):`);
      remainingProperties.forEach(p => {
        console.log(`  - ${p.name} (Token ID: ${p.tokenId})`);
      });
    } else {
      console.log('  No orphaned properties found');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('🎉 Cleanup completed!');
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupOrphanedProperties();
}

module.exports = cleanupOrphanedProperties;

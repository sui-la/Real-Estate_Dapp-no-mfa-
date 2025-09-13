const { ethers } = require('ethers');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const User = require('../models/User');
require('dotenv').config();

// Contract ABIs (simplified)
const PROPERTY_TOKEN_ABI = [
  "function getTotalProperties() external view returns (uint256)",
  "function getProperty(uint256 tokenId) external view returns (tuple(uint256 tokenId, string name, string description, string location, uint256 totalValue, uint256 totalShares, uint256 sharesSold, address originalOwner, bool isActive, uint256 createdAt, string imageUrl, string[] documents))"
];

const REAL_ESTATE_ABI = [
  "function getContractAddresses() external view returns (address, address, address)",
  "function fractionalTokens(uint256) external view returns (address)"
];

const FRACTIONAL_TOKEN_ABI = [
  "function tradingEnabled() external view returns (bool)"
];

async function syncBlockchainProperties() {
  try {
    console.log('🔄 Starting blockchain to database sync...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate-dapp');
    console.log('✅ Connected to MongoDB');

    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    const signer = await provider.getSigner();
    
    // Get contract addresses from environment or deployed addresses
    const fs = require('fs');
    const path = require('path');
    const addressesFile = path.join(__dirname, '../../contracts/deployed-addresses.json');
    const addresses = JSON.parse(fs.readFileSync(addressesFile, 'utf8'));

    console.log('📋 Using contract addresses:', addresses);

    // Initialize contracts
    const mainContract = new ethers.Contract(
      addresses.VITE_MAIN_CONTRACT_ADDRESS,
      REAL_ESTATE_ABI,
      signer
    );

    const [propertyTokenAddress] = await mainContract.getContractAddresses();
    const propertyToken = new ethers.Contract(
      propertyTokenAddress,
      PROPERTY_TOKEN_ABI,
      signer
    );

    // Get total properties from blockchain
    const totalProperties = await propertyToken.getTotalProperties();
    console.log(`📊 Found ${totalProperties} properties on blockchain`);

    // Create default admin user if doesn't exist
    let adminUser = await User.findOne({ walletAddress: signer.address.toLowerCase() });
    if (!adminUser) {
      adminUser = new User({
        walletAddress: signer.address.toLowerCase(),
        email: `admin@wallet.local`, // Using @wallet.local to bypass password requirement
        isAdmin: true,
        name: 'Admin User'
      });
      await adminUser.save();
      console.log('✅ Created admin user');
    }

    // Sync each property
    let syncedCount = 0;
    for (let tokenId = 1; tokenId <= totalProperties; tokenId++) {
      try {
        console.log(`🔍 Syncing property ${tokenId}/${totalProperties}...`);

        // Get property from blockchain
        const blockchainProperty = await propertyToken.getProperty(tokenId);
        
        // Get fractional token address
        const fractionalTokenAddress = await mainContract.fractionalTokens(tokenId);
        
        // Check trading status from fractional token contract
        let tradingEnabled = false;
        try {
          const fractionalToken = new ethers.Contract(
            fractionalTokenAddress,
            FRACTIONAL_TOKEN_ABI,
            signer
          );
          tradingEnabled = await fractionalToken.tradingEnabled();
          console.log(`📈 Trading enabled for ${blockchainProperty.name}: ${tradingEnabled}`);
        } catch (error) {
          console.warn(`⚠️ Could not check trading status for token ${tokenId}:`, error.message);
        }

        // Check if property already exists in database
        let dbProperty = await Property.findOne({ tokenId });

        const propertyData = {
          tokenId: Number(blockchainProperty.tokenId),
          name: blockchainProperty.name,
          description: blockchainProperty.description,
          location: blockchainProperty.location,
          totalValue: Number(ethers.formatEther(blockchainProperty.totalValue)),
          totalShares: Number(blockchainProperty.totalShares),
          sharesSold: Number(blockchainProperty.sharesSold),
          originalOwner: adminUser._id,
          fractionalTokenAddress: fractionalTokenAddress,
          isFractionalized: true, // All synced properties are fractionalized
          isActive: blockchainProperty.isActive,
          tradingEnabled: tradingEnabled, // Add trading status from blockchain
          imageUrl: blockchainProperty.imageUrl,
          documents: blockchainProperty.documents,
          createdAt: new Date(Number(blockchainProperty.createdAt) * 1000),
          metadata: {
            propertyType: 'residential',
            amenities: []
          },
          analytics: {
            views: 0,
            favorites: 0,
            sharesTraded: 0
          }
        };

        if (dbProperty) {
          // Update existing property (avoid duplicates)
          Object.assign(dbProperty, propertyData);
          await dbProperty.save();
          console.log(`🔄 Updated existing property: ${blockchainProperty.name} (Token ID: ${tokenId})`);
        } else {
          // Create new property
          dbProperty = new Property(propertyData);
          await dbProperty.save();
          console.log(`✨ Created new property: ${blockchainProperty.name} (Token ID: ${tokenId})`);
        }

        syncedCount++;
      } catch (error) {
        console.error(`❌ Failed to sync property ${tokenId}:`, error.message);
      }
    }

    console.log(`🎉 Sync completed! ${syncedCount}/${totalProperties} properties synced`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the sync
if (require.main === module) {
  syncBlockchainProperties();
}

module.exports = syncBlockchainProperties;

const { ethers } = require('ethers');
const mongoose = require('mongoose');
const Property = require('../models/Property');
require('dotenv').config();

async function diagnosePropertyIssue(tokenId = 10) {
  console.log(`🔍 Diagnosing Property ${tokenId} Issue...`);
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate-dapp');
    console.log('✅ Connected to MongoDB');

    // Check database state
    console.log('\n📊 DATABASE STATE:');
    const dbProperty = await Property.findOne({ tokenId });
    if (dbProperty) {
      console.log(`✅ Property ${tokenId} found in database:`);
      console.log(`   Name: ${dbProperty.name}`);
      console.log(`   isFractionalized: ${dbProperty.isFractionalized}`);
      console.log(`   fractionalTokenAddress: ${dbProperty.fractionalTokenAddress}`);
      console.log(`   totalShares: ${dbProperty.totalShares}`);
      console.log(`   sharesSold: ${dbProperty.sharesSold}`);
    } else {
      console.log(`❌ Property ${tokenId} NOT found in database`);
    }

    // Check blockchain state
    console.log('\n🔗 BLOCKCHAIN STATE:');
    try {
      const provider = new ethers.JsonRpcProvider('http://localhost:8545');
      const signer = await provider.getSigner();
      
      // Get contract addresses
      const fs = require('fs');
      const path = require('path');
      const addressesFile = path.join(__dirname, '../../contracts/deployed-addresses.json');
      
      if (!fs.existsSync(addressesFile)) {
        console.log('❌ deployed-addresses.json not found. Contracts may not be deployed.');
        return;
      }
      
      const addresses = JSON.parse(fs.readFileSync(addressesFile, 'utf8'));
      console.log('📋 Contract addresses:', addresses);

      // Check main contract
      const mainContract = new ethers.Contract(
        addresses.VITE_MAIN_CONTRACT_ADDRESS,
        [
          "function isPropertyFractionalized(uint256) external view returns (bool)",
          "function fractionalTokens(uint256) external view returns (address)",
          "function getContractAddresses() external view returns (address, address, address)"
        ],
        signer
      );

      const isPropertyFractionalized = await mainContract.isPropertyFractionalized(tokenId);
      console.log(`   isPropertyFractionalized(${tokenId}): ${isPropertyFractionalized}`);

      const fractionalTokenAddress = await mainContract.fractionalTokens(tokenId);
      console.log(`   fractionalTokens(${tokenId}): ${fractionalTokenAddress}`);

      // Get property token contract
      const [propertyTokenAddress] = await mainContract.getContractAddresses();
      const propertyToken = new ethers.Contract(
        propertyTokenAddress,
        [
          "function getTotalProperties() external view returns (uint256)",
          "function getProperty(uint256 tokenId) external view returns (tuple(uint256 tokenId, string name, string description, string location, uint256 totalValue, uint256 totalShares, uint256 sharesSold, address originalOwner, bool isActive, uint256 createdAt, string imageUrl, string[] documents))"
        ],
        signer
      );

      const totalProperties = await propertyToken.getTotalProperties();
      console.log(`   Total properties on blockchain: ${totalProperties}`);

      // Try to get property details
      try {
        const blockchainProperty = await propertyToken.getProperty(tokenId);
        console.log(`✅ Property ${tokenId} found on blockchain:`);
        console.log(`   Name: ${blockchainProperty.name}`);
        console.log(`   Total Shares: ${blockchainProperty.totalShares}`);
        console.log(`   Shares Sold: ${blockchainProperty.sharesSold}`);
        console.log(`   Is Active: ${blockchainProperty.isActive}`);
      } catch (error) {
        console.log(`❌ Property ${tokenId} NOT found on blockchain:`, error.message);
      }

    } catch (error) {
      console.log('❌ Failed to connect to blockchain:', error.message);
      console.log('   Make sure Hardhat node is running: npx hardhat node');
    }

    // Analysis and recommendations
    console.log('\n🎯 ANALYSIS & RECOMMENDATIONS:');
    
    if (dbProperty && !dbProperty.isFractionalized) {
      console.log('🔧 Issue: Property exists in database but not marked as fractionalized');
      console.log('   Fix: Complete the fractionalization process on blockchain');
    }
    
    if (dbProperty && !dbProperty.fractionalTokenAddress) {
      console.log('🔧 Issue: Property missing fractional token address');
      console.log('   Fix: Run sync script or complete fractionalization');
    }

    if (!dbProperty) {
      console.log('🔧 Issue: Property not found in database');
      console.log('   Fix: Run sync script to sync from blockchain, or check if property exists');
    }

    console.log('\n📝 SUGGESTED COMMANDS:');
    console.log('1. Run sync script: node scripts/sync-blockchain-properties.js');
    console.log('2. Clean orphaned properties: node scripts/cleanup-orphaned-properties.js');
    console.log('3. Check blockchain: cd ../contracts && npx hardhat console --network localhost');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run diagnosis
if (require.main === module) {
  const tokenId = process.argv[2] ? parseInt(process.argv[2]) : 10;
  diagnosePropertyIssue(tokenId);
}

module.exports = diagnosePropertyIssue;

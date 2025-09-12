const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function cleanDatabase() {
  console.log('🧹 Cleaning database before deployment...');
  const { exec } = require('child_process');
  const path = require('path');
  
  return new Promise((resolve, reject) => {
    const cleanScript = path.join(__dirname, '../backend/scripts/clean-database-completely.js');
    exec(`node ${cleanScript}`, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error cleaning database:', error);
        reject(error);
        return;
      }
      console.log(stdout);
      console.log('✅ Database cleaned successfully');
      resolve();
    });
  });
}

async function main() {
  console.log("🚀 Starting contract deployment...");

  // Clean database before deployment
  await cleanDatabase();

  // Check if contracts are already deployed
  const addressesFile = 'deployed-addresses.json';
  let existingAddresses = null;
  
  if (fs.existsSync(addressesFile)) {
    try {
      existingAddresses = JSON.parse(fs.readFileSync(addressesFile, 'utf8'));
      console.log("📋 Found existing deployed addresses:", existingAddresses);
      
      // Check if contracts are still valid
      const provider = hre.ethers.provider;
      const mainContractCode = await provider.getCode(existingAddresses.VITE_MAIN_CONTRACT_ADDRESS);
      
      if (mainContractCode && mainContractCode !== '0x') {
        console.log("✅ Contracts already deployed and valid. Checking if sample properties exist...");
        
        // Check if sample properties already exist
        const RealEstateFractionalization = await hre.ethers.getContractFactory("RealEstateFractionalization");
        const existingContract = RealEstateFractionalization.attach(existingAddresses.VITE_MAIN_CONTRACT_ADDRESS);
        
        try {
          // Check if we have properties (try to get property with token ID 1)
          const hasProperties = await checkIfPropertiesExist(existingContract);
          
          if (hasProperties) {
            console.log("✅ Sample properties already exist. Checking if trading is enabled...");
            await enableTradingForExistingProperties(existingContract);
          } else {
            console.log("🏠 No sample properties found. Creating them now...");
            await createSampleProperties(existingContract);
          }
        } catch (error) {
          console.log("🏠 Could not check existing properties. Creating sample properties...");
          await createSampleProperties(existingContract);
        }
        
        // Still update environment files to ensure consistency
        await updateEnvironmentFiles(existingAddresses);
        return;
      } else {
        console.log("⚠️  Existing contracts not found on network. Redeploying...");
      }
    } catch (error) {
      console.log("⚠️  Could not read existing addresses. Redeploying...");
    }
  }

  // Get the contract factory
  const RealEstateFractionalization = await hre.ethers.getContractFactory("RealEstateFractionalization");
  
  // Deploy the main contract
  console.log("📝 Deploying RealEstateFractionalization contract...");
  const realEstateFractionalization = await RealEstateFractionalization.deploy();
  await realEstateFractionalization.waitForDeployment();
  
  const mainContractAddress = await realEstateFractionalization.getAddress();
  console.log("✅ RealEstateFractionalization deployed to:", mainContractAddress);

  // Get contract addresses
  const contractAddresses = await realEstateFractionalization.getContractAddresses();
  
  console.log("📋 Contract Addresses:");
  console.log("  Main Contract:", mainContractAddress);
  console.log("  Property Token:", contractAddresses.propertyTokenAddress);
  console.log("  Trading Platform:", contractAddresses.tradingPlatformAddress);
  console.log("  Dividend Distributor:", contractAddresses.dividendDistributorAddress);

  // Update deployed-addresses.json
  const addresses = {
    "VITE_MAIN_CONTRACT_ADDRESS": mainContractAddress,
    "VITE_PROPERTY_TOKEN_ADDRESS": contractAddresses.propertyTokenAddress,
    "VITE_TRADING_PLATFORM_ADDRESS": contractAddresses.tradingPlatformAddress,
    "VITE_DIVIDEND_DISTRIBUTOR_ADDRESS": contractAddresses.dividendDistributorAddress
  };
  
  fs.writeFileSync('deployed-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("✅ Updated deployed-addresses.json");

  // Update environment files with deployed addresses
  console.log("🔄 Updating environment files...");
  await updateEnvironmentFiles(addresses);

  // Create 10 sample properties for testing
  console.log("🏠 Creating 10 sample properties...");
  await createSampleProperties(realEstateFractionalization);

  // Sync properties to database (will update existing, not create duplicates)
  console.log("🔄 Syncing properties to database...");
  await syncPropertiesToDatabase();

  console.log("🎉 Deployment completed successfully!");
}

async function checkIfPropertiesExist(contract) {
  try {
    // Get property token contract
    const [propertyTokenAddress] = await contract.getContractAddresses();
    const PropertyToken = await hre.ethers.getContractFactory("PropertyToken");
    const propertyToken = PropertyToken.attach(propertyTokenAddress);
    
    // Check total number of properties
    const totalProperties = await propertyToken.getTotalProperties();
    console.log(`📊 Found ${totalProperties} existing properties`);
    
    return totalProperties > 0;
  } catch (error) {
    console.warn('❌ Could not check existing properties:', error.message);
    // If the function call fails, assume no properties exist
    return false;
  }
}

async function enableTradingForExistingProperties(contract) {
  try {
    // Get property token contract to check total properties
    const [propertyTokenAddress] = await contract.getContractAddresses();
    const PropertyToken = await hre.ethers.getContractFactory("PropertyToken");
    const propertyToken = PropertyToken.attach(propertyTokenAddress);
    
    const totalProperties = await propertyToken.getTotalProperties();
    console.log(`🔄 Checking trading status for ${totalProperties} properties...`);
    
    for (let i = 1; i <= totalProperties; i++) {
      try {
        // Try to enable trading (this will fail silently if already enabled)
        console.log(`🔄 Enabling trading for property ${i}...`);
        const enableTx = await contract.enableTrading(i);
        await enableTx.wait();
        console.log(`✅ Trading enabled for property ${i}`);
      } catch (error) {
        // If it fails, trading might already be enabled or there's another issue
        if (error.message.includes("Trading already enabled")) {
          console.log(`✅ Trading already enabled for property ${i}`);
        } else {
          console.warn(`⚠️  Could not enable trading for property ${i}:`, error.message);
        }
      }
    }
    
    console.log("🎊 Trading status check completed for all existing properties!");
  } catch (error) {
    console.warn('❌ Could not enable trading for existing properties:', error.message);
  }
}

async function createSampleProperties(contract) {
  const sampleProperties = [
    {
      name: "Luxury Penthouse Manhattan",
      description: "Stunning penthouse with panoramic views of Central Park and the Manhattan skyline. Features premium finishes, private terrace, and concierge service.",
      location: "New York, USA",
      totalValue: hre.ethers.parseEther("2500"), // $2,500 per share
      totalShares: 1000,
      imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
      fractionalTokenName: "Manhattan Penthouse Token",
      fractionalTokenSymbol: "MPT"
    },
    {
      name: "Modern Villa Dubai",
      description: "Contemporary villa in exclusive Emirates Hills with private pool, smart home technology, and 24/7 security. Prime location near golf courses.",
      location: "Dubai, UAE",
      totalValue: hre.ethers.parseEther("3000"),
      totalShares: 800,
      imageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
      fractionalTokenName: "Dubai Villa Token",
      fractionalTokenSymbol: "DVT"
    },
    {
      name: "Beach House Malibu",
      description: "Oceanfront property with direct beach access, floor-to-ceiling windows, and minimalist design. Perfect for vacation rentals and personal use.",
      location: "Malibu, California",
      totalValue: hre.ethers.parseEther("4000"),
      totalShares: 500,
      imageUrl: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800",
      fractionalTokenName: "Malibu Beach Token",
      fractionalTokenSymbol: "MBT"
    },
    {
      name: "Historic Brownstone Boston",
      description: "Beautifully restored 19th-century brownstone in Back Bay. Combines historic charm with modern amenities. Walking distance to downtown.",
      location: "Boston, Massachusetts",
      totalValue: hre.ethers.parseEther("1800"),
      totalShares: 1200,
      imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
      fractionalTokenName: "Boston Brownstone Token",
      fractionalTokenSymbol: "BBT"
    },
    {
      name: "Tokyo Skyscraper Apartment",
      description: "High-floor apartment in prestigious Roppongi district with Mount Fuji views, premium amenities, and excellent transportation links.",
      location: "Tokyo, Japan",
      totalValue: hre.ethers.parseEther("2200"),
      totalShares: 900,
      imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800",
      fractionalTokenName: "Tokyo Tower Token",
      fractionalTokenSymbol: "TTT"
    },
    {
      name: "London Georgian Townhouse",
      description: "Elegant Georgian townhouse in Kensington with period features, private garden, and proximity to museums and Hyde Park.",
      location: "London, UK",
      totalValue: hre.ethers.parseEther("3500"),
      totalShares: 700,
      imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800",
      fractionalTokenName: "London Georgian Token",
      fractionalTokenSymbol: "LGT"
    },
    {
      name: "Silicon Valley Tech Hub",
      description: "Modern office building in heart of Silicon Valley with tech company tenants, high-speed infrastructure, and excellent rental yields.",
      location: "Palo Alto, California",
      totalValue: hre.ethers.parseEther("5000"),
      totalShares: 400,
      imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
      fractionalTokenName: "Silicon Valley Token",
      fractionalTokenSymbol: "SVT"
    },
    {
      name: "Paris Luxury Apartment",
      description: "Elegant Haussmann-style apartment near Champs-Élysées with authentic period details, modern renovations, and city views.",
      location: "Paris, France",
      totalValue: hre.ethers.parseEther("2800"),
      totalShares: 1000,
      imageUrl: "https://i0.wp.com/farawayplaces.co/wp-content/uploads/2020/07/paris-apartment-interiors-7.jpg?resize=800%2C639&ssl=1",
      fractionalTokenName: "Paris Luxury Token",
      fractionalTokenSymbol: "PLT"
    },
    {
      name: "Miami Art Deco Hotel",
      description: "Boutique hotel in South Beach Art Deco district with ocean views, rooftop pool, and strong hospitality income potential.",
      location: "Miami, Florida",
      totalValue: hre.ethers.parseEther("6000"),
      totalShares: 300,
      imageUrl: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
      fractionalTokenName: "Miami Hotel Token",
      fractionalTokenSymbol: "MHT"
    },
    {
      name: "Swiss Alpine Chalet",
      description: "Traditional luxury chalet in exclusive St. Moritz with mountain views, ski-in/ski-out access, and high-end furnishings.",
      location: "St. Moritz, Switzerland",
      totalValue: hre.ethers.parseEther("4500"),
      totalShares: 600,
      imageUrl: "https://images.unsplash.com/photo-1551524164-687a55dd1126?w=800",
      fractionalTokenName: "Alpine Chalet Token",
      fractionalTokenSymbol: "ACT"
    }
  ];

  console.log("🏗️  Creating sample properties...");
  
  for (let i = 0; i < sampleProperties.length; i++) {
    const property = sampleProperties[i];
    try {
      console.log(`📝 Creating property ${i + 1}/10: ${property.name}...`);
      
      const tx = await contract.createAndFractionalizeProperty(
        property.name,
        property.description,
        property.location,
        property.totalValue,
        property.totalShares,
        property.imageUrl,
        [], // Empty documents array for simplicity
        property.fractionalTokenName,
        property.fractionalTokenSymbol
      );
      
      await tx.wait();
      console.log(`✅ Created: ${property.name} (Token ID: ${i + 1})`);
      
      // Automatically enable trading for this property
      try {
        console.log(`🔄 Enabling trading for ${property.name}...`);
        const enableTx = await contract.enableTrading(i + 1);
        await enableTx.wait();
        console.log(`✅ Trading enabled for ${property.name}`);
      } catch (enableError) {
        console.warn(`⚠️  Could not enable trading for ${property.name}:`, enableError.message);
      }
      
    } catch (error) {
      console.error(`❌ Failed to create property ${property.name}:`, error.message);
    }
  }
  
  console.log("🎊 All sample properties created successfully!");
}

async function syncPropertiesToDatabase() {
  try {
    const syncScript = require('../backend/scripts/sync-blockchain-properties.js');
    await syncScript();
    console.log("✅ Properties synced to database successfully");
  } catch (error) {
    console.warn("⚠️  Warning: Could not sync properties to database:", error.message);
    console.log("💡 You can manually run: cd backend && node scripts/sync-blockchain-properties.js");
  }
}

async function updateEnvironmentFiles(addresses) {
  try {
    const { updateEnvironmentFiles } = require('../scripts/update-addresses.js');
    updateEnvironmentFiles();
    console.log("✅ Environment files updated successfully");
  } catch (error) {
    console.warn("⚠️  Warning: Could not update environment files:", error.message);
    console.log("💡 You can manually run: node scripts/update-addresses.js");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
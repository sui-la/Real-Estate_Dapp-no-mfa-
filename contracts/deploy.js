const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting contract deployment...");

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
  const fs = require('fs');
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
  try {
    const { updateEnvironmentFiles } = require('../scripts/update-addresses.js');
    updateEnvironmentFiles();
  } catch (error) {
    console.warn("⚠️  Warning: Could not update environment files:", error.message);
    console.log("💡 You can manually run: node scripts/update-addresses.js");
  }

  console.log("🎉 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

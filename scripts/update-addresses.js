const fs = require('fs');
const path = require('path');

/**
 * Script to update environment files with deployed contract addresses
 * This script reads the deployed-addresses.json file and updates the necessary .env files
 */

function updateEnvironmentFiles() {
  console.log('🔄 Updating environment files with deployed addresses...');
  
  try {
    // Read the deployed addresses
    const addressesPath = path.join(__dirname, '..', 'contracts', 'deployed-addresses.json');
    
    if (!fs.existsSync(addressesPath)) {
      console.error('❌ deployed-addresses.json not found. Please run deployment first.');
      process.exit(1);
    }
    
    const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
    console.log('📋 Found deployed addresses:', addresses);
    
    // Update frontend .env files
    updateFrontendEnv(addresses);
    
    // Update backend .env file
    updateBackendEnv(addresses);
    
    // Update Web3Context.jsx fallback addresses
    updateWeb3Context(addresses);
    
    console.log('✅ Environment files updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating environment files:', error.message);
    process.exit(1);
  }
}

function updateFrontendEnv(addresses) {
  const frontendEnvPath = path.resolve(__dirname, '..', 'frontend', '.env');
  const frontendEnvLocalPath = path.resolve(__dirname, '..', 'frontend', '.env.local');
  const frontendEnvExamplePath = path.resolve(__dirname, '..', 'frontend', 'env.example');
  
  console.log('📝 Updating frontend environment files...');
  
  // Function to update a single env file
  const updateEnvFile = (filePath, fileName) => {
    let envContent = '';
    
    // If file exists, read it; otherwise create from template
    if (fs.existsSync(filePath)) {
      envContent = fs.readFileSync(filePath, 'utf8');
      console.log(`📄 Updating existing ${fileName}...`);
    } else {
      // Read from example file if it exists
      if (fs.existsSync(frontendEnvExamplePath)) {
        envContent = fs.readFileSync(frontendEnvExamplePath, 'utf8');
      } else {
        // Create basic template if example doesn't exist
        envContent = `# Frontend Environment Configuration

# Contract Addresses
VITE_MAIN_CONTRACT_ADDRESS=
VITE_PROPERTY_TOKEN_ADDRESS=
VITE_TRADING_PLATFORM_ADDRESS=
VITE_DIVIDEND_DISTRIBUTOR_ADDRESS=

# Admin Configuration
VITE_ADMIN_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# Network Configuration
VITE_CHAIN_ID=31337
VITE_NETWORK_NAME=Hardhat
VITE_RPC_URL=http://localhost:8545

# API Configuration
VITE_API_URL=http://localhost:5000/api

# Feature Flags
VITE_ENABLE_TESTING=true
VITE_ENABLE_ANALYTICS=false
`;
      }
      console.log(`📄 Creating new ${fileName}...`);
    }
    
    // Update contract addresses
    envContent = envContent.replace(
      /VITE_MAIN_CONTRACT_ADDRESS=.*/,
      `VITE_MAIN_CONTRACT_ADDRESS=${addresses.VITE_MAIN_CONTRACT_ADDRESS}`
    );
    envContent = envContent.replace(
      /VITE_PROPERTY_TOKEN_ADDRESS=.*/,
      `VITE_PROPERTY_TOKEN_ADDRESS=${addresses.VITE_PROPERTY_TOKEN_ADDRESS}`
    );
    envContent = envContent.replace(
      /VITE_TRADING_PLATFORM_ADDRESS=.*/,
      `VITE_TRADING_PLATFORM_ADDRESS=${addresses.VITE_TRADING_PLATFORM_ADDRESS}`
    );
    envContent = envContent.replace(
      /VITE_DIVIDEND_DISTRIBUTOR_ADDRESS=.*/,
      `VITE_DIVIDEND_DISTRIBUTOR_ADDRESS=${addresses.VITE_DIVIDEND_DISTRIBUTOR_ADDRESS}`
    );
    
    // Write the updated file
    fs.writeFileSync(filePath, envContent);
    console.log(`✅ ${fileName} updated`);
  };
  
  // Update both .env and .env.local files
  updateEnvFile(frontendEnvPath, '.env');
  updateEnvFile(frontendEnvLocalPath, '.env.local');
}

function updateBackendEnv(addresses) {
  const backendEnvPath = path.resolve(__dirname, '..', 'backend', '.env');
  const backendEnvExamplePath = path.resolve(__dirname, '..', 'backend', '.env.example');
  
  console.log('📝 Updating backend environment file...');
  
  let envContent = '';
  
  // If backend .env exists, read it; otherwise create from template
  if (fs.existsSync(backendEnvPath)) {
    envContent = fs.readFileSync(backendEnvPath, 'utf8');
    console.log('📄 Updating existing backend .env...');
  } else {
    // Read from example file if it exists
    if (fs.existsSync(backendEnvExamplePath)) {
      envContent = fs.readFileSync(backendEnvExamplePath, 'utf8');
    } else {
      // Create basic template if example doesn't exist
      envContent = `# Backend Environment Configuration

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/real-estate-dapp

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Contract Addresses
MAIN_CONTRACT_ADDRESS=
PROPERTY_TOKEN_ADDRESS=
TRADING_PLATFORM_ADDRESS=
DIVIDEND_DISTRIBUTOR_ADDRESS=

# Network Configuration
CHAIN_ID=31337
NETWORK_NAME=Hardhat
RPC_URL=http://localhost:8545

# Server Configuration
PORT=5000
NODE_ENV=development

# Admin Configuration
ADMIN_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
`;
    }
    console.log('📄 Creating new backend .env...');
  }
  
  // Update only CONTRACT_ADDRESS
  envContent = envContent.replace(
    /CONTRACT_ADDRESS=.*/,
    `CONTRACT_ADDRESS=${addresses.VITE_MAIN_CONTRACT_ADDRESS}`
  );
  
  // Add CONTRACT_ADDRESS if it doesn't exist
  if (!envContent.includes('CONTRACT_ADDRESS=')) {
    envContent += `\n# Blockchain Configuration\nCONTRACT_ADDRESS=${addresses.VITE_MAIN_CONTRACT_ADDRESS}\n`;
  }
  
  // Write the updated file
  fs.writeFileSync(backendEnvPath, envContent);
  console.log('✅ Backend .env updated');
}

function updateWeb3Context(addresses) {
  const web3ContextPath = path.resolve(__dirname, '..', 'frontend', 'src', 'contexts', 'Web3Context.jsx');
  
  console.log('📝 Updating Web3Context.jsx fallback addresses...');
  
  if (!fs.existsSync(web3ContextPath)) {
    console.warn('⚠️  Web3Context.jsx not found, skipping...');
    return;
  }
  
  let contextContent = fs.readFileSync(web3ContextPath, 'utf8');
  
  // Update fallback addresses in Web3Context.jsx
  contextContent = contextContent.replace(
    /RealEstateFractionalization: import\.meta\.env\.VITE_MAIN_CONTRACT_ADDRESS \|\| "[^"]*"/,
    `RealEstateFractionalization: import.meta.env.VITE_MAIN_CONTRACT_ADDRESS || "${addresses.VITE_MAIN_CONTRACT_ADDRESS}"`
  );
  
  contextContent = contextContent.replace(
    /PropertyToken: import\.meta\.env\.VITE_PROPERTY_TOKEN_ADDRESS \|\| "[^"]*"/,
    `PropertyToken: import.meta.env.VITE_PROPERTY_TOKEN_ADDRESS || "${addresses.VITE_PROPERTY_TOKEN_ADDRESS}"`
  );
  
  contextContent = contextContent.replace(
    /TradingPlatform: import\.meta\.env\.VITE_TRADING_PLATFORM_ADDRESS \|\| "[^"]*"/,
    `TradingPlatform: import.meta.env.VITE_TRADING_PLATFORM_ADDRESS || "${addresses.VITE_TRADING_PLATFORM_ADDRESS}"`
  );
  
  contextContent = contextContent.replace(
    /DividendDistributor: import\.meta\.env\.VITE_DIVIDEND_DISTRIBUTOR_ADDRESS \|\| "[^"]*"/,
    `DividendDistributor: import.meta.env.VITE_DIVIDEND_DISTRIBUTOR_ADDRESS || "${addresses.VITE_DIVIDEND_DISTRIBUTOR_ADDRESS}"`
  );
  
  // Write the updated file
  fs.writeFileSync(web3ContextPath, contextContent);
  console.log('✅ Web3Context.jsx fallback addresses updated');
}

// Run the script if called directly
if (require.main === module) {
  updateEnvironmentFiles();
}

module.exports = { updateEnvironmentFiles };

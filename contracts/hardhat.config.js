require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      // Customize test accounts (optional)
      accounts: {
        count: 20, // Number of test accounts
        initialIndex: 0, // Starting index
        mnemonic: "test test test test test test test test test test test junk", // Default mnemonic
        path: "m/44'/60'/0'/0", // Derivation path
        accountsBalance: "1000000000000000000000000000", // 1,000,000 ETH per account
      },
      // Use deterministic addresses for consistent deployments
      deterministicDeployment: true,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

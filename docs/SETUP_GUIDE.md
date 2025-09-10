# Real Estate Fractionalization dApp - Setup Guide

This comprehensive guide will help you set up and run the Real Estate Fractionalization dApp on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Git**
- **MongoDB** (local installation or MongoDB Atlas)
- **MetaMask** browser extension
- **Hardhat** (for smart contract development)

## Project Overview

This dApp consists of three main components:

1. **Smart Contracts** (`/contracts`) - Solidity contracts for property tokenization
2. **Frontend** (`/frontend`) - React application with Web3 integration
3. **Backend** (`/backend`) - Node.js API server with MongoDB

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd Real_Estate_Dapp

# Install root dependencies
npm install

# Install all project dependencies
npm run install:all
```

### 2. Environment Setup

#### Backend Environment
```bash
cd backend
cp env.example .env
```

Edit the `.env` file with your configuration:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/real-estate-fractionalization
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ETHEREUM_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

#### Frontend Environment
```bash
cd frontend
cp .env.example .env.local
```

Edit the `.env.local` file:
```env
REACT_APP_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
REACT_APP_PROPERTY_TOKEN_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
REACT_APP_ADMIN_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### 3. Database Setup

#### Option A: Local MongoDB
```bash
# Start MongoDB service
sudo systemctl start mongod

# Or on macOS with Homebrew
brew services start mongodb-community
```

#### Option B: MongoDB Atlas
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string and update `MONGODB_URI` in `.env`

### 4. Smart Contract Deployment

```bash
cd contracts

# Compile contracts
npm run compile

# Start local Hardhat network
npx hardhat node

# In a new terminal, deploy contracts
npm run deploy:local
```

**Important**: Copy the deployed contract addresses and update your frontend `.env.local` file.

### 5. Start the Application

#### Development Mode (All Services)
```bash
# From the root directory
npm run dev
```

This will start:
- Frontend on http://localhost:3000
- Backend on http://localhost:5000
- Hardhat node on http://localhost:8545

#### Individual Services
```bash
# Backend only
cd backend
npm run dev

# Frontend only
cd frontend
npm run dev

# Smart contracts only
cd contracts
npx hardhat node
```

## Detailed Setup Instructions

### Smart Contracts Setup

1. **Install Hardhat**
```bash
cd contracts
npm install
```

2. **Configure Hardhat**
The `hardhat.config.js` is already configured for local development. For production deployment:

```javascript
// Add your network configuration
networks: {
  sepolia: {
    url: process.env.SEPOLIA_URL,
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

3. **Deploy Contracts**
```bash
# Local deployment
npx hardhat run scripts/deploy.js --network localhost

# Testnet deployment
npx hardhat run scripts/deploy.js --network sepolia
```

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Configure Web3**
The Web3 integration is handled through the `Web3Context.jsx` file. Make sure your contract addresses are correct.

3. **MetaMask Configuration**
- Install MetaMask browser extension
- Add localhost:8545 as a custom network
- Import test accounts from Hardhat (check terminal output)

### Backend Setup

1. **Install Dependencies**
```bash
cd backend
npm install
```

2. **Database Models**
The following models are included:
- `User` - User accounts and profiles
- `Property` - Property information
- `Transaction` - Transaction history
- `Dividend` - Dividend distributions

3. **API Endpoints**
- `/api/auth` - Authentication routes
- `/api/properties` - Property management
- `/api/users` - User management
- `/api/transactions` - Transaction history
- `/api/dividends` - Dividend management

## Usage Guide

### For Users

1. **Connect Wallet**
   - Click "Connect Wallet" button
   - Approve MetaMask connection
   - Switch to localhost network if needed

2. **Browse Properties**
   - View available properties on the Properties page
   - Click "View Details" to see property information

3. **Purchase Shares**
   - Select number of shares to buy
   - Confirm transaction in MetaMask
   - View your portfolio

4. **Trade Shares**
   - Create buy/sell orders on the Trading page
   - Fill existing orders
   - Monitor your transactions

5. **Claim Dividends**
   - Check the Dividends page for available dividends
   - Claim individual or batch dividends
   - View dividend history

### For Administrators

1. **Access Admin Panel**
   - Connect with admin wallet address
   - Navigate to Admin page

2. **Create Properties**
   - Fill out property creation form
   - Deploy fractional tokens
   - Enable trading

3. **Distribute Dividends**
   - Select property
   - Enter dividend amount and description
   - Distribute to shareholders

## Testing

### Smart Contract Tests
```bash
cd contracts
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Backend Tests
```bash
cd backend
npm test
```

## Troubleshooting

### Common Issues

1. **MetaMask Connection Issues**
   - Ensure MetaMask is installed and unlocked
   - Check network configuration
   - Clear browser cache

2. **Contract Deployment Issues**
   - Verify Hardhat node is running
   - Check contract compilation
   - Ensure sufficient ETH balance

3. **Database Connection Issues**
   - Verify MongoDB is running
   - Check connection string
   - Ensure database exists

4. **Frontend Build Issues**
   - Clear node_modules and reinstall
   - Check environment variables
   - Verify contract addresses

### Error Messages

- **"Contract not initialized"**: Check contract addresses in environment files
- **"Insufficient funds"**: Add ETH to your test account
- **"User already exists"**: Clear database or use different wallet
- **"Admin access required"**: Use admin wallet address

## Production Deployment

### Smart Contracts
1. Deploy to testnet (Sepolia)
2. Verify contracts on Etherscan
3. Update contract addresses

### Frontend
1. Build production bundle
2. Deploy to Vercel/Netlify
3. Configure environment variables

### Backend
1. Set up production database
2. Deploy to Heroku/AWS
3. Configure production environment

## Security Considerations

1. **Private Keys**: Never commit private keys to version control
2. **JWT Secrets**: Use strong, unique JWT secrets
3. **Database**: Use connection strings with authentication
4. **Rate Limiting**: Configure appropriate rate limits
5. **CORS**: Configure CORS for production domains

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the code comments

## Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-chain support
- [ ] Automated dividend distribution
- [ ] Property valuation integration
- [ ] Insurance integration
- [ ] Legal compliance features

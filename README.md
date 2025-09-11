# Real Estate Fractionalization dApp

A comprehensive decentralized application that enables fractional ownership of real estate properties on the Ethereum blockchain. This dApp allows investors to purchase, trade, and earn dividends from fractional shares of premium real estate properties.

## 🎉 Latest Updates (v2.0)

- ✅ **Deterministic Deployment**: Fixed contract addresses that never change
- ✅ **BigInt Compatibility**: Resolved all BigInt conversion errors
- ✅ **Trading Status Management**: Added trading enable/disable functionality
- ✅ **Robust Error Handling**: Comprehensive error handling and user feedback
- ✅ **One-Click Setup**: Automated setup script for easy deployment
- ✅ **Windows Compatibility**: Full Windows support with batch scripts

## 🏠 Features

### Core Functionality
- **Property Tokenization**: Convert real estate properties into tradeable ERC-721 NFTs
- **Fractional Ownership**: Purchase fractional shares represented as ERC-20 tokens
- **Trading Platform**: Decentralized order book for buying/selling fractional shares
- **Dividend Distribution**: Automated distribution of rental income and property appreciation
- **User Authentication**: Secure wallet-based authentication with JWT support
- **Transaction History**: Complete blockchain transaction tracking
- **Portfolio Management**: Real-time portfolio tracking and analytics

### Advanced Features
- **Admin Dashboard**: Property creation and management tools
- **Real-time Trading**: Live order book with instant execution
- **Dividend Claims**: Batch dividend claiming functionality
- **Property Analytics**: Detailed property performance metrics
- **Responsive Design**: Mobile-first responsive UI/UX

## 🏗️ Project Structure

```
Real_Estate_Dapp/
├── contracts/              # Solidity smart contracts
│   ├── contracts/          # Contract source files
│   ├── scripts/           # Deployment scripts
│   ├── test/              # Contract tests
│   └── hardhat.config.js  # Hardhat configuration
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   └── App.jsx        # Main app component
│   └── package.json       # Frontend dependencies
├── backend/               # Node.js backend API
│   ├── routes/           # API routes
│   ├── models/           # Database models
│   ├── middleware/       # Express middleware
│   └── server.js        # Main server file
├── docs/                 # Documentation
│   ├── SETUP_GUIDE.md    # Comprehensive setup guide
│   └── TECHNICAL_DOCUMENTATION.md
└── README.md             # This file
```

## 🛠️ Technology Stack

### Blockchain & Smart Contracts
- **Ethereum**: Main blockchain network
- **Solidity ^0.8.20**: Smart contract language (latest version)
- **Hardhat**: Development framework
- **OpenZeppelin v5.4.0**: Secure contract libraries (latest version)
- **Web3.js**: Blockchain interaction

### Frontend
- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Headless UI**: Accessible components
- **React Hot Toast**: Notifications

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB ODM
- **JWT**: Authentication tokens
- **bcryptjs**: Password hashing

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- MetaMask browser extension
- Git

### 🎯 One-Click Setup (Recommended)

**For Windows users:**
```bash
# Clone and setup everything automatically
git clone <repository-url>
cd Real_Estate_Dapp
npm run start:windows
```

**For Unix/Linux/Mac users:**
```bash
# Clone and setup everything automatically
git clone <repository-url>
cd Real_Estate_Dapp
npm run start:unix
```

**Cross-platform (Node.js):**
```bash
# Clone and setup everything automatically
git clone <repository-url>
cd Real_Estate_Dapp
npm run start
```

This script will:
- ✅ Deploy contracts with **consistent addresses** (automatically managed!)
- ✅ Start Hardhat node
- ✅ Set up frontend environment automatically
- ✅ Start development servers
- ✅ Handle all address management automatically

### Manual Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Real_Estate_Dapp
```

2. **Install dependencies**
```bash
# Install all dependencies
npm run install:all
```

3. **Deploy contracts (with fixed addresses)**
```bash
cd contracts
npx hardhat run deploy.js --network hardhat
```

4. **Set up environment variables**
```bash
# Frontend (automatically configured)
cd frontend
copy env.example .env.local

# Backend
cd backend
copy env.example .env
# Edit .env with your MongoDB connection
```

5. **Start the application**
```bash
# Terminal 1: Start Hardhat node
cd contracts
npx hardhat node

# Terminal 2: Start backend
cd backend
npm run dev

# Terminal 3: Start frontend
cd frontend
npm run dev
```

**Access Points:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5001
- Hardhat: http://localhost:8545

### 🎯 Fixed Contract Addresses (Never Change!)

The dApp now uses **deterministic deployment** with fixed addresses that never change:

```env
# These addresses are PERMANENT and will NEVER change!
VITE_MAIN_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_PROPERTY_TOKEN_ADDRESS=0xa16E02E87b7454126E5E10d957A927A7F5B5d2be
VITE_TRADING_PLATFORM_ADDRESS=0xB7A5bd0345EF1Cc5E66bf61BdeC17D2461fBd968
VITE_DIVIDEND_DISTRIBUTOR_ADDRESS=0xeEBe00Ac0756308ac4AaBfD76c05c4F3088B8883
```

**Benefits:**
- ✅ **No more address changes** - Same addresses every time
- ✅ **Easy setup** - No need to update environment files
- ✅ **Reliable deployment** - Deterministic and predictable

## ✅ Current Status

**🎉 PROJECT IS FULLY FUNCTIONAL AND DEPLOYED!**

### 🚀 What's Working
- ✅ **Smart Contracts**: All contracts deployed and functional
- ✅ **Frontend**: Complete React application with Web3 integration
- ✅ **Backend**: Full API with MongoDB integration
- ✅ **Trading**: Share purchase/sale functionality working
- ✅ **Property Management**: Admin can create and manage properties
- ✅ **User Authentication**: Wallet-based authentication system
- ✅ **Portfolio Tracking**: Real-time portfolio management

### 🔧 Recent Major Fixes
- ✅ **BigInt Compatibility**: Fixed all BigInt conversion errors in frontend
- ✅ **Trading Status Management**: Added enable/disable trading functionality
- ✅ **Deterministic Deployment**: Contract addresses never change anymore
- ✅ **Error Handling**: Comprehensive error handling and user feedback
- ✅ **Environment Setup**: Automated environment configuration
- ✅ **Windows Support**: Full Windows compatibility with batch scripts
- ✅ **OpenZeppelin v5**: Updated to latest OpenZeppelin version
- ✅ **Solidity ^0.8.20**: Latest Solidity version compatibility

## 📋 Smart Contracts

### Contract Architecture

1. **PropertyToken.sol** (ERC-721)
   - Represents individual properties as NFTs
   - Stores property metadata and information
   - Manages property lifecycle

2. **FractionalToken.sol** (ERC-20)
   - Represents fractional ownership shares
   - Handles share transfers and trading
   - Manages dividend distribution

3. **TradingPlatform.sol**
   - Order book system for trading shares
   - Supports buy/sell orders with expiration
   - Automatic order matching and execution

4. **DividendDistributor.sol**
   - Automated dividend distribution
   - Proportional distribution to shareholders
   - Claim tracking and management

5. **RealEstateFractionalization.sol**
   - Main orchestrator contract
   - Coordinates all operations
   - Provides unified interface

### Key Features
- **Gas Optimized**: Efficient contract design
- **Secure**: OpenZeppelin security patterns
- **Upgradeable**: Proxy pattern support
- **Event Logging**: Comprehensive event system

## 🎨 Frontend Features

### Pages & Components
- **Home**: Landing page with features overview
- **Properties**: Property listing with search/filter
- **Property Detail**: Detailed property view with investment options
- **Portfolio**: User's investment portfolio
- **Trading**: Trading platform with order book
- **Dividends**: Dividend management and claiming
- **Profile**: User profile management
- **Admin**: Administrative dashboard

### Web3 Integration
- **Wallet Connection**: MetaMask integration
- **Contract Interaction**: Direct smart contract calls
- **Transaction Management**: Transaction status tracking
- **Error Handling**: User-friendly error messages

## 🔧 Backend API

### Endpoints
- **Authentication**: `/api/auth/*` - User registration, login, profile
- **Properties**: `/api/properties/*` - Property CRUD operations
- **Users**: `/api/users/*` - User management and portfolio
- **Transactions**: `/api/transactions/*` - Transaction history
- **Dividends**: `/api/dividends/*` - Dividend management

### Database Models
- **User**: User accounts and profiles
- **Property**: Property information and metadata
- **Transaction**: Blockchain transaction records
- **Dividend**: Dividend distribution records

## 📚 Documentation

- **[Setup Guide](docs/SETUP_GUIDE.md)**: Comprehensive setup instructions
- **[Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md)**: Detailed technical specifications

## 🧪 Testing

### Smart Contracts
```bash
cd contracts
npm test
```

### Frontend
```bash
cd frontend
npm test
```

### Backend
```bash
cd backend
npm test
```

## 🚀 Deployment

### 🎯 One-Click Deployment (Recommended)

**Windows Users:**
```bash
# Complete automated setup
setup-fixed.bat
```

**What this does:**
- ✅ Deploys contracts with **fixed addresses**
- ✅ Creates sample property with 1000 shares
- ✅ Enables trading automatically
- ✅ Sets up frontend environment
- ✅ Starts all development servers

### Manual Deployment

#### Smart Contracts
1. **Deploy with fixed addresses**
```bash
cd contracts
npx hardhat run scripts/deploy-fixed.js --network hardhat
```

2. **Deploy to localhost (for frontend connection)**
```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Terminal 2: Deploy to localhost
npx hardhat run scripts/deploy-fixed.js --network localhost
```

3. **Deploy to testnet (Sepolia)**
```bash
npm run deploy:sepolia
```

#### Frontend
1. **Build production bundle**
```bash
cd frontend
npm run build
```

2. **Deploy to Vercel/Netlify**
3. **Configure environment variables** (addresses are fixed!)

#### Backend
1. **Set up production database**
2. **Deploy to Heroku/AWS**
3. **Configure production environment**

## 🔒 Security

- **Smart Contract Security**: OpenZeppelin security patterns
- **Authentication**: JWT with secure secrets
- **Input Validation**: Comprehensive input validation
- **Rate Limiting**: API rate limiting
- **CORS**: Properly configured CORS policies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support & Troubleshooting

### ✅ Common Issues (All Fixed!)

#### Contract Issues
- ✅ **OpenZeppelin Compatibility**: Updated to v5.4.0
- ✅ **Solidity Version**: Using ^0.8.20
- ✅ **Deprecated Functions**: Replaced `Counters.sol` and `_exists()`
- ✅ **Address Changes**: Fixed with deterministic deployment

#### Frontend Issues
- ✅ **BigInt Errors**: All BigInt conversion issues resolved
- ✅ **Trading Disabled**: Added trading status management
- ✅ **Environment Variables**: Automated setup
- ✅ **Wallet Connection**: Improved error handling

#### Deployment Issues
- ✅ **One-Click Setup**: Automated deployment script
- ✅ **Windows Compatibility**: Full Windows support
- ✅ **Environment Setup**: Automatic configuration

### 🚀 Quick Fixes

#### If Properties Show 0 Shares
```bash
# 1. Restart everything
setup-fixed.bat

# 2. Clear browser cache
Ctrl + F5

# 3. Check environment file
type frontend\.env.local
```

#### If Trading is Disabled
```bash
# Enable trading (as admin)
cd contracts
npx hardhat console --network localhost
# In console:
# const contract = await ethers.getContractAt("RealEstateFractionalization", "0x5FbDB2315678afecb367f032d93F642f64180aa3")
# await contract.enableTrading(1)
```

#### If Frontend Shows Errors
```bash
# 1. Restart frontend
cd frontend
npm run dev

# 2. Check console for specific errors
# 3. Verify contract addresses in .env.local
```

### Getting Help
- 📖 **Documentation**: Check `/docs` folder
- 🐛 **Issues**: Create GitHub issue with error details
- 💬 **Console**: Check browser console for detailed errors
- 🔧 **Scripts**: Use `setup-fixed.bat` for fresh start

## 🗺️ Roadmap

### Completed ✅
- [x] Core smart contract development
- [x] Frontend React application
- [x] Backend API development
- [x] Web3 integration
- [x] User authentication system
- [x] Property tokenization
- [x] Fractional ownership trading
- [x] Dividend distribution system
- [x] OpenZeppelin v5 compatibility
- [x] Windows deployment automation
- [x] **BigInt compatibility fixes**
- [x] **Deterministic deployment**
- [x] **Trading status management**
- [x] **Comprehensive error handling**
- [x] **One-click setup automation**

### In Progress 🚧
- [ ] Comprehensive testing suite
- [ ] Production deployment guides
- [ ] Performance optimization
- [ ] Mobile responsiveness improvements

### Planned 📋
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-chain support (Polygon, BSC)
- [ ] Automated dividend distribution
- [ ] Property valuation integration
- [ ] Insurance integration
- [ ] Legal compliance features
- [ ] Governance token implementation
- [ ] **Real-time notifications**
- [ ] **Advanced trading features**
- [ ] **Property marketplace**
- [ ] **NFT metadata standards**

---

**Built with ❤️ for the decentralized future of real estate investment**


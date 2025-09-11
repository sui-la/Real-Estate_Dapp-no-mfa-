# Real Estate DApp - Startup Manual

## 🚀 Quick Start (One Command)

```bash
# Clone and start everything automatically
git clone https://github.com/sui-la/Real-Estate_Dapp.git
cd Real_Estate_Dapp
npm run start
```

This will automatically:
- Install all dependencies
- Start Hardhat blockchain node
- **Deploy smart contracts** (runs `deploy.js` automatically)
- Update environment files with contract addresses
- Start backend server
- Start frontend
- Open the app in your browser

## 📋 Prerequisites

Before starting, make sure you have:
- **Node.js** (v16 or higher)
- **MongoDB** (running locally or connection string)
- **MetaMask** browser extension
- **Git**

## 🔧 Manual Setup (If needed)

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Setup Environment
```bash
# Backend - Copy and edit .env file
cd backend
copy env.example .env
# Edit .env with your MongoDB connection

# Frontend - Auto-configured
cd frontend
copy env.example .env.local
```

### 3. Deploy Contracts & Start Application
```bash
# Terminal 1: Start blockchain
cd contracts
npx hardhat node

# Terminal 2: Deploy contracts (in a new terminal)
cd contracts
npx hardhat run deploy.js --network localhost

# Terminal 3: Start backend
cd backend
npm run dev

# Terminal 4: Start frontend
cd frontend
npm run dev
```

**Note**: If you used `npm run start`, contracts are already deployed automatically!

## 🌐 Access Points

Once running, access:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **Blockchain**: http://localhost:8545

## ✅ Verification

You'll know it's working when:
- Frontend loads at localhost:3000
- You can connect MetaMask
- Properties are visible on the Properties page
- No console errors in browser

## 🛠️ Quick Fixes

**If something doesn't work:**
1. **Restart everything**: `npm run start`
2. **Clear browser cache**: Ctrl + F5
3. **Check MetaMask**: Make sure it's connected to localhost:8545
4. **Check console**: Press F12 for error messages

## 📞 Need Help?

- Check browser console (F12) for errors
- Verify all prerequisites are installed
- Try restarting with `npm run start`
- Check that ports 3000, 5001, and 8545 are available

---

**That's it! Your Real Estate DApp should be running! 🎉**

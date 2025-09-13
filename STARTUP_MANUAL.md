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
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (Community Edition) - [Setup guide below](#-mongodb-setup-required)
- **MetaMask** browser extension - [Install here](https://metamask.io/)
- **Git** - [Download here](https://git-scm.com/)

## 📦 MongoDB Setup (Required)

**IMPORTANT**: MongoDB must be running before starting the application!

### Windows (Recommended Method)
1. **Download**: Go to [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. **Install**: Run installer with default settings (installs as Windows service)
3. **Verify**: MongoDB starts automatically - no further action needed
4. **Connection**: Uses `mongodb://localhost:27017/real_estate_dapp`

### macOS (Using Homebrew)
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB (required every time)
brew services start mongodb-community

# Verify it's running
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```

### Linux (Ubuntu/Debian)
```bash
# Install MongoDB Community Edition
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify it's running
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```

### Alternative: MongoDB Atlas (Cloud)
If you prefer cloud database:
1. Create free account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create cluster and get connection string
3. Update `backend/.env` with: `MONGODB_URI=your-atlas-connection-string`

### ✅ Test MongoDB Connection
```bash
# Test if MongoDB is running
mongosh

# Should show: "Connecting to: mongodb://127.0.0.1:27017"
# Type "exit" to close
```

**If MongoDB connection fails**, the backend won't start properly!

## 🔧 Manual Setup (If needed)

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Setup Environment
```bash
# Backend - Copy and edit .env file
cd backend
copy env.example .env  # Windows
# cp env.example .env    # macOS/Linux

# Edit .env file with your MongoDB connection:
# MONGODB_URI=mongodb://localhost:27017/real_estate_dapp
# JWT_SECRET=your-super-secret-jwt-key-here
# PORT=5000

# Frontend - Auto-configured by deployment script
cd frontend
copy env.example .env.local  # Windows
# cp env.example .env.local    # macOS/Linux
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

## 🛠️ Troubleshooting & Quick Fixes

### 🚨 Common Issues & Solutions

#### **MongoDB Connection Errors**
**Symptoms**: Backend fails to start with "MongoNetworkError" or "ECONNREFUSED"
**Solutions**:
1. **Check if MongoDB is running**:
   ```bash
   # Windows: Check services
   services.msc  # Look for "MongoDB Server"
   
   # macOS: Check if running
   brew services list | grep mongodb
   
   # Linux: Check status
   sudo systemctl status mongod
   ```

2. **Start MongoDB**:
   ```bash
   # Windows: Should start automatically, if not:
   net start MongoDB
   
   # macOS:
   brew services start mongodb-community
   
   # Linux:
   sudo systemctl start mongod
   ```

3. **Test connection**:
   ```bash
   mongosh --eval "db.runCommand({ connectionStatus: 1 })"
   ```

#### **If `npm run start` shows `npx ENOENT` error:**

### **Alternative Manual Startup:**
```bash
# Terminal 1: Start Hardhat node
cd contracts
npx hardhat node

# Terminal 2: Deploy contracts (wait for Terminal 1 to show "Started HTTP and WebSocket JSON-RPC server")
cd contracts
npx hardhat run deploy.js --network localhost

# Terminal 3: Start backend (ONLY after MongoDB is running!)
cd backend
npm start

# Terminal 4: Start frontend
cd frontend
npm run dev
```

#### **Trading Button Issues**
**Symptoms**: Enable/Disable trading buttons show success but don't change status
**Solutions**:
1. **Check Hardhat node**: Make sure blockchain is running
2. **Restart contracts**: Redeploy with `npx hardhat run deploy.js --network localhost`
3. **Clear browser cache**: Ctrl + F5

#### **Wallet Connection Spam**
**Symptoms**: Endless "Wallet linked to your account!" messages
**Solutions**:
1. **Refresh page**: Hard refresh with Ctrl + F5
2. **Clear localStorage**: F12 → Application → Local Storage → Clear All
3. **Restart browser**: Close and reopen browser

#### **Comments Not Working**
**Symptoms**: Can't leave comments or "must own shares" message
**Solutions**:
1. **Buy shares first**: Only shareholders can comment
2. **Check wallet connection**: Ensure wallet is properly connected
3. **Verify shares**: Check your portfolio to confirm ownership

**Other common fixes:**
1. **Clear browser cache**: Ctrl + F5
2. **Check MetaMask**: Make sure it's connected to localhost:8545
3. **Check console**: Press F12 for error messages
4. **Kill all Node processes**: `taskkill /f /im node.exe` (Windows) then restart
5. **Check all prerequisites**: Ensure Node.js, MongoDB, MetaMask are all installed

## 📞 Need Help?

### Before Asking for Help:
1. **Check MongoDB**: Ensure it's running (`mongosh` should connect)
2. **Check browser console**: Press F12 for error messages
3. **Verify all prerequisites**: Node.js, MongoDB, MetaMask, Git are installed
4. **Try manual startup**: Use the manual startup commands above
5. **Clear everything**: Clear browser cache, restart terminals

### Quick Diagnostic Commands:
```bash
# Check if MongoDB is running
mongosh --eval "db.runCommand({ connectionStatus: 1 })"

# Check if ports are available
netstat -an | findstr ":3000"  # Frontend
netstat -an | findstr ":5000"  # Backend  
netstat -an | findstr ":8545"  # Blockchain

# Check Node.js version
node --version  # Should be v16 or higher
```

### Getting Support:
- **Check the README.md**: Comprehensive troubleshooting guide
- **Browser Console**: F12 → Console tab for detailed errors
- **MongoDB Issues**: [MongoDB Community Forums](https://community.mongodb.com/)
- **MetaMask Issues**: [MetaMask Support](https://metamask.zendesk.com/)

---

## 🎉 Success! 

Once everything is running, you should see:
- ✅ **Frontend**: http://localhost:3000 (Properties page loads)
- ✅ **Backend**: http://localhost:5000 (API responds)
- ✅ **MongoDB**: Connected and storing data
- ✅ **MetaMask**: Connected to localhost:8545
- ✅ **Properties**: Sample properties visible and tradeable

**Your Real Estate DApp is now ready for use! 🏠🚀**

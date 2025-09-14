**## 📋 Prerequisites**



Before starting, make sure you have:

\- \*\*Node.js\*\* (v16 or higher) - \[Download here](https://nodejs.org/)

\- \*\*MongoDB\*\* (Community Edition) - \[Setup guide below](#-mongodb-setup-required)

\- \*\*MetaMask\*\* browser extension - \[Install here](https://metamask.io/)

\- \*\*Git\*\* - \[Download here](https://git-scm.com/)



**## 📦 MongoDB Setup (Required)**



\*\*IMPORTANT\*\*: MongoDB must be running before starting the application!



**### Windows (Recommended Method)**

1\. \*\*Download\*\*: Go to \[mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)

2\. \*\*Install\*\*: Run installer with default settings (installs as Windows service)

3\. \*\*Verify\*\*: MongoDB starts automatically - no further action needed

4\. \*\*Connection\*\*: Uses `mongodb://localhost:27017/real\_estate\_dapp`





**## 🔧 Manual Setup** 



**### 1. Install Dependencies**

```bash

npm run install:all

```



**### 2. Setup Environment**

```bash

\# Backend - Copy and edit .env file

cd backend

copy env.example .env  # Windows

\# cp env.example .env    # macOS/Linux



\# Edit .env file with your MongoDB connection:

\# MONGODB\_URI=mongodb://localhost:27017/real\_estate\_dapp

\# JWT\_SECRET=your-super-secret-jwt-key-here

\# PORT=5000



\# Frontend - Auto-configured by deployment script

cd frontend

copy env.example .env.local  # Windows

\# cp env.example .env.local    # macOS/Linux

```



**### 3. Deploy Contracts \& Start Application**

```bash

\# Terminal 1: Start blockchain

cd contracts

npx hardhat node



**# Terminal 2: Deploy contracts (in a new terminal)**

cd contracts

npx hardhat run deploy.js --network localhost



**# Terminal 3: Start backend**

cd backend

npm run dev



**# Terminal 4: Start frontend**

cd frontend

npm run dev

```





**## 🌐 Access Points**



Once running, access:

\- \*\*Frontend\*\*: http://localhost:3000

\- \*\*Backend API\*\*: http://localhost:5001

\- \*\*Blockchain\*\*: http://localhost:8545



**## ✅ Verification**



You'll know it's working when:

\- Frontend loads at localhost:3000

\- You can connect MetaMask

\- Properties are visible on the Properties page

\- No console errors in browser


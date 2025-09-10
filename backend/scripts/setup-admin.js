const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const setupAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminAddress = process.env.ADMIN_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    console.log(`Setting up admin for address: ${adminAddress}`);

    // Find user with admin address
    const user = await User.findOne({ 
      walletAddress: adminAddress.toLowerCase() 
    });

    if (user) {
      if (user.isAdmin) {
        console.log('✅ User is already admin');
      } else {
        user.isAdmin = true;
        await user.save();
        console.log('✅ User has been set as admin');
      }
    } else {
      console.log('❌ No user found with admin address. Please login with the admin wallet first.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error setting up admin:', error);
    process.exit(1);
  }
};

setupAdmin();

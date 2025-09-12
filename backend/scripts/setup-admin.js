const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const setupAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminAddress = process.env.ADMIN_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const adminEmail = process.env.ADMIN_EMAIL; // New: support admin email
    
    console.log(`Setting up admin for:`);
    console.log(`- Wallet Address: ${adminAddress}`);
    if (adminEmail) console.log(`- Email: ${adminEmail}`);

    // Find user with admin address OR admin email
    const user = await User.findOne({ 
      $or: [
        { walletAddress: adminAddress.toLowerCase() },
        ...(adminEmail ? [{ email: adminEmail.toLowerCase() }] : [])
      ]
    });

    if (user) {
      if (user.isAdmin) {
        console.log('✅ User is already admin');
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Wallet: ${user.walletAddress}`);
      } else {
        user.isAdmin = true;
        await user.save();
        console.log('✅ User has been promoted to admin');
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Wallet: ${user.walletAddress}`);
      }
    } else {
      console.log('❌ No user found with admin credentials.');
      console.log('   Please register/login first with the admin email or wallet.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error setting up admin:', error);
    process.exit(1);
  }
};

setupAdmin();

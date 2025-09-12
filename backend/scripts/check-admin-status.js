const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const checkAdminStatus = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/real-estate-dapp');
    console.log('Connected to MongoDB');
    console.log('ADMIN_EMAIL from env:', process.env.ADMIN_EMAIL);
    console.log('ADMIN_ADDRESS from env:', process.env.ADMIN_ADDRESS);
    
    const users = await User.find({}).select('name email walletAddress isAdmin createdAt');
    console.log('\n📊 Current users in database:', users.length);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - Wallet: ${user.walletAddress.substring(0, 15)}... - Admin: ${user.isAdmin} - Created: ${user.createdAt}`);
    });
    
    // Check if admin email user exists
    const adminUser = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (adminUser) {
      console.log('\n🔍 Admin user found:', adminUser.name, '- isAdmin:', adminUser.isAdmin);
      
      if (!adminUser.isAdmin) {
        console.log('\n⚠️  Admin user found but isAdmin is false. Fixing this...');
        adminUser.isAdmin = true;
        await adminUser.save();
        console.log('✅ Admin status has been set to true');
      } else {
        console.log('✅ Admin status is already correct');
      }
    } else {
      console.log('\n❌ No user found with admin email:', process.env.ADMIN_EMAIL);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

checkAdminStatus();

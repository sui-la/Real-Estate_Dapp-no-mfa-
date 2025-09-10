const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return this.email && !this.email.includes('@wallet.local');
    }
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  profile: {
    phone: String,
    address: String,
    avatar: String,
    bio: String
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      dividends: { type: Boolean, default: true },
      trading: { type: Boolean, default: true }
    }
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes are automatically created by unique: true, no need for explicit indexes

module.exports = mongoose.model('User', userSchema);

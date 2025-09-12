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
    required: false, // Not required - allows empty strings
    default: "", // Default to empty string for new users
    lowercase: true,
    validate: {
      validator: function(v) {
        // Allow empty string, null, undefined, or valid Ethereum address
        return !v || v === "" || /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum address format'
    }
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

// No automatic unique index - we'll handle uniqueness in application logic

module.exports = mongoose.model('User', userSchema);

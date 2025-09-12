const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  type: {
    type: String,
    enum: ['BUY', 'SELL', 'DIVIDEND_RECEIVED', 'DIVIDEND_CLAIMED'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  shares: {
    type: Number,
    default: 0 // For buy/sell transactions
  },
  pricePerShare: {
    type: Number,
    default: 0 // For buy/sell transactions
  },
  transactionHash: {
    type: String,
    required: true
  },
  blockNumber: {
    type: Number,
    required: true
  },
  gasUsed: {
    type: Number,
    default: 0
  },
  gasFee: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'FAILED'],
    default: 'CONFIRMED'
  },
  fromAddress: {
    type: String,
    lowercase: true
  },
  toAddress: {
    type: String,
    lowercase: true
  },
  // For dividend transactions
  distributionId: {
    type: Number,
    default: null
  },
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ propertyId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ transactionHash: 1 }, { unique: true });

module.exports = mongoose.model('Transaction', transactionSchema);
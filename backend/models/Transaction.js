const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  type: {
    type: String,
    enum: ['buy', 'sell', 'dividend', 'transfer'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  shares: {
    type: Number,
    required: function() {
      return ['buy', 'sell', 'transfer'].includes(this.type);
    }
  },
  pricePerShare: {
    type: Number,
    required: function() {
      return ['buy', 'sell'].includes(this.type);
    }
  },
  totalValue: {
    type: Number,
    required: true
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true
  },
  blockNumber: {
    type: Number,
    required: true
  },
  gasUsed: {
    type: Number,
    required: true
  },
  gasPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },
  metadata: {
    orderId: String,
    dividendId: String,
    fromAddress: String,
    toAddress: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance (transactionHash index is automatic due to unique: true)
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ property: 1, createdAt: -1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);

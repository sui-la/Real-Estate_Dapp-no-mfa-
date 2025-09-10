const mongoose = require('mongoose');

const dividendSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  dividendId: {
    type: Number,
    required: true,
    unique: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  distributedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    enum: ['rental', 'appreciation', 'sale', 'other'],
    default: 'rental'
  },
  distributedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  distributionDate: {
    type: Date,
    default: Date.now
  },
  claims: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: Number,
    claimedAt: {
      type: Date,
      default: Date.now
    },
    transactionHash: String
  }]
}, {
  timestamps: true
});

// Indexes for better query performance (dividendId index is automatic due to unique: true)
dividendSchema.index({ property: 1 });
dividendSchema.index({ isActive: 1 });
dividendSchema.index({ distributionDate: -1 });

// Virtual for remaining amount
dividendSchema.virtual('remainingAmount').get(function() {
  return this.totalAmount - this.distributedAmount;
});

module.exports = mongoose.model('Dividend', dividendSchema);

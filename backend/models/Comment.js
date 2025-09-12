const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  propertyId: {
    type: Number,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  walletAddress: {
    type: String,
    required: true,
    lowercase: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  sharesOwned: {
    type: Number,
    required: true,
    min: 0
  },
  isVerifiedInvestor: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
commentSchema.index({ propertyId: 1, createdAt: -1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ walletAddress: 1 });

// Virtual for user details
commentSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Comment', commentSchema);

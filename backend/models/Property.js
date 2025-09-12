const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  tokenId: {
    type: Number,
    required: false,
    sparse: true,
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  totalValue: {
    type: Number,
    required: true,
    min: 0
  },
  totalShares: {
    type: Number,
    required: true,
    min: 1
  },
  sharesSold: {
    type: Number,
    default: 0,
    min: 0
  },
  originalOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fractionalTokenAddress: {
    type: String,
    required: false,
    default: null
  },
  isFractionalized: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  documents: [{
    type: String
  }],
  metadata: {
    propertyType: {
      type: String,
      enum: ['residential', 'commercial', 'industrial', 'land'],
      default: 'residential'
    },
    bedrooms: Number,
    bathrooms: Number,
    squareFootage: Number,
    yearBuilt: Number,
    amenities: [String]
  },
  analytics: {
    views: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    sharesTraded: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes for better query performance (tokenId index is automatic due to unique: true)
propertySchema.index({ isActive: 1 });
propertySchema.index({ originalOwner: 1 });
propertySchema.index({ name: 'text', description: 'text', location: 'text' });

// Virtual for share price
propertySchema.virtual('sharePrice').get(function() {
  return this.totalValue / this.totalShares;
});

// Virtual for percentage sold
propertySchema.virtual('percentageSold').get(function() {
  return (this.sharesSold / this.totalShares) * 100;
});

// Virtual for shares available
propertySchema.virtual('sharesAvailable').get(function() {
  return this.totalShares - this.sharesSold;
});

module.exports = mongoose.model('Property', propertySchema);

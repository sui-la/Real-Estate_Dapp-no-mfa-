const express = require('express');
const { body, validationResult } = require('express-validator');
const Property = require('../models/Property');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/properties
// @desc    Get all properties
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc', tokenId } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add tokenId filtering
    if (tokenId) {
      query.tokenId = parseInt(tokenId);
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const properties = await Property.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('originalOwner', 'name walletAddress');

    const total = await Property.countDocuments(query);

    const response = {
      properties,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    };

    res.json(response);

  } catch (error) {
    console.error('❌ [ERROR] Backend: Get properties error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/properties/:id
// @desc    Get property by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {

    const property = await Property.findById(req.params.id)
      .populate('originalOwner', 'name walletAddress');

    if (!property) {
      console.log('❌ [ERROR] Backend: Property not found');
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    console.error('❌ [ERROR] Backend: Get property error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/properties
// @desc    Create a new property
// @access  Private (Admin only)
router.post('/', [
  auth,
  body('name').trim().isLength({ min: 1 }),
  body('description').trim().isLength({ min: 1 }),
  body('location').trim().isLength({ min: 1 }),
  body('totalValue').isFloat({ min: 0 }),
  body('totalShares').isInt({ min: 1 }),
  body('imageUrl').optional().isString()
], async (req, res) => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ [ERROR] Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is admin

    const user = await User.findById(req.user.id);

    if (!user) {
      console.log('❌ [ERROR] User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.isAdmin) {
      console.log('❌ [ERROR] User is not admin. isAdmin:', user.isAdmin);
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    console.log('✅ [SUCCESS] User is admin, proceeding with property creation');

    const {
      name,
      description,
      location,
      totalValue,
      totalShares,
      imageUrl,
      documents = []
    } = req.body;

    const property = new Property({
      name,
      description,
      location,
      totalValue,
      totalShares,
      sharesSold: 0,
      originalOwner: req.user.id,
      imageUrl,
      documents,
      isActive: true,
      // These will be set after blockchain creation
      tokenId: null,
      fractionalTokenAddress: null
    });

    await property.save();

    console.log('✅ [SUCCESS] Property saved successfully:', property);
    
    // Return the property with a note that blockchain creation is needed
    res.status(201).json({
      ...property.toObject(),
      message: 'Property created in database. Blockchain creation needed.',
      needsBlockchainCreation: true
    });
  } catch (error) {
    console.error('❌ [ERROR] Create property error:', error);
    console.error('❌ [ERROR] Error message:', error.message);
    console.error('❌ [ERROR] Error stack:', error.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/properties/:id
// @desc    Update property
// @access  Private (Admin only)
router.put('/:id', [
  auth,
  body('name').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim().isLength({ min: 1 }),
  body('location').optional().trim().isLength({ min: 1 }),
  body('totalValue').optional().isNumeric(),
  body('totalShares').optional().isInt({ min: 1 }),
  body('imageUrl').optional().isString(),
  body('documents').optional().isArray(),
  body('tokenId').optional().isNumeric(),
  body('fractionalTokenAddress').optional().isString()
], async (req, res) => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ [ERROR] Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) {
      console.log('❌ [ERROR] User is not admin');
      return res.status(403).json({ error: 'Admin access required' });
    }

    const property = await Property.findById(req.params.id);
    if (!property) {
      console.log('❌ [ERROR] Property not found');
      return res.status(404).json({ error: 'Property not found' });
    }

    const { 
      name, 
      description, 
      location,
      totalValue, 
      totalShares,
      imageUrl,
      documents,
      tokenId, 
      fractionalTokenAddress 
    } = req.body;

    // Update property fields if provided
    if (name) property.name = name;
    if (description) property.description = description;
    if (location) property.location = location;
    if (totalValue) property.totalValue = totalValue;
    if (totalShares) property.totalShares = totalShares;
    if (imageUrl !== undefined) property.imageUrl = imageUrl;
    if (documents !== undefined) property.documents = documents;
    if (tokenId !== undefined) property.tokenId = tokenId;
    if (fractionalTokenAddress !== undefined) property.fractionalTokenAddress = fractionalTokenAddress;

    await property.save();
    
    console.log('✅ [SUCCESS] Property updated successfully:', property);
    res.json(property);
  } catch (error) {
    console.error('❌ [ERROR] Update property error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/properties/:id
// @desc    Delete property
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    property.isActive = false;
    await property.save();

    res.json({ message: 'Property deactivated successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/properties/:id/shares
// @desc    Update property shares sold count
// @access  Private
router.put('/:id/shares', [
  auth,
  body('sharesSold').isInt({ min: 0 })
], async (req, res) => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ [ERROR] Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const property = await Property.findById(req.params.id);
    if (!property) {
      console.log('❌ [ERROR] Property not found');
      return res.status(404).json({ error: 'Property not found' });
    }

    const { sharesSold } = req.body;

    property.sharesSold = sharesSold;
    await property.save();
    
    console.log('✅ [SUCCESS] Property shares updated successfully:', property);
    res.json(property);
  } catch (error) {
    console.error('❌ [ERROR] Update shares error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/properties/:tokenId/trading
// @desc    Update trading status for a property by tokenId
// @access  Private (Admin only)
router.put('/:tokenId/trading', [
  auth,
  body('tradingEnabled').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ [ERROR] Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) {
      console.log('❌ [ERROR] User is not admin');
      return res.status(403).json({ error: 'Admin access required' });
    }

    const tokenId = parseInt(req.params.tokenId);
    const { tradingEnabled } = req.body;

    const property = await Property.findOne({ tokenId: tokenId });
    if (!property) {
      console.log('❌ [ERROR] Property not found with tokenId:', tokenId);
      return res.status(404).json({ error: 'Property not found' });
    }

    property.tradingEnabled = tradingEnabled;
    await property.save();
    
    console.log(`✅ [SUCCESS] Trading ${tradingEnabled ? 'enabled' : 'disabled'} for property:`, property.name);
    res.json({ 
      success: true, 
      message: `Trading ${tradingEnabled ? 'enabled' : 'disabled'} successfully`,
      property: property 
    });
  } catch (error) {
    console.error('❌ [ERROR] Update trading status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/properties/:id/analytics
// @desc    Get property analytics
// @access  Public
router.get('/:id/analytics', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Calculate analytics
    const analytics = {
      totalShares: property.totalShares,
      sharesSold: property.sharesSold,
      sharesAvailable: property.totalShares - property.sharesSold,
      percentageSold: (property.sharesSold / property.totalShares) * 100,
      totalValue: property.totalValue,
      sharePrice: property.totalValue / property.totalShares,
      createdAt: property.createdAt,
      isActive: property.isActive
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

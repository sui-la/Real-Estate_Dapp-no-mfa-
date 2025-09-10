const express = require('express');
const { body, validationResult } = require('express-validator');
const Dividend = require('../models/Dividend');
const Property = require('../models/Property');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dividends
// @desc    Get all dividends
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, propertyId, isActive } = req.query;
    
    const query = {};
    if (propertyId) query.property = propertyId;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const dividends = await Dividend.find(query)
      .populate('property', 'name tokenId')
      .populate('distributedBy', 'name walletAddress')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Dividend.countDocuments(query);

    res.json({
      dividends,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get dividends error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/dividends/:id
// @desc    Get dividend by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const dividend = await Dividend.findById(req.params.id)
      .populate('property', 'name tokenId')
      .populate('distributedBy', 'name walletAddress')
      .populate('claims.user', 'name walletAddress');

    if (!dividend) {
      return res.status(404).json({ error: 'Dividend not found' });
    }

    res.json(dividend);
  } catch (error) {
    console.error('Get dividend error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/dividends
// @desc    Create a new dividend distribution
// @access  Private (Admin only)
router.post('/', [
  auth,
  body('propertyId').isMongoId(),
  body('totalAmount').isNumeric(),
  body('description').trim().isLength({ min: 1 }),
  body('source').optional().isIn(['rental', 'appreciation', 'sale', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { propertyId, totalAmount, description, source = 'rental' } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Generate dividend ID (in a real app, this would come from the blockchain)
    const dividendId = Date.now();

    const dividend = new Dividend({
      property: propertyId,
      dividendId,
      totalAmount,
      description,
      source,
      distributedBy: req.user.id
    });

    await dividend.save();

    res.status(201).json(dividend);
  } catch (error) {
    console.error('Create dividend error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/dividends/:id/claim
// @desc    Record a dividend claim
// @access  Private
router.post('/:id/claim', [
  auth,
  body('amount').isNumeric(),
  body('transactionHash').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, transactionHash } = req.body;
    const dividend = await Dividend.findById(req.params.id);

    if (!dividend) {
      return res.status(404).json({ error: 'Dividend not found' });
    }

    if (!dividend.isActive) {
      return res.status(400).json({ error: 'Dividend is not active' });
    }

    // Check if user already claimed
    const existingClaim = dividend.claims.find(
      claim => claim.user.toString() === req.user.id.toString()
    );

    if (existingClaim) {
      return res.status(400).json({ error: 'Dividend already claimed' });
    }

    // Add claim
    dividend.claims.push({
      user: req.user.id,
      amount,
      transactionHash
    });

    dividend.distributedAmount += amount;
    await dividend.save();

    res.json(dividend);
  } catch (error) {
    console.error('Claim dividend error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/dividends/user/:userId
// @desc    Get user's dividend claims
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const dividends = await Dividend.find({
      'claims.user': req.params.userId
    })
      .populate('property', 'name tokenId')
      .populate('distributedBy', 'name walletAddress')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Dividend.countDocuments({
      'claims.user': req.params.userId
    });

    res.json({
      dividends,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get user dividends error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/dividends/stats/summary
// @desc    Get dividend statistics
// @access  Public
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Dividend.aggregate([
      {
        $group: {
          _id: null,
          totalDividends: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalDistributed: { $sum: '$distributedAmount' },
          avgAmount: { $avg: '$totalAmount' }
        }
      }
    ]);

    const bySource = await Dividend.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.json({
      summary: stats[0] || {
        totalDividends: 0,
        totalAmount: 0,
        totalDistributed: 0,
        avgAmount: 0
      },
      bySource
    });

  } catch (error) {
    console.error('Get dividend stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

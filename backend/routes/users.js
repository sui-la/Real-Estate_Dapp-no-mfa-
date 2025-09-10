const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('name').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('profile.phone').optional().trim(),
  body('profile.address').optional().trim(),
  body('profile.bio').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, profile } = req.body;
    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (email) user.email = email;
    if (profile) {
      user.profile = { ...user.profile, ...profile };
    }

    await user.save();

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      walletAddress: user.walletAddress,
      isAdmin: user.isAdmin,
      profile: user.profile
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/users/portfolio
// @desc    Get user's portfolio
// @access  Private
router.get('/portfolio', auth, async (req, res) => {
  try {
    // This would typically involve querying the blockchain
    // For now, we'll return a placeholder response
    res.json({
      totalValue: 0,
      properties: [],
      dividends: [],
      transactions: []
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/users/transactions
// @desc    Get user's transaction history
// @access  Private
router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    
    const query = { user: req.user.id };
    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .populate('property', 'name tokenId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/users/dividends
// @desc    Get user's dividend history
// @access  Private
router.get('/dividends', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const dividends = await Dividend.find({
      'claims.user': req.user.id
    })
      .populate('property', 'name tokenId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Dividend.countDocuments({
      'claims.user': req.user.id
    });

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

module.exports = router;

const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/transactions
// @desc    Get all transactions (with filters)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      propertyId, 
      status,
      startDate,
      endDate 
    } = req.query;
    
    const query = {};
    
    // Add filters
    if (type) query.type = type;
    if (propertyId) query.property = propertyId;
    if (status) query.status = status;
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .populate('user', 'name walletAddress')
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

// @route   GET /api/transactions/:id
// @desc    Get transaction by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('user', 'name walletAddress')
      .populate('property', 'name tokenId');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/transactions
// @desc    Create a new transaction record
// @access  Private
router.post('/', [
  auth,
  body('propertyId').isMongoId(),
  body('type').isIn(['buy', 'sell', 'dividend', 'transfer']),
  body('amount').isNumeric(),
  body('totalValue').isNumeric(),
  body('transactionHash').isString(),
  body('blockNumber').isNumeric(),
  body('gasUsed').isNumeric(),
  body('gasPrice').isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      propertyId,
      type,
      amount,
      shares,
      pricePerShare,
      totalValue,
      transactionHash,
      blockNumber,
      gasUsed,
      gasPrice,
      metadata = {}
    } = req.body;

    const transaction = new Transaction({
      user: req.user.id,
      property: propertyId,
      type,
      amount,
      shares,
      pricePerShare,
      totalValue,
      transactionHash,
      blockNumber,
      gasUsed,
      gasPrice,
      status: 'confirmed',
      metadata
    });

    await transaction.save();

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/transactions/:id/status
// @desc    Update transaction status
// @access  Private
router.put('/:id/status', [
  auth,
  body('status').isIn(['pending', 'confirmed', 'failed'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    transaction.status = req.body.status;
    await transaction.save();

    res.json(transaction);
  } catch (error) {
    console.error('Update transaction status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/transactions/stats/summary
// @desc    Get transaction statistics
// @access  Private
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await Transaction.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
          totalShares: { $sum: '$shares' }
        }
      }
    ]);

    const totalTransactions = await Transaction.countDocuments({ user: userId });
    const totalValue = await Transaction.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$totalValue' } } }
    ]);

    res.json({
      totalTransactions,
      totalValue: totalValue[0]?.total || 0,
      byType: stats
    });

  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

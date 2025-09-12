const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Property = require('../models/Property');
const TransactionTracker = require('../utils/transactionTracker');

// Get user's transaction history
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      type, 
      propertyId, 
      startDate, 
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { userId };
    
    if (type) {
      filter.type = type;
    }
    
    if (propertyId) {
      filter.propertyId = propertyId;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get transactions with property details
    const transactions = await Transaction.find(filter)
      .populate('propertyId', 'name tokenId imageUrl')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalCount = await Transaction.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    // Calculate summary statistics
    const summary = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      summary: summary.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          totalAmount: item.totalAmount
        };
        return acc;
      }, {})
    });

  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

// Get transaction by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('propertyId', 'name tokenId imageUrl');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Transaction fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Get transaction statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeframe = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const stats = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalShares: { $sum: '$shares' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    // Get portfolio value over time
    const portfolioHistory = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: { $in: ['BUY', 'SELL'] },
          createdAt: { $gte: startDate }
        }
      },
      {
        $sort: { createdAt: 1 }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalInvested: {
            $sum: {
              $cond: [
                { $eq: ['$type', 'BUY'] },
                '$amount',
                { $multiply: ['$amount', -1] }
              ]
            }
          },
          sharesTraded: { $sum: '$shares' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.json({
      stats: stats.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          totalAmount: item.totalAmount,
          totalShares: item.totalShares || 0,
          avgAmount: item.avgAmount
        };
        return acc;
      }, {}),
      portfolioHistory,
      timeframe
    });

  } catch (error) {
    console.error('Transaction stats error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction statistics' });
  }
});

// Track buy transaction
router.post('/track-buy', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      propertyId,
      shares,
      pricePerShare,
      totalAmount,
      transactionHash,
      blockNumber,
      gasUsed,
      gasFee,
      fromAddress,
      toAddress
    } = req.body;

    const transaction = await TransactionTracker.trackBuyTransaction({
      userId,
      propertyId,
      shares,
      pricePerShare,
      totalAmount,
      transactionHash,
      blockNumber,
      gasUsed,
      gasFee,
      fromAddress,
      toAddress
    });

    res.json(transaction);
  } catch (error) {
    console.error('Track buy transaction error:', error);
    res.status(500).json({ error: 'Failed to track buy transaction' });
  }
});

// Track sell transaction
router.post('/track-sell', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      propertyId,
      shares,
      pricePerShare,
      totalAmount,
      transactionHash,
      blockNumber,
      gasUsed,
      gasFee,
      fromAddress,
      toAddress
    } = req.body;

    const transaction = await TransactionTracker.trackSellTransaction({
      userId,
      propertyId,
      shares,
      pricePerShare,
      totalAmount,
      transactionHash,
      blockNumber,
      gasUsed,
      gasFee,
      fromAddress,
      toAddress
    });

    res.json(transaction);
  } catch (error) {
    console.error('Track sell transaction error:', error);
    res.status(500).json({ error: 'Failed to track sell transaction' });
  }
});

// Track dividend transaction
router.post('/track-dividend', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      propertyId,
      amount,
      transactionHash,
      blockNumber,
      gasUsed,
      gasFee,
      distributionId,
      type,
      fromAddress,
      toAddress
    } = req.body;

    const transaction = await TransactionTracker.trackDividendTransaction({
      userId,
      propertyId,
      amount,
      transactionHash,
      blockNumber,
      gasUsed,
      gasFee,
      distributionId,
      type,
      fromAddress,
      toAddress
    });

    res.json(transaction);
  } catch (error) {
    console.error('Track dividend transaction error:', error);
    res.status(500).json({ error: 'Failed to track dividend transaction' });
  }
});

// Track pending transaction
router.post('/track-pending', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      propertyId,
      type,
      amount,
      shares,
      pricePerShare,
      transactionHash,
      fromAddress,
      toAddress
    } = req.body;

    const transaction = await TransactionTracker.trackPendingTransaction({
      userId,
      propertyId,
      type,
      amount,
      shares,
      pricePerShare,
      transactionHash,
      fromAddress,
      toAddress
    });

    res.json(transaction);
  } catch (error) {
    console.error('Track pending transaction error:', error);
    res.status(500).json({ error: 'Failed to track pending transaction' });
  }
});

module.exports = router;
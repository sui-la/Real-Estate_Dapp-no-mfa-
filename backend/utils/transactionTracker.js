const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Property = require('../models/Property');

class TransactionTracker {
  /**
   * Track a buy transaction
   */
  static async trackBuyTransaction({
    userId,
    propertyId,
    shares,
    pricePerShare,
    totalAmount,
    transactionHash,
    blockNumber,
    gasUsed = 0,
    gasFee = 0,
    fromAddress,
    toAddress,
    metadata = {}
  }) {
    try {
      const transaction = new Transaction({
        userId,
        propertyId,
        type: 'BUY',
        amount: totalAmount,
        shares,
        pricePerShare,
        transactionHash,
        blockNumber,
        gasUsed,
        gasFee,
        status: 'CONFIRMED',
        fromAddress: fromAddress?.toLowerCase(),
        toAddress: toAddress?.toLowerCase(),
        metadata
      });

      await transaction.save();
      console.log(`✅ Tracked BUY transaction: ${transactionHash}`);
      return transaction;
    } catch (error) {
      console.error('Error tracking buy transaction:', error);
      throw error;
    }
  }

  /**
   * Track a sell transaction
   */
  static async trackSellTransaction({
    userId,
    propertyId,
    shares,
    pricePerShare,
    totalAmount,
    transactionHash,
    blockNumber,
    gasUsed = 0,
    gasFee = 0,
    fromAddress,
    toAddress,
    metadata = {}
  }) {
    try {
      const transaction = new Transaction({
        userId,
        propertyId,
        type: 'SELL',
        amount: totalAmount,
        shares,
        pricePerShare,
        transactionHash,
        blockNumber,
        gasUsed,
        gasFee,
        status: 'CONFIRMED',
        fromAddress: fromAddress?.toLowerCase(),
        toAddress: toAddress?.toLowerCase(),
        metadata
      });

      await transaction.save();
      console.log(`✅ Tracked SELL transaction: ${transactionHash}`);
      return transaction;
    } catch (error) {
      console.error('Error tracking sell transaction:', error);
      throw error;
    }
  }

  /**
   * Track a dividend distribution/claim transaction
   */
  static async trackDividendTransaction({
    userId,
    propertyId,
    amount,
    transactionHash,
    blockNumber,
    gasUsed = 0,
    gasFee = 0,
    distributionId,
    type = 'DIVIDEND_CLAIMED', // or 'DIVIDEND_RECEIVED'
    fromAddress,
    toAddress,
    metadata = {}
  }) {
    try {
      const transaction = new Transaction({
        userId,
        propertyId,
        type,
        amount,
        shares: 0, // Dividends don't involve share transfers
        pricePerShare: 0,
        transactionHash,
        blockNumber,
        gasUsed,
        gasFee,
        status: 'CONFIRMED',
        distributionId,
        fromAddress: fromAddress?.toLowerCase(),
        toAddress: toAddress?.toLowerCase(),
        metadata
      });

      await transaction.save();
      console.log(`✅ Tracked ${type} transaction: ${transactionHash}`);
      return transaction;
    } catch (error) {
      console.error(`Error tracking ${type.toLowerCase()} transaction:`, error);
      throw error;
    }
  }

  /**
   * Track a pending transaction (before confirmation)
   */
  static async trackPendingTransaction({
    userId,
    propertyId,
    type,
    amount,
    shares = 0,
    pricePerShare = 0,
    transactionHash,
    fromAddress,
    toAddress,
    metadata = {}
  }) {
    try {
      const transaction = new Transaction({
        userId,
        propertyId,
        type,
        amount,
        shares,
        pricePerShare,
        transactionHash,
        blockNumber: 0, // Will be updated when confirmed
        gasUsed: 0,
        gasFee: 0,
        status: 'PENDING',
        fromAddress: fromAddress?.toLowerCase(),
        toAddress: toAddress?.toLowerCase(),
        metadata
      });

      await transaction.save();
      console.log(`⏳ Tracked PENDING transaction: ${transactionHash}`);
      return transaction;
    } catch (error) {
      console.error('Error tracking pending transaction:', error);
      throw error;
    }
  }

  /**
   * Update transaction status when confirmed
   */
  static async confirmTransaction(transactionHash, blockNumber, gasUsed = 0, gasFee = 0) {
    try {
      const transaction = await Transaction.findOneAndUpdate(
        { transactionHash },
        {
          status: 'CONFIRMED',
          blockNumber,
          gasUsed,
          gasFee
        },
        { new: true }
      );

      if (transaction) {
        console.log(`✅ Confirmed transaction: ${transactionHash}`);
      } else {
        console.log(`⚠️ Transaction not found for confirmation: ${transactionHash}`);
      }

      return transaction;
    } catch (error) {
      console.error('Error confirming transaction:', error);
      throw error;
    }
  }

  /**
   * Mark transaction as failed
   */
  static async failTransaction(transactionHash, error = null) {
    try {
      const transaction = await Transaction.findOneAndUpdate(
        { transactionHash },
        {
          status: 'FAILED',
          metadata: {
            ...transaction.metadata,
            error: error?.message || error
          }
        },
        { new: true }
      );

      if (transaction) {
        console.log(`❌ Failed transaction: ${transactionHash}`);
      }

      return transaction;
    } catch (err) {
      console.error('Error marking transaction as failed:', err);
      throw err;
    }
  }

  /**
   * Get user's transaction summary
   */
  static async getUserTransactionSummary(userId, timeframe = '30d') {
    try {
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

      const summary = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate },
            status: 'CONFIRMED'
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            totalShares: { $sum: '$shares' }
          }
        }
      ]);

      return summary.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          totalAmount: item.totalAmount,
          totalShares: item.totalShares
        };
        return acc;
      }, {});
    } catch (error) {
      console.error('Error getting user transaction summary:', error);
      throw error;
    }
  }

  /**
   * Cleanup old pending transactions (older than 1 hour)
   */
  static async cleanupOldPendingTransactions() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const result = await Transaction.updateMany(
        {
          status: 'PENDING',
          createdAt: { $lt: oneHourAgo }
        },
        {
          status: 'FAILED',
          'metadata.error': 'Transaction timeout - marked as failed after 1 hour'
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`🧹 Cleaned up ${result.modifiedCount} old pending transactions`);
      }

      return result;
    } catch (error) {
      console.error('Error cleaning up old pending transactions:', error);
      throw error;
    }
  }
}

module.exports = TransactionTracker;

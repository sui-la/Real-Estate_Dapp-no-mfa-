const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

class TransactionService {
  static async trackBuyTransaction({
    propertyId,
    shares,
    pricePerShare,
    totalAmount,
    transactionHash,
    blockNumber,
    gasUsed = 0,
    gasFee = 0,
    fromAddress,
    toAddress
  }) {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/track-buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
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
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Buy transaction tracked:', data);
        return data;
      } else {
        console.error('Failed to track buy transaction:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error tracking buy transaction:', error);
      return null;
    }
  }

  static async trackSellTransaction({
    propertyId,
    shares,
    pricePerShare,
    totalAmount,
    transactionHash,
    blockNumber,
    gasUsed = 0,
    gasFee = 0,
    fromAddress,
    toAddress
  }) {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/track-sell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
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
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Sell transaction tracked:', data);
        return data;
      } else {
        console.error('Failed to track sell transaction:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error tracking sell transaction:', error);
      return null;
    }
  }

  static async trackDividendTransaction({
    propertyId,
    amount,
    transactionHash,
    blockNumber,
    gasUsed = 0,
    gasFee = 0,
    distributionId,
    type = 'DIVIDEND_CLAIMED',
    fromAddress,
    toAddress
  }) {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/track-dividend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
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
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Dividend transaction tracked:', data);
        return data;
      } else {
        console.error('Failed to track dividend transaction:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error tracking dividend transaction:', error);
      return null;
    }
  }

  static async trackPendingTransaction({
    propertyId,
    type,
    amount,
    shares = 0,
    pricePerShare = 0,
    transactionHash,
    fromAddress,
    toAddress
  }) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/transactions/track-pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          propertyId,
          type,
          amount,
          shares,
          pricePerShare,
          transactionHash,
          fromAddress,
          toAddress
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('⏳ Pending transaction tracked:', data);
        return data;
      } else {
        console.error('Failed to track pending transaction:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error tracking pending transaction:', error);
      return null;
    }
  }

  static async getTransactionHistory(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/transactions?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch transaction history:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return null;
    }
  }

  static async getTransactionStats(timeframe = '30d') {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/transactions/stats/summary?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch transaction stats:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
      return null;
    }
  }

  /**
   * Helper to extract transaction details from Web3 transaction receipt
   */
  static extractTransactionDetails(receipt, account) {
    return {
      transactionHash: receipt.transactionHash || receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed ? Number(receipt.gasUsed) : 0,
      gasFee: receipt.effectiveGasPrice ? 
        Number(receipt.gasUsed) * Number(receipt.effectiveGasPrice) / 1e18 : 0,
      fromAddress: receipt.from || account,
      toAddress: receipt.to
    };
  }
}

export default TransactionService;

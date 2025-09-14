import { ethers } from 'ethers'

/**
 * Web3 Service - Handles all blockchain interactions
 */
class Web3Service {
  constructor(contracts, signer) {
    this.contracts = contracts
    this.signer = signer
  }

  // Property Management
  async createProperty(propertyData) {
    try {
      
      const {
        name,
        description,
        location,
        totalValue,
        totalShares,
        imageUrl,
        documents,
        fractionalTokenName,
        fractionalTokenSymbol
      } = propertyData

      const tx = await this.contracts.realEstateFractionalization.createAndFractionalizeProperty(
        name,
        description,
        location,
        ethers.parseEther(totalValue.toString()),
        totalShares,
        imageUrl,
        documents,
        fractionalTokenName,
        fractionalTokenSymbol
      )

      const receipt = await tx.wait()
      
      // Additional debugging for transaction logs
      if (receipt.logs && receipt.logs.length > 0) {

        for (let i = 0; i < receipt.logs.length; i++) {
          const log = receipt.logs[i]

          try {
            const decoded = this.contracts.realEstateFractionalization.interface.parseLog(log)

          } catch (e) {

          }
        }
      }
      
      return receipt
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Error creating property:', error)
      console.error('❌ [ERROR] Web3Service: Error details:', {
        message: error.message,
        code: error.code,
        data: error.data
      })
      throw error
    }
  }

  async getPropertyDetails(propertyId) {
    try {

      const [property, fractionalTokenAddress, isFractionalized] = 
        await this.contracts.realEstateFractionalization.getPropertyDetails(propertyId)

      console.log('  - Property:', property)
      console.log('  - Fractional token address:', fractionalTokenAddress)
      console.log('  - Is fractionalized:', isFractionalized)

      // Check trading status if fractionalized
      let tradingEnabled = false
      if (isFractionalized && fractionalTokenAddress !== '0x0000000000000000000000000000000000000000') {
        try {
          const fractionalToken = new ethers.Contract(
            fractionalTokenAddress,
            this.getFractionalTokenABI(),
            this.signer
          )
          tradingEnabled = await fractionalToken.tradingEnabled()

        } catch (error) {
          console.error('❌ [ERROR] Failed to check trading status:', error)
          tradingEnabled = false
        }
      }

      const result = {
        id: propertyId,
        name: property.name,
        description: property.description,
        location: property.location,
        totalValue: property.totalValue,
        totalShares: Number(property.totalShares),
        sharesSold: Number(property.sharesSold),
        availableShares: Number(property.totalShares) - Number(property.sharesSold),
        originalOwner: property.originalOwner,
        isActive: property.isActive,
        createdAt: Number(property.createdAt),
        imageUrl: property.imageUrl,
        documents: property.documents,
        fractionalTokenAddress,
        isFractionalized,
        tradingEnabled,
        totalValueFormatted: ethers.formatEther(property.totalValue),
        sharePrice: ethers.formatEther(property.totalValue / Math.max(property.totalShares, 1))
      }

      return result
    } catch (error) {
      console.error('❌ [ERROR] getPropertyDetails failed:', error)
      console.error('❌ [ERROR] Error details:', {
        message: error.message,
        code: error.code,
        data: error.data
      })
      throw error
    }
  }

  async getAllProperties() {
    try {

      const totalProperties = await this.contracts.propertyToken.getTotalProperties()

      const properties = []

      // Handle case when no properties exist yet
      if (totalProperties === 0n || totalProperties === 0) {

        return properties
      }

      for (let i = 1; i <= totalProperties; i++) {
        try {

          const property = await this.contracts.propertyToken.getProperty(i)

          if (property.isActive) {
            const processedProperty = {
              id: i,
              name: property.name || 'Unnamed Property',
              description: property.description || '',
              location: property.location || 'Unknown Location',
              totalValue: property.totalValue || 0,
              totalShares: Number(property.totalShares) || 0,
              sharesSold: Number(property.sharesSold) || 0,
              originalOwner: property.originalOwner || '',
              isActive: property.isActive || false,
              createdAt: Number(property.createdAt) || 0,
              imageUrl: property.imageUrl || '',
              documents: property.documents || [],
              totalValueFormatted: ethers.formatEther(property.totalValue || 0),
              sharePrice: ethers.formatEther((property.totalValue || 0) / Math.max(property.totalShares || 1, 1))
            }

            properties.push(processedProperty)
          } else {

          }
        } catch (error) {
          console.error(`❌ [ERROR] Error loading property ${i}:`, error)
        }
      }

      return properties
    } catch (error) {
      console.error('❌ [ERROR] getAllProperties failed:', error)
      throw error
    }
  }

  // Share Trading
  async enableTrading(propertyId) {
    try {

      const tx = await this.contracts.realEstateFractionalization.enableTrading(propertyId)
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Error enabling trading:', error)
      console.error('❌ [ERROR] Web3Service: Error details:', {
        message: error.message,
        code: error.code,
        data: error.data
      })
      throw error
    }
  }

  async disableTrading(propertyId) {
    try {
      const tx = await this.contracts.realEstateFractionalization.disableTrading(propertyId)
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Error disabling trading:', error)
      throw error
    }
  }

  async isTradingEnabled(propertyId) {
    try {
      const fractionalTokenAddress = await this.contracts.realEstateFractionalization.fractionalTokens(propertyId)
      const fractionalToken = new ethers.Contract(
        fractionalTokenAddress,
        this.getFractionalTokenABI(),
        this.signer
      )
      return await fractionalToken.tradingEnabled()
    } catch (error) {
      console.error('Error checking trading status:', error)
      return false
    }
  }

  async purchaseShares(propertyId, shares) {
    try {
      console.log('🔄 [DEBUG] purchaseShares starting...')
      console.log('🔄 [DEBUG] propertyId:', propertyId)
      console.log('🔄 [DEBUG] shares:', shares)
      console.log('🔄 [DEBUG] signer address:', await this.signer.getAddress())

      // Check if property is fractionalized
      const isPropertyFractionalized = await this.contracts.realEstateFractionalization.isPropertyFractionalized(propertyId)
      console.log('🔄 [DEBUG] isPropertyFractionalized:', isPropertyFractionalized)
      
      if (!isPropertyFractionalized) {
        throw new Error(`Property ${propertyId} is not fractionalized`)
      }

      const fractionalTokenAddress = await this.contracts.realEstateFractionalization.fractionalTokens(propertyId)
      console.log('🔄 [DEBUG] fractionalTokenAddress:', fractionalTokenAddress)
      
      if (fractionalTokenAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`No fractional token found for property ${propertyId}`)
      }

      const fractionalToken = new ethers.Contract(
        fractionalTokenAddress,
        this.getFractionalTokenABI(),
        this.signer
      )

      const sharePrice = await fractionalToken.sharePrice()
      const totalCost = sharePrice * BigInt(shares)
      console.log('🔄 [DEBUG] sharePrice:', ethers.formatEther(sharePrice), 'ETH')
      console.log('🔄 [DEBUG] totalCost:', ethers.formatEther(totalCost), 'ETH')

      // Check user balance
      const userBalance = await this.signer.provider.getBalance(await this.signer.getAddress())
      console.log('🔄 [DEBUG] userBalance:', ethers.formatEther(userBalance), 'ETH')
      
      if (userBalance < totalCost) {
        throw new Error(`Insufficient balance. Need ${ethers.formatEther(totalCost)} ETH but have ${ethers.formatEther(userBalance)} ETH`)
      }

      // Try to estimate gas first, with fallback to higher gas limit
      let gasLimit = 750000; // Conservative default
      try {
        const estimatedGas = await this.contracts.realEstateFractionalization.purchaseShares.estimateGas(propertyId, shares, {
          value: totalCost
        });
        // Add 50% buffer to estimated gas
        gasLimit = Math.floor(Number(estimatedGas) * 1.5);
        console.log('🔄 [DEBUG] Estimated gas:', estimatedGas.toString(), 'Using gas limit:', gasLimit);
      } catch (gasEstimateError) {
        console.warn('🔄 [DEBUG] Gas estimation failed, using default gas limit:', gasLimit);
        console.warn('Gas estimate error:', gasEstimateError.message);
      }

      console.log('🔄 [DEBUG] Calling purchaseShares on main contract...')
      
      // Get current gas price and add some buffer
      const feeData = await this.signer.provider.getFeeData();
      console.log('🔄 [DEBUG] Current gas price:', ethers.formatUnits(feeData.gasPrice || 0, 'gwei'), 'gwei');
      
      const txOptions = {
        value: totalCost,
        gasLimit: gasLimit
      };
      
      // Add gas price for better reliability
      if (feeData.gasPrice) {
        txOptions.gasPrice = feeData.gasPrice;
      }
      
      const tx = await this.contracts.realEstateFractionalization.purchaseShares(propertyId, shares, txOptions)

      const receipt = await tx.wait()
      
      
      return receipt
    } catch (error) {
      console.error('❌ [ERROR] Error purchasing shares:', error)
      
      // Better error messages
      if (error.message.includes('missing revert data')) {
        throw new Error('Smart contract call failed. Please check MetaMask is connected to localhost:8545 and contracts are deployed.')
      } else if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient ETH balance to complete purchase.')
      } else if (error.message.includes('user rejected')) {
        throw new Error('Transaction was rejected by user.')
      } else if (error.message.includes('trading is not enabled')) {
        throw new Error('Trading is not enabled for this property.')
      } else if (error.message.includes('unrecognized-selector') || error.message.includes('run out of gas')) {
        throw new Error('Transaction failed due to gas issues. Please try again with a higher gas limit or check your MetaMask settings.')
      } else if (error.message.includes('reverted without a reason')) {
        throw new Error('Transaction was reverted. This might be due to insufficient gas, network congestion, or contract state issues. Please try again.')
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new Error('Unable to estimate gas for this transaction. Please check the transaction parameters and try again.')
      } else {
        throw new Error(`Purchase failed: ${error.message}`)
      }
    }
  }

  async sellShares(propertyId, shares) {
    try {
      const tx = await this.contracts.realEstateFractionalization.sellShares(propertyId, shares)
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Error selling shares:', error)
      throw error
    }
  }

  // Trading Platform
  async createSellOrder(propertyId, shares, pricePerShare, expiresIn) {
    try {
      const tx = await this.contracts.realEstateFractionalization.createSellOrder(
        propertyId,
        shares,
        ethers.parseEther(pricePerShare.toString()),
        expiresIn
      )
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Error creating sell order:', error)
      throw error
    }
  }

  async createBuyOrder(propertyId, shares, pricePerShare, expiresIn) {
    try {
      const totalCost = ethers.parseEther(pricePerShare.toString()) * BigInt(shares)
      const tx = await this.contracts.realEstateFractionalization.createBuyOrder(
        propertyId,
        shares,
        ethers.parseEther(pricePerShare.toString()),
        expiresIn,
        { value: totalCost }
      )
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Error creating buy order:', error)
      throw error
    }
  }

  async fillSellOrder(orderId) {
    try {
      const tx = await this.contracts.tradingPlatform.fillSellOrder(orderId)
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Error filling sell order:', error)
      throw error
    }
  }

  async fillBuyOrder(orderId) {
    try {
      const tx = await this.contracts.tradingPlatform.fillBuyOrder(orderId)
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Error filling buy order:', error)
      throw error
    }
  }


  async getActiveOrders(propertyId) {
    try {
      const orders = await this.contracts.realEstateFractionalization.getActiveOrders(propertyId)
      const orderDetails = []

      for (const orderId of orders) {
        const order = await this.contracts.tradingPlatform.getOrder(orderId)
        orderDetails.push({
          id: orderId,
          ...order,
          pricePerShareFormatted: ethers.formatEther(order.pricePerShare),
          totalValueFormatted: ethers.formatEther(order.shares * order.pricePerShare)
        })
      }

      return orderDetails
    } catch (error) {
      console.error('Error getting active orders:', error)
      throw error
    }
  }

  // Dividend Management
  async distributeDividends(propertyId, description, amount) {
    try {
      // Get fractional token address for this property
      const fractionalTokenAddress = await this.contracts.realEstateFractionalization.fractionalTokens(propertyId)
      
      const tx = await this.contracts.realEstateFractionalization.distributeDividends(
        propertyId,
        description,
        { value: ethers.parseEther(amount.toString()) }
      )
      const receipt = await tx.wait()
      
      
      return receipt
    } catch (error) {
      console.error('❌ [DEBUG] Error distributing dividends:', error)
      console.error('❌ [DEBUG] Error details:', {
        message: error.message,
        code: error.code,
        data: error.data
      })
      throw error
    }
  }

  async claimDividend(dividendId) {
    try {
      const tx = await this.contracts.realEstateFractionalization.claimDividend(dividendId)
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Error claiming dividend:', error)
      throw error
    }
  }

  async batchClaimDividends(dividendIds) {
    try {
      const tx = await this.contracts.realEstateFractionalization.batchClaimDividends(dividendIds)
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Error batch claiming dividends:', error)
      throw error
    }
  }

  async getTotalClaimableDividends(userAddress) {
    try {
      const totalClaimable = await this.contracts.realEstateFractionalization.getTotalClaimableDividends(userAddress)
      return ethers.formatEther(totalClaimable)
    } catch (error) {
      console.error('Error getting total claimable dividends:', error)
      throw error
    }
  }

  async getPropertyDividends(propertyId) {
    try {
      const numericPropertyId = Number(propertyId)
      if (isNaN(numericPropertyId) || numericPropertyId <= 0) {
        return []
      }
      
      const dividendIds = await this.contracts.realEstateFractionalization.getPropertyDividends(numericPropertyId)
      const dividends = []

      for (const dividendId of dividendIds) {
        try {
          const dividend = await this.contracts.dividendDistributor.getDividend(dividendId)
          dividends.push({
            id: Number(dividendId),
            ...dividend,
            totalAmountFormatted: ethers.formatEther(dividend.totalAmount),
            distributedAmountFormatted: ethers.formatEther(dividend.distributedAmount)
          })
        } catch (dividendError) {
          console.error('Error getting dividend details for ID:', dividendId, dividendError)
        }
      }

      return dividends
    } catch (error) {
      console.error('Error getting property dividends:', error)
      throw error
    }
  }

  async getClaimableDividend(userAddress, dividendId) {
    try {
      const numericDividendId = Number(dividendId)
      if (isNaN(numericDividendId) || numericDividendId <= 0) {
        return '0'
      }
      
      const claimableAmount = await this.contracts.dividendDistributor.getClaimableDividend(userAddress, BigInt(numericDividendId))
      return ethers.formatEther(claimableAmount)
    } catch (error) {
      console.error('Error getting claimable dividend:', error)
      return '0'
    }
  }

  // User Portfolio
  async getUserOwnershipInfo(userAddress, propertyId) {
    try {

      // Get fractional token address first
      const fractionalTokenAddress = await this.contracts.realEstateFractionalization.fractionalTokens(propertyId)

      // Check balance directly from fractional token
      const FRACTIONAL_TOKEN_ABI = [
        "function balanceOf(address account) external view returns (uint256)",
        "function totalSupply() external view returns (uint256)",
        "function sharePrice() external view returns (uint256)",
        "function tradingEnabled() external view returns (bool)",
        "function getOwnershipPercentage(address shareholder) external view returns (uint256)",
        "function getPropertyValueOwned(address shareholder) external view returns (uint256)",
        "function getClaimableDividends(address shareholder) external view returns (uint256)",
        "function purchaseShares(uint256 amount) external payable",
        "function sellShares(uint256 amount) external",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function transfer(address to, uint256 amount) external returns (bool)",
        "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
      ]
      const fractionalTokenContract = new ethers.Contract(fractionalTokenAddress, FRACTIONAL_TOKEN_ABI, this.signer)
      const directBalance = await fractionalTokenContract.balanceOf(userAddress)

      const [ownershipPercentage, sharesOwned, propertyValueOwned] = 
        await this.contracts.realEstateFractionalization.getUserOwnershipInfo(userAddress, propertyId)

      return {
        ownershipPercentage: Number(ownershipPercentage),
        sharesOwned: ethers.formatEther(sharesOwned),
        propertyValueOwned: ethers.formatEther(propertyValueOwned)
      }
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Error getting user ownership info:', error)
      console.error('❌ [ERROR] Web3Service: Error details:', error.message)
      throw error
    }
  }

  async getUserPortfolio(userAddress) {
    try {

      const properties = await this.getAllProperties()

      const portfolio = []

      for (const property of properties) {
        try {

          const ownership = await this.getUserOwnershipInfo(userAddress, property.id)

          if (parseFloat(ownership.sharesOwned) > 0) {
            // Get claimable dividends for this property
            let claimableDividends = 0
            try {
              const propertyDividends = await this.getPropertyDividends(property.id)

              for (const dividend of propertyDividends) {
                const claimable = await this.getClaimableDividend(userAddress, dividend.id)
                claimableDividends += parseFloat(claimable)
              }
            } catch (dividendError) {
              console.error('❌ [ERROR] Web3Service: Error getting dividends for property:', property.id, dividendError)
            }
            
            portfolio.push({
              ...property,
              ...ownership,
              claimableDividends: claimableDividends.toString()
            })

          }
        } catch (error) {
          console.error(`❌ [ERROR] Web3Service: Error getting ownership for property ${property.id}:`, error)
        }
      }

      return portfolio
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Error getting user portfolio:', error)
      throw error
    }
  }

  // Admin Functions

  // Debug Functions
  async debugPropertyCreation(tokenId) {
    try {

      // Check if property exists
      const propertyExists = await this.contracts.propertyToken.propertyExists(tokenId)

      if (propertyExists) {
        const property = await this.contracts.propertyToken.getProperty(tokenId)

        const fractionalTokenAddress = await this.contracts.realEstateFractionalization.fractionalTokens(tokenId)

        const isFractionalized = await this.contracts.realEstateFractionalization.isPropertyFractionalized(tokenId)

        const propertyDetails = await this.contracts.realEstateFractionalization.getPropertyDetails(tokenId)

      }
      
      return {
        propertyExists,
        fractionalTokenAddress: await this.contracts.realEstateFractionalization.fractionalTokens(tokenId),
        isFractionalized: await this.contracts.realEstateFractionalization.isPropertyFractionalized(tokenId)
      }
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Debug failed:', error)
      throw error
    }
  }

  async getSharesSoldCount(tokenId) {
    try {

      const fractionalTokenAddress = await this.contracts.realEstateFractionalization.fractionalTokens(tokenId)

      if (fractionalTokenAddress === '0x0000000000000000000000000000000000000000') {

        return 0
      }
      
      const fractionalToken = new ethers.Contract(
        fractionalTokenAddress,
        this.getFractionalTokenABI(),
        this.signer
      )
      
      const totalSupply = await fractionalToken.totalSupply()
      const contractBalance = await fractionalToken.balanceOf(fractionalTokenAddress)

      // Calculate shares sold: total supply - contract balance
      const sharesSold = totalSupply - contractBalance
      const sharesSoldFormatted = Number(ethers.formatEther(sharesSold))

      return sharesSoldFormatted
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Error getting shares sold count:', error)
      return 0
    }
  }

  // Utility Functions
  getFractionalTokenABI() {
    return [
      "function balanceOf(address account) external view returns (uint256)",
      "function totalSupply() external view returns (uint256)",
      "function sharePrice() external view returns (uint256)",
      "function tradingEnabled() external view returns (bool)",
      "function getOwnershipPercentage(address shareholder) external view returns (uint256)",
      "function getPropertyValueOwned(address shareholder) external view returns (uint256)",
      "function getClaimableDividends(address shareholder) external view returns (uint256)",
      "function purchaseShares(uint256 amount) external payable",
      "function sellShares(uint256 amount) external",
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function transfer(address to, uint256 amount) external returns (bool)",
      "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
    ]
  }

  // Trading Platform Functions
  async createBuyOrder(propertyTokenId, fractionalTokenAddress, shares, pricePerShare, expiresIn) {
    try {

      const totalCost = BigInt(shares) * pricePerShare

      const tx = await this.contracts.tradingPlatform.createBuyOrder(
        propertyTokenId,
        fractionalTokenAddress,
        shares,
        pricePerShare,
        expiresIn,
        { value: totalCost }
      )

      const receipt = await tx.wait()

      return receipt
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Error creating buy order:', error)
      throw error
    }
  }

  async createSellOrder(propertyTokenId, fractionalTokenAddress, shares, pricePerShare, expiresIn) {
    try {
      console.log('🔄 Creating sell order for property:', propertyTokenId)
      console.log('📊 Shares to sell:', shares)
      console.log('💰 Price per share:', ethers.formatEther(pricePerShare))

      // First, we need to approve the TradingPlatform contract to transfer our fractional tokens
      const FRACTIONAL_TOKEN_ABI = [
        "function balanceOf(address account) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)"
      ]
      
      const fractionalTokenContract = new ethers.Contract(fractionalTokenAddress, FRACTIONAL_TOKEN_ABI, this.signer)
      
      // Check user's balance first
      const userBalance = await fractionalTokenContract.balanceOf(await this.signer.getAddress())
      const sharesInWei = BigInt(shares) * BigInt(10**18)
      
      console.log('👤 User balance:', ethers.formatEther(userBalance), 'shares')
      console.log('📝 Required shares:', ethers.formatEther(sharesInWei), 'shares')
      
      if (userBalance < sharesInWei) {
        throw new Error(`Insufficient shares. You have ${ethers.formatEther(userBalance)} shares but need ${ethers.formatEther(sharesInWei)} shares`)
      }

      // Check current allowance
      const currentAllowance = await fractionalTokenContract.allowance(
        await this.signer.getAddress(),
        this.contracts.tradingPlatform.target
      )
      
      console.log('🔍 Current allowance:', ethers.formatEther(currentAllowance))
      
      // If allowance is insufficient, approve the trading platform
      if (currentAllowance < sharesInWei) {
        console.log('🔓 Approving TradingPlatform to spend fractional tokens...')
        const approveTx = await fractionalTokenContract.approve(
          this.contracts.tradingPlatform.target,
          sharesInWei
        )
        console.log('⏳ Waiting for approval transaction...')
        await approveTx.wait()
        console.log('✅ Approval transaction confirmed')
      }

      // Now create the sell order
      console.log('📝 Creating sell order on TradingPlatform...')
      const tx = await this.contracts.tradingPlatform.createSellOrder(
        propertyTokenId,
        fractionalTokenAddress,
        shares,
        pricePerShare,
        expiresIn
      )

      console.log('⏳ Waiting for sell order transaction...')
      const receipt = await tx.wait()
      console.log('✅ Sell order created successfully!')

      return receipt
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Error creating sell order:', error)
      throw error
    }
  }

  async fillBuyOrder(orderId) {
    try {
      console.log('🔄 Filling buy order:', orderId)

      // Get order details first
      const order = await this.contracts.tradingPlatform.getOrder(orderId)
      console.log('📋 Order details:', {
        shares: order.shares.toString(),
        fractionalTokenAddress: order.fractionalTokenAddress,
        isBuyOrder: order.isBuyOrder
      })

      // Verify this is a buy order
      if (!order.isBuyOrder) {
        throw new Error('This is not a buy order')
      }

      // We need to approve the TradingPlatform to transfer our fractional tokens
      const FRACTIONAL_TOKEN_ABI = [
        "function balanceOf(address account) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)"
      ]
      
      const fractionalTokenContract = new ethers.Contract(order.fractionalTokenAddress, FRACTIONAL_TOKEN_ABI, this.signer)
      
      // Check user's balance
      const userBalance = await fractionalTokenContract.balanceOf(await this.signer.getAddress())
      const sharesInWei = BigInt(order.shares) * BigInt(10**18)
      
      console.log('👤 User balance:', ethers.formatEther(userBalance), 'shares')
      console.log('📝 Required shares:', ethers.formatEther(sharesInWei), 'shares')
      
      if (userBalance < sharesInWei) {
        throw new Error(`Insufficient shares. You have ${ethers.formatEther(userBalance)} shares but need ${ethers.formatEther(sharesInWei)} shares`)
      }

      // Check current allowance
      const currentAllowance = await fractionalTokenContract.allowance(
        await this.signer.getAddress(),
        this.contracts.tradingPlatform.target
      )
      
      console.log('🔍 Current allowance:', ethers.formatEther(currentAllowance))
      
      // If allowance is insufficient, approve the trading platform
      if (currentAllowance < sharesInWei) {
        console.log('🔓 Approving TradingPlatform to spend fractional tokens...')
        const approveTx = await fractionalTokenContract.approve(
          this.contracts.tradingPlatform.target,
          sharesInWei
        )
        console.log('⏳ Waiting for approval transaction...')
        await approveTx.wait()
        console.log('✅ Approval transaction confirmed')
      }

      // Now fill the buy order
      console.log('📝 Filling buy order...')
      const tx = await this.contracts.tradingPlatform.fillBuyOrder(orderId)

      console.log('⏳ Waiting for fill transaction...')
      const receipt = await tx.wait()
      console.log('✅ Buy order filled successfully!')

      return receipt
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Error filling buy order:', error)
      throw error
    }
  }

  async fillSellOrder(orderId, value) {
    try {

      const tx = await this.contracts.tradingPlatform.fillSellOrder(orderId, { value })

      const receipt = await tx.wait()

      return receipt
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Error filling sell order:', error)
      throw error
    }
  }

  async cancelOrder(orderId) {
    try {
      console.log('🚫 Cancelling order:', orderId)

      const tx = await this.contracts.tradingPlatform.cancelOrder(orderId)
      console.log('📝 Cancel transaction sent:', tx.hash)

      const receipt = await tx.wait()
      console.log('✅ Order cancelled successfully:', receipt.transactionHash)

      return receipt
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Error cancelling order:', error)
      throw error
    }
  }

  formatAddress(address) {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  formatEther(value) {
    if (!value) return '0'
    return ethers.formatEther(value)
  }

  parseEther(value) {
    return ethers.parseEther(value.toString())
  }
}

export default Web3Service

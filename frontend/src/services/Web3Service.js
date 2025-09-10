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
      console.log('🔍 [DEBUG] Web3Service: Starting createProperty with data:', propertyData)
      
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

      console.log('🔍 [DEBUG] Web3Service: Contract address:', this.contracts.realEstateFractionalization?.target)
      console.log('🔍 [DEBUG] Web3Service: Contract exists:', !!this.contracts.realEstateFractionalization)
      
      console.log('🔍 [DEBUG] Web3Service: Calling createAndFractionalizeProperty with params:', {
        name,
        description,
        location,
        totalValue: ethers.parseEther(totalValue.toString()),
        totalShares,
        imageUrl,
        documents,
        fractionalTokenName,
        fractionalTokenSymbol
      })

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

      console.log('✅ [SUCCESS] Web3Service: Transaction sent:', tx.hash)
      const receipt = await tx.wait()
      console.log('✅ [SUCCESS] Web3Service: Transaction confirmed:', receipt)
      
      // Additional debugging for transaction logs
      if (receipt.logs && receipt.logs.length > 0) {
        console.log('🔍 [DEBUG] Web3Service: Transaction logs count:', receipt.logs.length)
        for (let i = 0; i < receipt.logs.length; i++) {
          const log = receipt.logs[i]
          console.log(`🔍 [DEBUG] Web3Service: Log ${i}:`, {
            address: log.address,
            topics: log.topics,
            data: log.data
          })
          
          try {
            const decoded = this.contracts.realEstateFractionalization.interface.parseLog(log)
            console.log(`🔍 [DEBUG] Web3Service: Decoded log ${i}:`, decoded)
          } catch (e) {
            console.log(`🔍 [DEBUG] Web3Service: Could not decode log ${i}:`, e.message)
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
      console.log('🔍 [DEBUG] getPropertyDetails called with propertyId:', propertyId)
      console.log('🔍 [DEBUG] Available contracts:', Object.keys(this.contracts))
      console.log('🔍 [DEBUG] Main contract address:', this.contracts.realEstateFractionalization?.target)
      
      const [property, fractionalTokenAddress, isFractionalized] = 
        await this.contracts.realEstateFractionalization.getPropertyDetails(propertyId)

      console.log('🔍 [DEBUG] Raw contract response:')
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
          console.log('🔍 [DEBUG] Trading enabled:', tradingEnabled)
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

      console.log('🔍 [DEBUG] Processed result:', result)
      console.log('🔍 [DEBUG] Total shares:', result.totalShares)
      console.log('🔍 [DEBUG] Shares sold:', result.sharesSold)
      console.log('🔍 [DEBUG] Available shares:', result.availableShares)
      console.log('🔍 [DEBUG] Available shares calculation:', `${result.totalShares} - ${result.sharesSold} = ${result.availableShares}`)
      console.log('🔍 [DEBUG] Trading enabled:', result.tradingEnabled)
      console.log('🔍 [DEBUG] Is fractionalized:', result.isFractionalized)
      console.log('🔍 [DEBUG] Fractional token address:', result.fractionalTokenAddress)
      
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
      console.log('🔍 [DEBUG] getAllProperties called')
      console.log('🔍 [DEBUG] PropertyToken contract address:', this.contracts.propertyToken?.target)
      
      const totalProperties = await this.contracts.propertyToken.getTotalProperties()
      console.log('🔍 [DEBUG] Total properties from contract:', totalProperties.toString())
      
      const properties = []

      // Handle case when no properties exist yet
      if (totalProperties === 0n || totalProperties === 0) {
        console.log('🔍 [DEBUG] No properties found, returning empty array')
        return properties
      }

      for (let i = 1; i <= totalProperties; i++) {
        try {
          console.log(`🔍 [DEBUG] Loading property ${i}...`)
          const property = await this.contracts.propertyToken.getProperty(i)
          console.log(`🔍 [DEBUG] Property ${i} data:`, property)
          
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
            
            console.log(`🔍 [DEBUG] Processed property ${i}:`, processedProperty)
            properties.push(processedProperty)
          } else {
            console.log(`🔍 [DEBUG] Property ${i} is inactive, skipping`)
          }
        } catch (error) {
          console.error(`❌ [ERROR] Error loading property ${i}:`, error)
        }
      }

      console.log('🔍 [DEBUG] Final properties array:', properties)
      return properties
    } catch (error) {
      console.error('❌ [ERROR] getAllProperties failed:', error)
      throw error
    }
  }

  // Share Trading
  async enableTrading(propertyId) {
    try {
      console.log('🔍 [DEBUG] Web3Service: Enabling trading for property:', propertyId)
      console.log('🔍 [DEBUG] Web3Service: Contract address:', this.contracts.realEstateFractionalization?.target)
      
      const tx = await this.contracts.realEstateFractionalization.enableTrading(propertyId)
      console.log('✅ [SUCCESS] Web3Service: Trading enable transaction sent:', tx.hash)
      
      const receipt = await tx.wait()
      console.log('✅ [SUCCESS] Web3Service: Trading enabled successfully:', receipt)
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
      console.log('🔍 [DEBUG] Web3Service: purchaseShares called with:', { propertyId, shares })
      console.log('🔍 [DEBUG] Web3Service: Using contract address:', this.contracts.realEstateFractionalization.target)
      console.log('🔍 [DEBUG] Web3Service: CACHE BUST - Timestamp:', Date.now())
      
      const fractionalTokenAddress = await this.contracts.realEstateFractionalization.fractionalTokens(propertyId)
      const fractionalToken = new ethers.Contract(
        fractionalTokenAddress,
        this.getFractionalTokenABI(),
        this.signer
      )

      const sharePrice = await fractionalToken.sharePrice()
      const totalCost = sharePrice * BigInt(shares)

      const tx = await this.contracts.realEstateFractionalization.purchaseShares(propertyId, shares, {
        value: totalCost
      })

      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Error purchasing shares:', error)
      throw error
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

  async cancelOrder(orderId) {
    try {
      const tx = await this.contracts.tradingPlatform.cancelOrder(orderId)
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Error cancelling order:', error)
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
      const tx = await this.contracts.realEstateFractionalization.distributeDividends(
        propertyId,
        description,
        { value: ethers.parseEther(amount.toString()) }
      )
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Error distributing dividends:', error)
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
      const dividendIds = await this.contracts.realEstateFractionalization.getPropertyDividends(propertyId)
      const dividends = []

      for (const dividendId of dividendIds) {
        const dividend = await this.contracts.dividendDistributor.getDividend(dividendId)
        dividends.push({
          id: dividendId,
          ...dividend,
          totalAmountFormatted: ethers.formatEther(dividend.totalAmount),
          distributedAmountFormatted: ethers.formatEther(dividend.distributedAmount)
        })
      }

      return dividends
    } catch (error) {
      console.error('Error getting property dividends:', error)
      throw error
    }
  }

  // User Portfolio
  async getUserOwnershipInfo(userAddress, propertyId) {
    try {
      console.log('🔍 [DEBUG] Web3Service: Getting user ownership info for:', { userAddress, propertyId })
      console.log('🔍 [DEBUG] Web3Service: Contract address:', this.contracts.realEstateFractionalization.target)
      
      // Get fractional token address first
      const fractionalTokenAddress = await this.contracts.realEstateFractionalization.fractionalTokens(propertyId)
      console.log('🔍 [DEBUG] Web3Service: Fractional token address:', fractionalTokenAddress)
      
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
      console.log('🔍 [DEBUG] Web3Service: Direct balance from fractional token:', directBalance.toString())
      
      const [ownershipPercentage, sharesOwned, propertyValueOwned] = 
        await this.contracts.realEstateFractionalization.getUserOwnershipInfo(userAddress, propertyId)

      console.log('🔍 [DEBUG] Web3Service: Raw ownership data:', { ownershipPercentage, sharesOwned, propertyValueOwned })

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
      console.log('🔍 [DEBUG] Web3Service: Getting user portfolio for:', userAddress)
      
      const properties = await this.getAllProperties()
      console.log('🔍 [DEBUG] Web3Service: Found properties:', properties.length)
      
      const portfolio = []

      for (const property of properties) {
        try {
          console.log('🔍 [DEBUG] Web3Service: Checking ownership for property:', property.id)
          const ownership = await this.getUserOwnershipInfo(userAddress, property.id)
          console.log('🔍 [DEBUG] Web3Service: Ownership info:', ownership)
          
          if (parseFloat(ownership.sharesOwned) > 0) {
            // Get claimable dividends for this property
            let claimableDividends = 0
            try {
              const propertyDividends = await this.getPropertyDividends(property.id)
              console.log('🔍 [DEBUG] Web3Service: Property dividends:', propertyDividends)
              
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
            
            console.log('🔍 [DEBUG] Web3Service: Added to portfolio:', {
              id: property.id,
              name: property.name,
              sharesOwned: ownership.sharesOwned,
              claimableDividends
            })
          }
        } catch (error) {
          console.error(`❌ [ERROR] Web3Service: Error getting ownership for property ${property.id}:`, error)
        }
      }

      console.log('🔍 [DEBUG] Web3Service: Final portfolio:', portfolio)
      return portfolio
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Error getting user portfolio:', error)
      throw error
    }
  }

  // Admin Functions

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

  // Debug Functions
  async debugPropertyCreation(tokenId) {
    try {
      console.log('🔍 [DEBUG] Web3Service: Debugging property creation for tokenId:', tokenId)
      
      // Check if property exists
      const propertyExists = await this.contracts.propertyToken.propertyExists(tokenId)
      console.log('🔍 [DEBUG] Web3Service: Property exists:', propertyExists)
      
      if (propertyExists) {
        const property = await this.contracts.propertyToken.getProperty(tokenId)
        console.log('🔍 [DEBUG] Web3Service: Property details:', property)
        
        const fractionalTokenAddress = await this.contracts.realEstateFractionalization.fractionalTokens(tokenId)
        console.log('🔍 [DEBUG] Web3Service: Fractional token address:', fractionalTokenAddress)
        
        const isFractionalized = await this.contracts.realEstateFractionalization.isPropertyFractionalized(tokenId)
        console.log('🔍 [DEBUG] Web3Service: Is fractionalized:', isFractionalized)
        
        const propertyDetails = await this.contracts.realEstateFractionalization.getPropertyDetails(tokenId)
        console.log('🔍 [DEBUG] Web3Service: Full property details:', propertyDetails)
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
      console.log('🔍 [DEBUG] Web3Service: Getting shares sold count for tokenId:', tokenId)
      
      const fractionalTokenAddress = await this.contracts.realEstateFractionalization.fractionalTokens(tokenId)
      console.log('🔍 [DEBUG] Web3Service: Fractional token address:', fractionalTokenAddress)
      
      if (fractionalTokenAddress === '0x0000000000000000000000000000000000000000') {
        console.log('🔍 [DEBUG] Web3Service: No fractional token, returning 0')
        return 0
      }
      
      const fractionalToken = new ethers.Contract(
        fractionalTokenAddress,
        this.getFractionalTokenABI(),
        this.signer
      )
      
      const totalSupply = await fractionalToken.totalSupply()
      const contractBalance = await fractionalToken.balanceOf(fractionalTokenAddress)
      
      console.log('🔍 [DEBUG] Web3Service: Total supply:', totalSupply.toString())
      console.log('🔍 [DEBUG] Web3Service: Contract balance:', contractBalance.toString())
      
      // Calculate shares sold: total supply - contract balance
      const sharesSold = totalSupply - contractBalance
      const sharesSoldFormatted = Number(ethers.formatEther(sharesSold))
      
      console.log('🔍 [DEBUG] Web3Service: Shares sold:', sharesSoldFormatted)
      
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
      console.log('🔍 [DEBUG] Web3Service: Creating buy order...')
      console.log('🔍 [DEBUG] Web3Service: Property token ID:', propertyTokenId)
      console.log('🔍 [DEBUG] Web3Service: Fractional token address:', fractionalTokenAddress)
      console.log('🔍 [DEBUG] Web3Service: Shares:', shares)
      console.log('🔍 [DEBUG] Web3Service: Price per share:', pricePerShare)
      console.log('🔍 [DEBUG] Web3Service: Expires in:', expiresIn)
      
      const totalCost = BigInt(shares) * pricePerShare
      console.log('🔍 [DEBUG] Web3Service: Total cost:', totalCost)
      
      const tx = await this.contracts.tradingPlatform.createBuyOrder(
        propertyTokenId,
        fractionalTokenAddress,
        shares,
        pricePerShare,
        expiresIn,
        { value: totalCost }
      )
      
      console.log('🔍 [DEBUG] Web3Service: Buy order transaction:', tx.hash)
      const receipt = await tx.wait()
      console.log('🔍 [DEBUG] Web3Service: Buy order receipt:', receipt)
      
      return receipt
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Error creating buy order:', error)
      throw error
    }
  }

  async createSellOrder(propertyTokenId, fractionalTokenAddress, shares, pricePerShare, expiresIn) {
    try {
      console.log('🔍 [DEBUG] Web3Service: Creating sell order...')
      console.log('🔍 [DEBUG] Web3Service: Property token ID:', propertyTokenId)
      console.log('🔍 [DEBUG] Web3Service: Fractional token address:', fractionalTokenAddress)
      console.log('🔍 [DEBUG] Web3Service: Shares:', shares)
      console.log('🔍 [DEBUG] Web3Service: Price per share:', pricePerShare)
      console.log('🔍 [DEBUG] Web3Service: Expires in:', expiresIn)
      
      const tx = await this.contracts.tradingPlatform.createSellOrder(
        propertyTokenId,
        fractionalTokenAddress,
        shares,
        pricePerShare,
        expiresIn
      )
      
      console.log('🔍 [DEBUG] Web3Service: Sell order transaction:', tx.hash)
      const receipt = await tx.wait()
      console.log('🔍 [DEBUG] Web3Service: Sell order receipt:', receipt)
      
      return receipt
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Error creating sell order:', error)
      throw error
    }
  }

  async fillBuyOrder(orderId) {
    try {
      console.log('🔍 [DEBUG] Web3Service: Filling buy order:', orderId)
      
      const tx = await this.contracts.tradingPlatform.fillBuyOrder(orderId)
      console.log('🔍 [DEBUG] Web3Service: Fill buy order transaction:', tx.hash)
      const receipt = await tx.wait()
      console.log('🔍 [DEBUG] Web3Service: Fill buy order receipt:', receipt)
      
      return receipt
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Error filling buy order:', error)
      throw error
    }
  }

  async fillSellOrder(orderId, value) {
    try {
      console.log('🔍 [DEBUG] Web3Service: Filling sell order:', orderId)
      console.log('🔍 [DEBUG] Web3Service: Value:', value)
      
      const tx = await this.contracts.tradingPlatform.fillSellOrder(orderId, { value })
      console.log('🔍 [DEBUG] Web3Service: Fill sell order transaction:', tx.hash)
      const receipt = await tx.wait()
      console.log('🔍 [DEBUG] Web3Service: Fill sell order receipt:', receipt)
      
      return receipt
    } catch (error) {
      console.error('❌ [ERROR] Web3Service: Error filling sell order:', error)
      throw error
    }
  }

  async cancelOrder(orderId) {
    try {
      console.log('🔍 [DEBUG] Web3Service: Cancelling order:', orderId)
      
      const tx = await this.contracts.tradingPlatform.cancelOrder(orderId)
      console.log('🔍 [DEBUG] Web3Service: Cancel order transaction:', tx.hash)
      const receipt = await tx.wait()
      console.log('🔍 [DEBUG] Web3Service: Cancel order receipt:', receipt)
      
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

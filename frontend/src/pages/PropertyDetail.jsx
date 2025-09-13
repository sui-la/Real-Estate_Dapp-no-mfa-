import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import apiService from '../services/ApiService'
import TransactionService from '../services/TransactionService'
import toast from 'react-hot-toast'
import Comments from '../components/Comments'
import {
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarIcon,
  DocumentTextIcon,
  ShareIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

const PropertyDetail = () => {
  const { id } = useParams()
  const { web3Service, isConnected, formatEther } = useWeb3()
  const { isAuthenticated } = useAuth()
  const [property, setProperty] = useState(null)
  const [fractionalToken, setFractionalToken] = useState(null)
  const [userOwnership, setUserOwnership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sharesToBuy, setSharesToBuy] = useState(1)
  const [sharesToSell, setSharesToSell] = useState(1)
  const [isBuying, setIsBuying] = useState(false)
  const [isSelling, setIsSelling] = useState(false)
  const [isTradingEnabled, setIsTradingEnabled] = useState(false)

  useEffect(() => {
    if (id) {
      loadPropertyDetails()
    }
  }, [id, web3Service, isAuthenticated])

  const loadPropertyDetails = async () => {
    try {
      setLoading(true)

      // Load property details from database

      const propertyDetails = await apiService.getProperty(id)

      setProperty(propertyDetails)
      
      // Set trading status from database
      setIsTradingEnabled(propertyDetails.tradingEnabled || false)
      
      // Load user ownership information if user is connected and property has fractional token
      if (propertyDetails.fractionalTokenAddress && 
          propertyDetails.fractionalTokenAddress !== '0x0000000000000000000000000000000000000000' &&
          propertyDetails.tokenId !== null &&
          isAuthenticated && web3Service) {
        try {
          const userAddress = await web3Service.signer.getAddress()
          const ownership = await web3Service.getUserOwnershipInfo(userAddress, propertyDetails.tokenId)
          setUserOwnership(ownership)
        } catch (ownershipError) {
          console.error('❌ [ERROR] PropertyDetail: Error loading user ownership:', ownershipError)
          console.error('❌ [ERROR] PropertyDetail: Error details:', ownershipError.message)
          setUserOwnership(null)
        }
      }

    } catch (error) {
      console.error('❌ [ERROR] PropertyDetail: Error loading property details:', error)
      toast.error('Failed to load property details')
    } finally {
      setLoading(false)
    }
  }

  const handleBuyShares = async () => {
    if (!isAuthenticated || !web3Service) {
      toast.error('Please connect your wallet')
      return
    }

    if (!property || property.tokenId === null) {
      toast.error('Property is not fractionalized yet')
      return
    }

    // Check if property is sold out
    const available = property.totalShares - property.sharesSold
    if (available <= 0) {
      toast.error('This property is sold out!')
      return
    }

    // Check if trying to buy more than available
    if (sharesToBuy > available) {
      toast.error(`Only ${available} shares available`)
      return
    }

    try {
      setIsBuying(true)

      const receipt = await web3Service.purchaseShares(property.tokenId, sharesToBuy)

      // Track the buy transaction
      try {
        const pricePerShare = property.totalValue / property.totalShares
        await TransactionService.trackBuyTransaction({
          propertyId: property._id,
          shares: sharesToBuy,
          pricePerShare: pricePerShare,
          totalAmount: sharesToBuy * pricePerShare,
          transactionHash: receipt?.hash,
          blockNumber: receipt?.blockNumber,
          gasUsed: receipt?.gasUsed?.toString(),
          gasFee: (receipt?.gasUsed * receipt?.gasPrice)?.toString(),
          fromAddress: receipt?.from,
          toAddress: receipt?.to
        })
      } catch (trackingError) {
        console.warn('Failed to track buy transaction:', trackingError)
      }

      toast.success(`Successfully purchased ${sharesToBuy} shares!`)
      
      // Wait a moment for blockchain state to update
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Get updated shares sold count from blockchain
      try {

        const sharesSoldCount = await web3Service.getSharesSoldCount(property.tokenId)

        // Update database with new shares sold count
        await apiService.updateSharesSold(property._id, sharesSoldCount)

      } catch (updateError) {
        console.error('❌ [ERROR] PropertyDetail: Error updating shares sold count:', updateError)
        // Continue anyway, the purchase was successful
      }
      
      // Reload data

      await loadPropertyDetails()
      
    } catch (error) {
      console.error('❌ [ERROR] PropertyDetail: Error buying shares:', error)
      toast.error('Failed to purchase shares')
    } finally {
      setIsBuying(false)
    }
  }

  const handleSellShares = async () => {
    if (!isAuthenticated || !web3Service) {
      toast.error('Please connect your wallet')
      return
    }

    if (!property || property.tokenId === null) {
      toast.error('Property is not fractionalized yet')
      return
    }

    try {
      setIsSelling(true)
      
      const receipt = await web3Service.sellShares(property.tokenId, sharesToSell)
      
      // Track the sell transaction
      try {
        const pricePerShare = property.totalValue / property.totalShares
        await TransactionService.trackSellTransaction({
          propertyId: property._id,
          shares: sharesToSell,
          pricePerShare: pricePerShare,
          totalAmount: sharesToSell * pricePerShare,
          transactionHash: receipt?.hash,
          blockNumber: receipt?.blockNumber,
          gasUsed: receipt?.gasUsed?.toString(),
          gasFee: (receipt?.gasUsed * receipt?.gasPrice)?.toString(),
          fromAddress: receipt?.from,
          toAddress: receipt?.to
        })
      } catch (trackingError) {
        console.warn('Failed to track sell transaction:', trackingError)
      }
      
      toast.success(`Successfully sold ${sharesToSell} shares!`)
      
      // Reload data
      await loadPropertyDetails()
      
    } catch (error) {
      console.error('Error selling shares:', error)
      toast.error('Failed to sell shares')
    } finally {
      setIsSelling(false)
    }
  }

  const getAvailabilityStatus = () => {
    if (!property || !property.totalShares || !property.sharesSold) {
      return { status: 'Unknown', color: 'bg-gray-100 text-gray-800' }
    }
    
    const percentageSold = (Number(property.sharesSold) / Number(property.totalShares)) * 100
    
    if (percentageSold >= 100) {
      return { status: 'Sold Out', color: 'bg-red-100 text-red-800' }
    } else if (percentageSold >= 80) {
      return { status: 'Almost Full', color: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { status: 'Available', color: 'bg-green-100 text-green-800' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Property not found</h3>
        <p className="mt-1 text-sm text-gray-500">The property you're looking for doesn't exist.</p>
      </div>
    )
  }

  const availability = getAvailabilityStatus()
  const availableShares = property && property.totalShares 
    ? Number(property.totalShares) - Number(property.sharesSold || 0) 
    : 0
  const percentageSold = property && property.totalShares 
    ? (Number(property.sharesSold || 0) / Number(property.totalShares)) * 100 
    : 0
  const sharePrice = property && property.totalShares && property.totalValue && property.totalShares > 0
    ? Number(property.totalValue) / Number(property.totalShares)
    : 0

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => window.history.back()}
        className="flex items-center text-gray-600 hover:text-gray-900"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-2" />
        Back to Properties
      </button>

      {/* Property Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="aspect-w-16 aspect-h-9">
          <img
            src={property.imageUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'}
            alt={property.name}
            className="w-full h-64 md:h-96 object-cover"
          />
        </div>
        
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{property.name || 'Unnamed Property'}</h1>
              <div className="flex items-center text-gray-600 mt-2">
                <MapPinIcon className="h-5 w-5 mr-2" />
                <span>{property.location || 'Unknown Location'}</span>
              </div>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${availability.color}`}>
              {availability.status}
            </span>
          </div>

          <p className="text-lg text-gray-700 mb-6">{property.description || 'No description available'}</p>

          {/* Property Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${property.totalValue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${property.totalShares > 0 ? (property.totalValue / property.totalShares).toLocaleString() : '0'}
              </div>
              <div className="text-sm text-gray-600">Share Price</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {property.totalShares ? Number(property.totalShares).toLocaleString() : '0'}
              </div>
              <div className="text-sm text-gray-600">Total Shares</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${availableShares <= 0 ? 'text-red-600' : 'text-orange-600'}`}>
                {availableShares <= 0 ? '0' : availableShares.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shares Sold</span>
              <span className="font-medium text-gray-900">
                {Number(property.sharesSold).toLocaleString()} / {Number(property.totalShares).toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(percentageSold, 100)}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-500">
              {percentageSold.toFixed(1)}% sold
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Investment Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Buy Shares */}
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Purchase Shares</h3>
            
            {!isTradingEnabled && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800">
                      {property && property.tokenId === null 
                        ? 'This property has not been fractionalized yet. Trading will be available once the property owner completes the fractionalization process.'
                        : 'Trading is currently disabled for this property. The admin needs to enable trading before shares can be purchased.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Shares
                </label>
                <input
                  type="number"
                  min="1"
                  max={Math.max(0, availableShares)}
                  value={sharesToBuy}
                  onChange={(e) => setSharesToBuy(parseInt(e.target.value) || 1)}
                  className="input-field"
                  disabled={availableShares <= 0}
                />
                <p className={`text-sm mt-1 ${availableShares <= 0 ? 'text-red-500' : 'text-gray-500'}`}>
                  {availableShares <= 0 
                    ? 'Sold Out - No shares available' 
                    : `Available: ${availableShares.toLocaleString()} shares`
                  }
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Share Price:</span>
                  <span className="font-medium">${sharePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-semibold text-lg">
                    ${(sharePrice * sharesToBuy).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={handleBuyShares}
                disabled={!isAuthenticated || isBuying || availableShares <= 0 || !isTradingEnabled}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!isTradingEnabled 
                  ? 'Trading Disabled' 
                  : availableShares <= 0 
                    ? 'Sold Out' 
                    : isBuying 
                      ? 'Processing...' 
                      : 'Buy Shares'
                }
              </button>
            </div>
          </div>

          {/* Sell Shares */}
          {userOwnership && userOwnership.shares > 0 && (
            <div className="card">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Sell Your Shares</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Shares to Sell
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={parseInt(formatEther(userOwnership.shares))}
                    value={sharesToSell}
                    onChange={(e) => setSharesToSell(parseInt(e.target.value) || 1)}
                    className="input-field"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    You own: {parseInt(formatEther(userOwnership.shares)).toLocaleString()} shares
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Share Price:</span>
                    <span className="font-medium">${sharePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">You'll Receive:</span>
                    <span className="font-semibold text-lg">
                      ${(sharePrice * sharesToSell).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSellShares}
                  disabled={!isAuthenticated || isSelling}
                  className="w-full btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSelling ? 'Processing...' : 'Sell Shares'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Your Ownership */}
          {userOwnership && userOwnership.shares > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Ownership</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Shares Owned:</span>
                  <span className="font-medium">
                    {parseInt(formatEther(userOwnership.shares)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ownership %:</span>
                  <span className="font-medium">
                    {(userOwnership.percentage / 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Property Value:</span>
                  <span className="font-medium">
                    ${parseFloat(formatEther(userOwnership.value)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* User Ownership Section */}
          {isAuthenticated && userOwnership && parseFloat(userOwnership.sharesOwned) > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Ownership</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Shares Owned:</span>
                  <span className="font-medium">
                    {parseFloat(userOwnership.sharesOwned).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ownership Percentage:</span>
                  <span className="font-medium">
                    {(userOwnership.ownershipPercentage / 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Property Value Owned:</span>
                  <span className="font-medium">
                    ${parseFloat(userOwnership.propertyValueOwned).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">
                  View all your investments in your portfolio:
                </p>
                <Link to="/portfolio" className="btn-primary">
                  View Portfolio
                </Link>
              </div>
            </div>
          )}

          {/* Property Details */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
            
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                <span className="text-gray-600">Listed:</span>
                <span className="ml-auto font-medium">
                  {property.createdAt ? new Date(property.createdAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <BuildingOfficeIcon className="h-4 w-4 mr-2 text-gray-400" />
                <span className="text-gray-600">Owner:</span>
                <span className="ml-auto font-medium">
                  {property.originalOwner ? 
                    (typeof property.originalOwner === 'string' 
                      ? `${property.originalOwner.slice(0, 6)}...${property.originalOwner.slice(-4)}`
                      : property.originalOwner.name || property.originalOwner.walletAddress || 'Unknown'
                    ) : 'Unknown'}
                </span>
              </div>
            </div>

            {property.documents && property.documents.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Documents</h4>
                <div className="space-y-1">
                  {property.documents.map((doc, index) => (
                    <a
                      key={index}
                      href={doc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                      Document {index + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="space-y-2">
              <button className="w-full btn-secondary">
                <ShareIcon className="h-4 w-4 mr-2" />
                Share Property
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <Comments propertyId={property.tokenId} />
    </div>
  )
}

export default PropertyDetail

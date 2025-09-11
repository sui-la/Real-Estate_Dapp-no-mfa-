import React, { useState, useEffect } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import apiService from '../services/ApiService'
import toast from 'react-hot-toast'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  EyeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

const Trading = () => {
  const { contracts, isConnected, formatEther, parseEther, web3Service, account } = useWeb3()
  const { isAuthenticated } = useAuth()
  
  const [orders, setOrders] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [showCreateOrder, setShowCreateOrder] = useState(false)
  const [orderType, setOrderType] = useState('buy') // 'buy' or 'sell'
  const [selectedProperty, setSelectedProperty] = useState('')
  const [shares, setShares] = useState(1)
  const [pricePerShare, setPricePerShare] = useState('')
  const [expiresIn, setExpiresIn] = useState(7) // days
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [userOwnership, setUserOwnership] = useState({})

  useEffect(() => {
    if (isConnected && web3Service && isAuthenticated) {
      loadData()
    }
  }, [isConnected, web3Service, isAuthenticated])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load properties from database
      const propertiesResponse = await apiService.getProperties({ limit: 1000 }) // Get all properties
      const propertiesList = propertiesResponse.properties || []
      setProperties(propertiesList)
      
      // Load orders from blockchain
      await loadOrders()
      
      // Load user ownership data
      await loadUserOwnership(propertiesList)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadUserOwnership = async (propertiesList = properties) => {
    if (!account || !web3Service) return

    try {
      const ownershipMap = {}
      
      for (const property of propertiesList) {
        if (property.tokenId) {
          try {
            const ownership = await web3Service.getUserOwnershipInfo(account, property.tokenId)
            ownershipMap[property.tokenId] = ownership
            console.log(`💼 Ownership for ${property.name}:`, ownership.sharesOwned, 'shares')
          } catch (error) {
            console.warn(`Could not get ownership for property ${property.tokenId}:`, error.message)
            ownershipMap[property.tokenId] = { sharesOwned: '0' }
          }
        }
      }
      
      setUserOwnership(ownershipMap)
    } catch (error) {
      console.error('Error loading user ownership:', error)
    }
  }

  const loadOrders = async () => {
    try {
      if (!web3Service || !contracts.propertyToken) {
        console.log('Web3Service or contracts not available')
        return
      }

      // Get total number of properties - handle case where no properties exist
      let totalProperties = 0
      try {
        totalProperties = await contracts.propertyToken.getTotalProperties()
      } catch (error) {
        // If getTotalProperties fails, it likely means no properties exist yet
        console.log('No properties found or contract not initialized')
        setOrders([])
        return
      }

      // If no properties exist, return empty orders
      if (totalProperties === 0) {
        console.log('No properties found, returning empty orders')
        setOrders([])
        return
      }

      console.log(`🔍 Loading orders for ${totalProperties} properties...`)
      const allOrders = []

      // Load orders for each property
      for (let i = 1; i <= totalProperties; i++) {
        try {
          const propertyOrders = await contracts.tradingPlatform.getActiveOrders(i)
          
          for (const orderId of propertyOrders) {
            const order = await contracts.tradingPlatform.getOrder(orderId)
            console.log(`📋 Order ${orderId}:`, order)
            
            if (order.isActive) {
              // Convert BigInt values to strings for JSON serialization and UI display
              const processedOrder = {
                id: orderId.toString(),
                orderId: order.orderId.toString(),
                seller: order.seller,
                buyer: order.buyer,
                propertyTokenId: i, // Use the property we're iterating over
                fractionalTokenAddress: order.fractionalTokenAddress,
                shares: order.shares.toString(),
                pricePerShare: order.pricePerShare.toString(),
                isBuyOrder: order.isBuyOrder,
                isActive: order.isActive,
                createdAt: order.createdAt.toString(),
                expiresAt: order.expiresAt.toString(),
              }
              
              console.log('✅ Processed order:', processedOrder)
              allOrders.push(processedOrder)
            }
          }
        } catch (error) {
          // Silently skip properties that don't exist or have no orders
          console.log(`No orders found for property ${i}`)
        }
      }

      console.log(`✅ Loaded ${allOrders.length} total orders`)
      setOrders(allOrders)
    } catch (error) {
      console.error('Error loading orders:', error)
      // Don't show error toast for empty data scenarios
      if (!error.message.includes('missing revert data') && !error.message.includes('CALL_EXCEPTION')) {
        toast.error('Failed to load orders')
      }
    }
  }

  const fillOrder = async (orderId, isBuyOrder) => {
    try {
      console.log('🔄 Filling order:', orderId, 'isBuyOrder:', isBuyOrder)
      
      if (isBuyOrder) {
        await web3Service.fillBuyOrder(orderId)
      } else {
        // For sell orders, we need to send ETH to buy the shares
        const order = orders.find(o => o.id === orderId.toString())
        
        if (!order) {
          console.error('❌ Order not found. Available orders:', orders.map(o => ({ id: o.id, orderId: o.orderId })))
          throw new Error(`Order with ID ${orderId} not found`)
        }
        
        console.log('📋 Found order:', order)
        
        // Safely convert to BigInt
        const shares = BigInt(order.shares)
        const pricePerShare = BigInt(order.pricePerShare)
        const totalCost = shares * pricePerShare
        
        console.log('💰 Total cost:', totalCost.toString(), 'wei')
        
        await web3Service.fillSellOrder(orderId, totalCost)
      }
      
      toast.success('Order filled successfully!')
      await loadOrders() // Reload orders
      
    } catch (error) {
      console.error('Error filling order:', error)
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to fill order'
      
      if (error.message.includes('Cannot buy your own order')) {
        errorMessage = 'You cannot fill your own order. Use "Cancel Order" instead.'
      } else if (error.message.includes('Insufficient shares')) {
        errorMessage = 'You don\'t have enough shares to fill this buy order.'
      } else if (error.message.includes('Insufficient payment')) {
        errorMessage = 'You don\'t have enough ETH to buy these shares.'
      } else if (error.message.includes('Order has expired')) {
        errorMessage = 'This order has expired and can no longer be filled.'
      } else if (error.message.includes('Order is not active')) {
        errorMessage = 'This order is no longer active.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    }
  }

  const cancelOrder = async (orderId) => {
    console.log('🚫 cancelOrder function called with:', orderId)
    console.log('🔍 Type of orderId:', typeof orderId)
    
    try {
      console.log('🚫 Attempting to cancel order:', orderId)
      
      // Ensure orderId is a number or string that can be converted to BigInt
      const orderIdToCancel = typeof orderId === 'string' ? orderId : orderId.toString()
      console.log('📝 Converted order ID:', orderIdToCancel)
      
      await web3Service.cancelOrder(orderIdToCancel)
      
      toast.success('Order cancelled successfully!')
      await loadOrders() // Reload orders
      
    } catch (error) {
      console.error('❌ Error cancelling order:', error)
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        data: error.data
      })
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to cancel order'
      
      if (error.message.includes('Not authorized')) {
        errorMessage = 'You are not authorized to cancel this order.'
      } else if (error.message.includes('Order is not active')) {
        errorMessage = 'This order is no longer active and cannot be cancelled.'
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was cancelled by user.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    }
  }

  const createOrder = async () => {
    try {
      setCreatingOrder(true)
      
      if (!selectedProperty || !pricePerShare || shares <= 0) {
        toast.error('Please fill in all fields')
        return
      }

      const property = properties.find(p => p._id === selectedProperty)
      if (!property || !property.fractionalTokenAddress) {
        toast.error('Property not found or not fractionalized')
        return
      }

      // Validate sell order - check if user has enough shares
      if (orderType === 'sell') {
        const ownership = property.tokenId ? userOwnership[property.tokenId] : null
        const availableShares = ownership ? parseFloat(ownership.sharesOwned) : 0
        
        if (availableShares <= 0) {
          toast.error('You don\'t own any shares of this property')
          return
        }
        
        if (shares > availableShares) {
          toast.error(`You only have ${availableShares.toFixed(2)} shares available`)
          return
        }
      }

      const priceInWei = parseEther(pricePerShare)
      const expiresInSeconds = expiresIn * 24 * 60 * 60 // Convert days to seconds

      if (orderType === 'buy') {
        await web3Service.createBuyOrder(
          property.tokenId,
          property.fractionalTokenAddress,
          shares,
          priceInWei,
          expiresInSeconds
        )
      } else {
        await web3Service.createSellOrder(
          property.tokenId,
          property.fractionalTokenAddress,
          shares,
          priceInWei,
          expiresInSeconds
        )
      }

      toast.success(`${orderType === 'buy' ? 'Buy' : 'Sell'} order created successfully!`)
      setShowCreateOrder(false)
      await loadOrders() // Reload orders
      
      // Reset form
      setSelectedProperty('')
      setShares(1)
      setPricePerShare('')
      setExpiresIn(7)
      
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Failed to create order')
    } finally {
      setCreatingOrder(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    switch (activeTab) {
      case 'buy':
        return order.isBuyOrder
      case 'sell':
        return !order.isBuyOrder
      default:
        return true
    }
  })

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Please connect your wallet</h3>
        <p className="mt-1 text-sm text-gray-500">Connect your wallet to access the trading platform.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Trading Platform</h1>
        <p className="mt-2 text-lg text-gray-600">
          Buy and sell fractional shares of real estate properties
        </p>
        
        {/* Info Box */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">How Trading Works:</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Create Order:</strong> List your shares for sale or place a buy order</p>
            <p><strong>Fill Order:</strong> Buy shares from someone else's sell order (or sell to their buy order)</p>
            <p><strong>Your Orders:</strong> Orders you created show "Your order" and only have a Cancel button</p>
            <p><strong>Other Orders:</strong> Orders from other users show "Fill Order" to complete the trade</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { name: 'All Orders', value: 'all' },
              { name: 'Buy Orders', value: 'buy' },
              { name: 'Sell Orders', value: 'sell' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.value
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Create Order Button */}
        <div className="p-6">
          <button
            onClick={() => setShowCreateOrder(!showCreateOrder)}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Create Order</span>
          </button>
        </div>
      </div>

      {/* Create Order Form */}
      {showCreateOrder && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Order</h3>
          
          <div className="space-y-4">
            {/* Order Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="buy"
                    checked={orderType === 'buy'}
                    onChange={(e) => setOrderType(e.target.value)}
                    className="mr-2"
                  />
                  Buy Order
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="sell"
                    checked={orderType === 'sell'}
                    onChange={(e) => setOrderType(e.target.value)}
                    className="mr-2"
                  />
                  Sell Order
                </label>
              </div>
            </div>

            {/* Property Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property
              </label>
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="input-field"
              >
                <option value="">
                  {orderType === 'sell' ? 'Select a property you own' : 'Select a property'}
                </option>
                {(() => {
                  const filteredProperties = properties.filter(p => {
                    // For buy orders, show all properties with tokenId and fractionalTokenAddress
                    if (orderType === 'buy') {
                      return p.tokenId !== null && p.fractionalTokenAddress
                    }
                    // For sell orders, only show properties where user owns shares
                    if (orderType === 'sell') {
                      const ownership = p.tokenId ? userOwnership[p.tokenId] : null
                      const availableShares = ownership ? parseFloat(ownership.sharesOwned) : 0
                      return p.tokenId !== null && p.fractionalTokenAddress && availableShares > 0
                    }
                    return false
                  })

                  if (orderType === 'sell' && filteredProperties.length === 0) {
                    return (
                      <option value="" disabled>
                        No properties owned - Purchase shares first
                      </option>
                    )
                  }

                  return filteredProperties.map((property) => {
                    const ownership = property.tokenId ? userOwnership[property.tokenId] : null
                    const availableShares = ownership ? parseFloat(ownership.sharesOwned) : 0
                    
                    return (
                      <option key={property._id} value={property._id}>
                        {property.name} - {property.location}
                        {orderType === 'sell' && ` (${availableShares.toFixed(2)} shares)`}
                      </option>
                    )
                  })
                })()}
              </select>
            </div>

            {/* Shares */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Shares
                {orderType === 'sell' && selectedProperty && (() => {
                  const property = properties.find(p => p._id === selectedProperty)
                  const ownership = property?.tokenId ? userOwnership[property.tokenId] : null
                  const availableShares = ownership ? parseFloat(ownership.sharesOwned) : 0
                  return (
                    <span className="ml-2 text-sm text-gray-500">
                      (Available: {availableShares.toFixed(2)} shares)
                    </span>
                  )
                })()}
              </label>
              <input
                type="number"
                min="1"
                max={orderType === 'sell' && selectedProperty ? (() => {
                  const property = properties.find(p => p._id === selectedProperty)
                  const ownership = property?.tokenId ? userOwnership[property.tokenId] : null
                  return ownership ? Math.floor(parseFloat(ownership.sharesOwned)) : 1
                })() : undefined}
                value={shares}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1
                  if (orderType === 'sell' && selectedProperty) {
                    const property = properties.find(p => p._id === selectedProperty)
                    const ownership = property?.tokenId ? userOwnership[property.tokenId] : null
                    const maxShares = ownership ? Math.floor(parseFloat(ownership.sharesOwned)) : 0
                    setShares(Math.min(value, maxShares))
                  } else {
                    setShares(value)
                  }
                }}
                className={`input-field ${
                  orderType === 'sell' && selectedProperty && (() => {
                    const property = properties.find(p => p._id === selectedProperty)
                    const ownership = property?.tokenId ? userOwnership[property.tokenId] : null
                    const availableShares = ownership ? parseFloat(ownership.sharesOwned) : 0
                    return shares > availableShares ? 'border-red-500' : ''
                  })()
                }`}
              />
              {orderType === 'sell' && selectedProperty && (() => {
                const property = properties.find(p => p._id === selectedProperty)
                const ownership = property?.tokenId ? userOwnership[property.tokenId] : null
                const availableShares = ownership ? parseFloat(ownership.sharesOwned) : 0
                if (shares > availableShares) {
                  return (
                    <p className="mt-1 text-sm text-red-600">
                      You only have {availableShares.toFixed(2)} shares available
                    </p>
                  )
                }
                return null
              })()}
            </div>

            {/* Price Per Share */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Per Share (ETH)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={pricePerShare}
                onChange={(e) => setPricePerShare(e.target.value)}
                className="input-field"
                placeholder="0.01"
              />
            </div>

            {/* Expiration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expires In (Days)
              </label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(parseInt(e.target.value))}
                className="input-field"
              >
                <option value={1}>1 Day</option>
                <option value={3}>3 Days</option>
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
              </select>
            </div>

            {/* Total Cost Display */}
            {pricePerShare && shares > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-semibold text-lg">
                    {(parseFloat(pricePerShare) * shares).toFixed(4)} ETH
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={createOrder}
                disabled={creatingOrder || !selectedProperty || !pricePerShare}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingOrder ? 'Creating...' : `Create ${orderType === 'buy' ? 'Buy' : 'Sell'} Order`}
              </button>
              <button
                onClick={() => setShowCreateOrder(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'all' 
              ? 'No active orders available' 
              : `No ${activeTab} orders available`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    order.isBuyOrder 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {order.isBuyOrder ? (
                      <>
                        <ArrowUpIcon className="h-4 w-4 mr-1" />
                        Buy Order
                      </>
                    ) : (
                      <>
                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                        Sell Order
                      </>
                    )}
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Property #{order.propertyTokenId}
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.shares} shares @ {(() => {
                        try {
                          return formatEther(order.pricePerShare)
                        } catch (error) {
                          console.error('Error formatting price per share:', error)
                          return '0.0'
                        }
                      })()} ETH each
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {(() => {
                        try {
                          if (order.shares && order.pricePerShare) {
                            const shares = typeof order.shares === 'string' ? order.shares : order.shares.toString()
                            const pricePerShare = typeof order.pricePerShare === 'string' ? order.pricePerShare : order.pricePerShare.toString()
                            return formatEther(BigInt(shares) * BigInt(pricePerShare))
                          }
                          return '0.0'
                        } catch (error) {
                          console.error('Error calculating total value:', error)
                          return '0.0'
                        }
                      })()} ETH
                    </div>
                    <div className="text-sm text-gray-500">
                      Total Value
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Check if this is the user's own order */}
                    {(() => {
                      const isUserOrder = (order.isBuyOrder && order.buyer?.toLowerCase() === account?.toLowerCase()) ||
                                         (!order.isBuyOrder && order.seller?.toLowerCase() === account?.toLowerCase())
                      console.log('🔍 Ownership check for order', order.id, {
                        isBuyOrder: order.isBuyOrder,
                        orderBuyer: order.buyer?.toLowerCase(),
                        orderSeller: order.seller?.toLowerCase(),
                        currentAccount: account?.toLowerCase(),
                        isUserOrder,
                        'Will show cancel button': isUserOrder
                      })
                      return isUserOrder
                    })() ? (
                      // User's own order - only show cancel button
                      <>
                        <button
                          onClick={() => {
                            console.log('🖱️ Cancel button clicked for order:', order.id)
                            console.log('📋 Full order object:', order)
                            cancelOrder(order.id)
                          }}
                          className="btn-secondary"
                        >
                          Cancel Order
                        </button>
                        <span className="text-sm text-gray-500 italic">Your order</span>
                      </>
                    ) : (
                      // Other user's order - show fill button
                      <>
                        <button
                          onClick={() => fillOrder(order.id, order.isBuyOrder)}
                          className="btn-primary"
                        >
                          {order.isBuyOrder ? 'Sell Order' : 'Fill Order'}
                        </button>
                        <button
                          onClick={() => cancelOrder(order.id)}
                          className="btn-secondary"
                          title="Only order creator can cancel"
                          disabled
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    <span>
                      Expires: {new Date(order.expiresAt * 1000).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    Order ID: #{order.id}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trading Stats */}
      {orders.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
              <div className="text-sm text-gray-600">Total Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {orders.filter(o => o.isBuyOrder).length}
              </div>
              <div className="text-sm text-gray-600">Buy Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {orders.filter(o => !o.isBuyOrder).length}
              </div>
              <div className="text-sm text-gray-600">Sell Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {orders.length > 0 ? formatEther(orders.reduce((sum, o) => {
                  try {
                    // Ensure values exist and are valid before converting to BigInt
                    if (o.shares && o.pricePerShare) {
                      const shares = typeof o.shares === 'string' ? o.shares : o.shares.toString()
                      const pricePerShare = typeof o.pricePerShare === 'string' ? o.pricePerShare : o.pricePerShare.toString()
                      return sum + (BigInt(shares) * BigInt(pricePerShare))
                    }
                    return sum
                  } catch (error) {
                    console.error('Error calculating order volume for order:', o, error)
                    return sum
                  }
                }, 0n)) : '0'} ETH
              </div>
              <div className="text-sm text-gray-600">Total Volume</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Trading

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
  const { contracts, isConnected, formatEther, parseEther, web3Service } = useWeb3()
  const { isAuthenticated, account } = useAuth()
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

  useEffect(() => {
    if (isConnected && web3Service && isAuthenticated) {
      loadData()
    }
  }, [isConnected, web3Service, isAuthenticated])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load properties from database
      const propertiesResponse = await apiService.getProperties()
      setProperties(propertiesResponse.properties || [])
      
      // Load orders from blockchain
      await loadOrders()
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async () => {
    try {
      if (!web3Service || !contracts.propertyToken) {
        console.log('Web3Service or contracts not available')
        return
      }

      // Get total number of properties
      const totalProperties = await contracts.propertyToken.getTotalProperties()
      const allOrders = []

      // Load orders for each property
      for (let i = 1; i <= totalProperties; i++) {
        try {
          const propertyOrders = await contracts.realEstateFractionalization.getActiveOrders(i)
          
          for (const orderId of propertyOrders) {
            const order = await contracts.tradingPlatform.getOrder(orderId)
            if (order.isActive) {
              allOrders.push({
                id: orderId,
                ...order,
                propertyTokenId: i,
              })
            }
          }
        } catch (error) {
          console.error(`Error loading orders for property ${i}:`, error)
        }
      }

      setOrders(allOrders)
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('Failed to load orders')
    }
  }

  const fillOrder = async (orderId, isBuyOrder) => {
    try {
      if (isBuyOrder) {
        await web3Service.fillBuyOrder(orderId)
      } else {
        // For sell orders, we need to send ETH to buy the shares
        const order = orders.find(o => o.id === orderId)
        const totalCost = BigInt(order.shares) * BigInt(order.pricePerShare)
        await web3Service.fillSellOrder(orderId, totalCost)
      }
      
      toast.success('Order filled successfully!')
      await loadOrders() // Reload orders
      
    } catch (error) {
      console.error('Error filling order:', error)
      toast.error('Failed to fill order')
    }
  }

  const cancelOrder = async (orderId) => {
    try {
      await web3Service.cancelOrder(orderId)
      
      toast.success('Order cancelled successfully!')
      await loadOrders() // Reload orders
      
    } catch (error) {
      console.error('Error cancelling order:', error)
      toast.error('Failed to cancel order')
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
                <option value="">Select a property</option>
                {properties
                  .filter(p => p.tokenId !== null && p.fractionalTokenAddress)
                  .map((property) => (
                    <option key={property._id} value={property._id}>
                      {property.name} - {property.location}
                    </option>
                  ))}
              </select>
            </div>

            {/* Shares */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Shares
              </label>
              <input
                type="number"
                min="1"
                value={shares}
                onChange={(e) => setShares(parseInt(e.target.value) || 1)}
                className="input-field"
              />
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
                      {order.shares} shares @ {formatEther(order.pricePerShare)} ETH each
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatEther(order.shares * order.pricePerShare)} ETH
                    </div>
                    <div className="text-sm text-gray-500">
                      Total Value
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => fillOrder(order.id, order.isBuyOrder)}
                      className="btn-primary"
                    >
                      Fill Order
                    </button>
                    <button
                      onClick={() => cancelOrder(order.id)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
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
                    return sum + (BigInt(o.shares) * BigInt(o.pricePerShare))
                  } catch (error) {
                    console.error('Error calculating order volume:', error)
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

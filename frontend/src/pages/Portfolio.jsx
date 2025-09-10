import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import apiService from '../services/ApiService'
import toast from 'react-hot-toast'
import {
  BuildingOfficeIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline'

const Portfolio = () => {
  const { web3Service, isConnected, account } = useWeb3()
  const { isAuthenticated } = useAuth()
  const [portfolio, setPortfolio] = useState([])
  const [totalValue, setTotalValue] = useState(0)
  const [totalDividends, setTotalDividends] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isConnected && web3Service && isAuthenticated && account) {
      loadPortfolio()
    }
  }, [isConnected, web3Service, isAuthenticated, account])

  const loadPortfolio = async () => {
    try {
      setLoading(true)
      
      if (!web3Service || !account) {
        toast.error('Web3 service not initialized or wallet not connected')
        return
      }

      console.log('🔍 [DEBUG] Portfolio: Loading portfolio for account:', account)

      // Get all properties from database
      const response = await apiService.getProperties()
      const allProperties = response.properties
      console.log('🔍 [DEBUG] Portfolio: Found properties from database:', allProperties.length)

      const portfolioItems = []

      // Check ownership for each property
      for (const property of allProperties) {
        try {
          // Only check properties that are fractionalized
          if (property.tokenId !== null && property.fractionalTokenAddress) {
            console.log('🔍 [DEBUG] Portfolio: Checking ownership for property:', property.name, 'tokenId:', property.tokenId)
            
            const ownership = await web3Service.getUserOwnershipInfo(account, property.tokenId)
            console.log('🔍 [DEBUG] Portfolio: Ownership info:', ownership)
            console.log('🔍 [DEBUG] Portfolio: Shares owned (raw):', ownership.sharesOwned)
            console.log('🔍 [DEBUG] Portfolio: Shares owned (parsed):', parseFloat(ownership.sharesOwned))
            
            if (parseFloat(ownership.sharesOwned) > 0) {
              // Get claimable dividends for this property
              let claimableDividends = 0
              try {
                const propertyDividends = await web3Service.getPropertyDividends(property.tokenId)
                console.log('🔍 [DEBUG] Portfolio: Property dividends:', propertyDividends)
                
                for (const dividend of propertyDividends) {
                  const claimable = await web3Service.getClaimableDividend(account, dividend.id)
                  claimableDividends += parseFloat(claimable)
                }
              } catch (dividendError) {
                console.error('❌ [ERROR] Portfolio: Error getting dividends for property:', property.tokenId, dividendError)
              }
              
              portfolioItems.push({
                id: property._id,
                tokenId: property.tokenId,
                name: property.name,
                description: property.description,
                location: property.location,
                imageUrl: property.imageUrl,
                totalValue: property.totalValue,
                totalShares: property.totalShares,
                ...ownership,
                claimableDividends: claimableDividends.toString()
              })
              
              console.log('🔍 [DEBUG] Portfolio: Added to portfolio:', {
                id: property._id,
                name: property.name,
                sharesOwned: ownership.sharesOwned,
                claimableDividends
              })
            }
          }
        } catch (error) {
          console.error(`❌ [ERROR] Portfolio: Error checking ownership for property ${property.name}:`, error)
        }
      }

      console.log('🔍 [DEBUG] Portfolio: Final portfolio items:', portfolioItems.length)
      setPortfolio(portfolioItems)

      // Calculate totals
      const totalPortfolioValue = portfolioItems.reduce((sum, item) => sum + (parseFloat(item.propertyValueOwned) || 0), 0)
      setTotalValue(totalPortfolioValue)

      // Get total claimable dividends
      const totalClaimableDividends = portfolioItems.reduce((sum, item) => sum + (parseFloat(item.claimableDividends) || 0), 0)
      setTotalDividends(totalClaimableDividends)

    } catch (error) {
      console.error('❌ [ERROR] Portfolio: Error loading portfolio:', error)
      toast.error('Failed to load portfolio')
    } finally {
      setLoading(false)
    }
  }

  const claimAllDividends = async () => {
    try {
      // Get all dividend IDs for properties in portfolio
      const dividendIds = []
      
      for (const item of portfolio) {
        const propertyDividends = await web3Service.getPropertyDividends(item.id)
        dividendIds.push(...propertyDividends.map(d => d.id))
      }

      if (dividendIds.length === 0) {
        toast.error('No dividends to claim')
        return
      }

      await web3Service.batchClaimDividends(dividendIds)
      toast.success('Successfully claimed all dividends!')
      await loadPortfolio() // Reload portfolio
      
    } catch (error) {
      console.error('Error claiming dividends:', error)
      toast.error('Failed to claim dividends')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Please connect your wallet</h3>
        <p className="mt-1 text-sm text-gray-500">Connect your wallet to view your portfolio.</p>
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
        <h1 className="text-3xl font-bold text-gray-900">Your Portfolio</h1>
        <p className="mt-2 text-lg text-gray-600">
          Track your real estate investments and earnings
        </p>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600">
            ${totalValue.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Portfolio Value</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600">
            ${totalDividends.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Claimable Dividends</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-purple-600">
            {portfolio.length}
          </div>
          <div className="text-sm text-gray-600">Properties Owned</div>
        </div>
      </div>

      {/* Quick Actions */}
      {totalDividends > 0 && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Claim Dividends</h3>
              <p className="text-sm text-gray-600">
                You have ${totalDividends.toFixed(2)} in claimable dividends
              </p>
            </div>
            <button
              onClick={claimAllDividends}
              className="btn-success"
            >
              <CurrencyDollarIcon className="h-4 w-4 mr-2" />
              Claim All Dividends
            </button>
          </div>
        </div>
      )}

      {/* Portfolio Items */}
      {portfolio.length === 0 ? (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No investments yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start investing in real estate properties to build your portfolio.
          </p>
          <div className="mt-6">
            <Link to="/properties" className="btn-primary">
              Browse Properties
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {portfolio.map((item) => (
            <div key={item.id} className="card">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                {/* Property Info */}
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    <img
                      src={item.imageUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80'}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600">{item.location}</p>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                </div>

                {/* Ownership Stats */}
                <div className="mt-4 lg:mt-0 lg:ml-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600">
                        {parseInt(item.sharesOwned || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Shares</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">
                        {((item.ownershipPercentage || 0) / 100).toFixed(2)}%
                      </div>
                      <div className="text-xs text-gray-600">Ownership</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-purple-600">
                        ${parseFloat(item.propertyValueOwned || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Value</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-orange-600">
                        ${parseFloat(item.claimableDividends || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600">Dividends</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 lg:mt-0 lg:ml-6 flex space-x-2">
                  <Link
                    to={`/properties/${item.id}`}
                    className="btn-secondary flex items-center"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    View
                  </Link>
                  {parseFloat(item.claimableDividends || 0) > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          const propertyDividends = await web3Service.getPropertyDividends(item.id)
                          if (propertyDividends.length > 0) {
                            const dividendIds = propertyDividends.map(d => d.id)
                            await web3Service.batchClaimDividends(dividendIds)
                            toast.success('Dividends claimed successfully!')
                            await loadPortfolio()
                          }
                        } catch (error) {
                          console.error('Error claiming dividends:', error)
                          toast.error('Failed to claim dividends')
                        }
                      }}
                      className="btn-success flex items-center"
                    >
                      <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                      Claim
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Performance Chart Placeholder */}
      {portfolio.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Performance</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Performance chart coming soon</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Portfolio

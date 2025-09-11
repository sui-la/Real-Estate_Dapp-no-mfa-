import React, { useState, useEffect } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import ApiService from '../services/ApiService'
import toast from 'react-hot-toast'
import { ethers } from 'ethers'
import {
  CurrencyDollarIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'

const Dividends = () => {
  const { contracts, isConnected, formatEther } = useWeb3()
  const { isAuthenticated } = useAuth()
  const [dividends, setDividends] = useState([])
  const [totalClaimable, setTotalClaimable] = useState(0)
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState([])

  useEffect(() => {
    if (isConnected && contracts.propertyToken && isAuthenticated) {
      loadDividends()
    }
  }, [isConnected, contracts, isAuthenticated])

  const loadDividends = async () => {
    try {
      setLoading(true)
      
      if (!contracts.propertyToken) {
        toast.error('Contract not initialized')
        return
      }

      // Load properties from API first
      let propertiesList = []
      try {
        const response = await ApiService.getProperties({ limit: 1000 }) // Get all properties
        console.log('🔍 Raw API response:', response)
        
        // Handle different response formats
        if (Array.isArray(response)) {
          propertiesList = response
        } else if (response.data && Array.isArray(response.data)) {
          propertiesList = response.data
        } else if (response.properties && Array.isArray(response.properties)) {
          propertiesList = response.properties
        } else {
          console.warn('⚠️ Unexpected API response format:', typeof response, response)
          propertiesList = []
        }
        
        setProperties(propertiesList)
        console.log('✅ Loaded properties:', propertiesList.length, 'properties')
        console.log('🏠 Properties list:', propertiesList.map(p => ({id: p._id, name: p.name, tokenId: p.tokenId})))
      } catch (error) {
        console.warn('❌ Could not load properties from API:', error)
        propertiesList = []
      }

      // Get total claimable dividends - handle case where no dividends exist
      let totalClaimableAmount = 0
      try {
        totalClaimableAmount = await contracts.realEstateFractionalization.getTotalClaimableDividends(contracts.signer.address)
        setTotalClaimable(parseFloat(formatEther(totalClaimableAmount)))
      } catch (error) {
        // If getTotalClaimableDividends fails, it likely means no dividends exist yet
        console.log('No dividends found or contract not initialized')
        setTotalClaimable(0)
      }

      // Get total number of properties - handle case where no properties exist
      let totalProperties = 0
      try {
        totalProperties = await contracts.propertyToken.getTotalProperties()
      } catch (error) {
        // If getTotalProperties fails, it likely means no properties exist yet
        console.log('No properties found or contract not initialized')
        setDividends([])
        return
      }

      // If no properties exist, return empty dividends
      if (totalProperties === 0) {
        console.log('No properties found, returning empty dividends')
        setDividends([])
        return
      }

      const allDividends = []

      // Load dividends for each property
      for (let i = 1; i <= totalProperties; i++) {
        try {
          console.log(`🔍 Checking dividends for property ${i}...`)
          const propertyDividends = await contracts.realEstateFractionalization.getPropertyDividends(i)
          console.log(`📊 Property ${i} has ${propertyDividends.length} dividend(s):`, propertyDividends)
          
          for (const dividendId of propertyDividends) {
            console.log(`🔍 Fetching dividend ${dividendId} details...`)
            const dividend = await contracts.dividendDistributor.getDividend(dividendId)
            console.log(`💰 Dividend ${dividendId} details:`, {
              isActive: dividend.isActive,
              totalAmount: dividend.totalAmount.toString(),
              timestamp: dividend.timestamp.toString(),
              timestampType: typeof dividend.timestamp,
              timestampNumber: Number(dividend.timestamp)
            })
            
            // Check if user has claimable amount for this dividend
            const claimableAmount = await contracts.dividendDistributor.getClaimableDividend(contracts.signer.address, dividendId)
            console.log(`💵 User claimable amount for dividend ${dividendId}:`, formatEther(claimableAmount), 'ETH')
            
            if (dividend.isActive && claimableAmount > 0n) {
              // Find matching property details from API
              let propertyDetails = null
              try {
                if (Array.isArray(propertiesList)) {
                  propertyDetails = propertiesList.find(p => p.tokenId === i)
                  console.log(`🔍 Property details for token ${i}:`, propertyDetails ? {name: propertyDetails.name, location: propertyDetails.location} : 'Not found')
                } else {
                  console.warn(`⚠️ propertiesList is not an array:`, typeof propertiesList, propertiesList)
                }
              } catch (error) {
                console.error(`❌ Error finding property details for token ${i}:`, error)
              }
              
              console.log(`✅ Adding dividend ${dividendId} to display list`)
              
              allDividends.push({
                id: dividendId.toString(), // Convert BigInt to string for safe handling
                propertyTokenId: i,
                propertyName: propertyDetails?.name || `Property #${i}`,
                propertyLocation: propertyDetails?.location || 'Unknown Location',
                propertyImage: propertyDetails?.imageUrl || 'https://via.placeholder.com/60x60?text=Property',
                claimableAmount: formatEther(claimableAmount),
                ...dividend,
                totalAmountFormatted: formatEther(dividend.totalAmount),
                distributedAmountFormatted: formatEther(dividend.distributedAmount),
              })
            } else {
              console.log(`❌ Skipping dividend ${dividendId} - isActive: ${dividend.isActive}, claimableAmount: ${formatEther(claimableAmount)} ETH`)
            }
          }
        } catch (error) {
          // Silently skip properties that don't exist or have no dividends
          console.log(`❌ Error checking property ${i}:`, error.message)
        }
      }

      console.log(`📋 Total dividends to display: ${allDividends.length}`)
      setDividends(allDividends)
    } catch (error) {
      console.error('Error loading dividends:', error)
      // Don't show error toast for empty data scenarios
      if (!error.message.includes('missing revert data') && !error.message.includes('CALL_EXCEPTION')) {
        toast.error('Failed to load dividends')
      }
    } finally {
      setLoading(false)
    }
  }

  const claimDividend = async (dividendId) => {
    try {
      console.log('Claiming dividend with ID:', dividendId, typeof dividendId)
      
      // Ensure dividend ID is properly converted to BigInt for the contract call
      const dividendIdBigInt = BigInt(dividendId.toString())
      console.log('Converted dividend ID:', dividendIdBigInt)
      
      // Check if user has claimable amount for this dividend
      const claimableAmount = await contracts.dividendDistributor.getClaimableDividend(contracts.signer.address, dividendIdBigInt)
      console.log('Claimable amount:', formatEther(claimableAmount), 'ETH')
      
      if (claimableAmount === 0n) {
        toast.error('No dividends to claim for this property. You may not own shares or have already claimed.')
        return
      }
      
      const tx = await contracts.realEstateFractionalization.claimDividend(dividendIdBigInt)
      await tx.wait()
      
      toast.success(`Dividend claimed successfully! Received ${formatEther(claimableAmount)} ETH`)
      await loadDividends() // Reload dividends
      
    } catch (error) {
      console.error('Error claiming dividend:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        data: error.data
      })
      
      // More specific error messages
      if (error.message.includes('No shares to claim dividends for')) {
        toast.error('You don\'t own shares in this property')
      } else if (error.message.includes('Already claimed this dividend')) {
        toast.error('You have already claimed this dividend')
      } else if (error.message.includes('Dividend is not active')) {
        toast.error('This dividend is no longer active')
      } else {
        toast.error('Failed to claim dividend: ' + (error.reason || error.message))
      }
    }
  }

  const claimAllDividends = async () => {
    try {
      const dividendIds = dividends.map(d => BigInt(d.id.toString()))
      console.log('💰 Claiming all dividends with IDs:', dividendIds)
      
      if (dividendIds.length === 0) {
        toast.error('No dividends to claim')
        return
      }

      // Check total claimable amount first
      const totalClaimableAmount = await contracts.realEstateFractionalization.getTotalClaimableDividends(contracts.signer.address)
      console.log('💵 Total claimable amount:', formatEther(totalClaimableAmount), 'ETH')
      
      if (totalClaimableAmount === 0n) {
        toast.error('No dividends available to claim. You may not own shares or have already claimed all dividends.')
        return
      }

      // Debug each dividend individually before batch claim
      console.log('🔍 Debugging individual dividends before batch claim:')
      for (const dividendId of dividendIds) {
        try {
          const dividend = await contracts.dividendDistributor.getDividend(dividendId)
          const claimableAmount = await contracts.dividendDistributor.getClaimableDividend(contracts.signer.address, dividendId)
          const hasClaimed = await contracts.dividendDistributor.hasClaimedDividend(contracts.signer.address, dividendId)
          
          // Check fractional token details
          const fractionalTokenAddress = dividend.fractionalTokenAddress
          console.log(`🪙 Fractional token address for dividend ${dividendId}:`, fractionalTokenAddress)
          
          // Get fractional token contract and check user balance
          const fractionalTokenAbi = [
            "function balanceOf(address owner) view returns (uint256)",
            "function totalSupply() view returns (uint256)"
          ]
          const fractionalToken = new ethers.Contract(fractionalTokenAddress, fractionalTokenAbi, contracts.signer)
          const userShares = await fractionalToken.balanceOf(contracts.signer.address)
          const totalShares = await fractionalToken.totalSupply()
          
          console.log(`📊 Dividend ${dividendId}:`, {
            isActive: dividend.isActive,
            claimableAmount: formatEther(claimableAmount),
            hasClaimed: hasClaimed,
            totalAmount: formatEther(dividend.totalAmount),
            fractionalTokenAddress,
            userShares: formatEther(userShares),
            totalShares: formatEther(totalShares),
            userSharesRaw: userShares.toString(),
            calculatedDividend: userShares > 0n ? formatEther((userShares * dividend.totalAmount) / totalShares) : '0'
          })
        } catch (debugError) {
          console.error(`❌ Error debugging dividend ${dividendId}:`, debugError)
        }
      }

      // DEBUG: Let's check which fractional token addresses you actually own shares in
      console.log('🔍 Checking your actual fractional token ownership...')
      for (const property of properties) {
        if (property.tokenId && property.fractionalTokenAddress) {
          try {
            const fractionalTokenAbi = [
              "function balanceOf(address owner) view returns (uint256)"
            ]
            const fractionalToken = new ethers.Contract(property.fractionalTokenAddress, fractionalTokenAbi, contracts.signer)
            const userShares = await fractionalToken.balanceOf(contracts.signer.address)
            
            if (userShares > 0n) {
              console.log(`✅ You own ${formatEther(userShares)} shares in:`, {
                property: property.name,
                tokenId: property.tokenId,
                fractionalTokenAddress: property.fractionalTokenAddress
              })
            }
          } catch (error) {
            console.warn(`⚠️ Could not check shares for ${property.name}:`, error.message)
          }
        }
      }

      console.log('🚀 Attempting batch claim...')
      const tx = await contracts.realEstateFractionalization.batchClaimDividends(dividendIds)
      await tx.wait()
      
      toast.success(`All dividends claimed successfully! Received ${formatEther(totalClaimableAmount)} ETH`)
      await loadDividends() // Reload dividends
      
    } catch (error) {
      console.error('❌ Error claiming all dividends:', error)
      console.error('🔍 Error details:', {
        message: error.message,
        code: error.code,
        data: error.data,
        reason: error.reason
      })
      
      // More specific error messages
      if (error.message.includes('No dividends to claim')) {
        toast.error('No dividends to claim. You may have already claimed them or don\'t own shares.')
      } else if (error.message.includes('No shares to claim dividends for')) {
        toast.error('You don\'t own shares in any properties with dividends')
      } else if (error.message.includes('Already claimed')) {
        toast.error('You have already claimed these dividends')
      } else {
        toast.error('Failed to claim dividends: ' + (error.reason || error.message))
      }
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Please connect your wallet</h3>
        <p className="mt-1 text-sm text-gray-500">Connect your wallet to view your dividends.</p>
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
        <h1 className="text-3xl font-bold text-gray-900">Dividend Center</h1>
        <p className="mt-2 text-lg text-gray-600">
          Manage your dividend payments from real estate investments
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600">
            ${totalClaimable.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Total Claimable</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600">
            {dividends.length}
          </div>
          <div className="text-sm text-gray-600">Active Dividends</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-purple-600">
            ${dividends.reduce((sum, d) => sum + parseFloat(d.totalAmountFormatted), 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Total Distributed</div>
        </div>
      </div>

      {/* Claim All Button */}
      {totalClaimable > 0 && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Claim All Dividends</h3>
              <p className="text-sm text-gray-600">
                You have ${totalClaimable.toFixed(2)} in claimable dividends across all properties
              </p>
            </div>
            <button
              onClick={claimAllDividends}
              className="btn-success"
            >
              <CurrencyDollarIcon className="h-4 w-4 mr-2" />
              Claim All (${totalClaimable.toFixed(2)})
            </button>
          </div>
        </div>
      )}

      {/* Dividends List */}
      {dividends.length === 0 ? (
        <div className="text-center py-12">
          <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No dividends available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Dividends will appear here when they are distributed for properties you own.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {dividends.map((dividend) => (
            <div key={dividend.id} className="card">
              <div className="flex items-start space-x-4">
                {/* Property Image */}
                <div className="flex-shrink-0">
                  <img
                    src={dividend.propertyImage}
                    alt={dividend.propertyName}
                    className="w-16 h-16 rounded-lg object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/64x64?text=Property'
                    }}
                  />
                </div>

                {/* Property Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                          Dividend
                        </div>
                        <div className="flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                          ID #{dividend.propertyTokenId}
                        </div>
                      </div>
                      
                      <div className="mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {dividend.propertyName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {dividend.propertyLocation}
                        </p>
                      </div>
                      
                      <div className="text-sm text-gray-700 mb-3">
                        <span className="font-medium">Distribution:</span> {dividend.description}
                      </div>

                      {/* Financial Details */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-lg font-bold text-green-600">
                            ${parseFloat(dividend.totalAmountFormatted).toFixed(2)}
                          </div>
                          <div className="text-gray-500">Total Amount</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            ${parseFloat(dividend.distributedAmountFormatted).toFixed(2)}
                          </div>
                          <div className="text-gray-500">Already Distributed</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-blue-600">
                            ${parseFloat(dividend.claimableAmount).toFixed(2)}
                          </div>
                          <div className="text-gray-500">Your Share</div>
                        </div>
                      </div>
                    </div>

                    {/* Claim Button */}
                    <div className="flex-shrink-0 ml-4">
                      <button
                        onClick={() => claimDividend(dividend.id)}
                        className="btn-primary"
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Claim
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with timestamp and ID */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Distributed: {(() => {
                      try {
                        // Convert BigInt to number if needed, then to milliseconds
                        const timestamp = typeof dividend.timestamp === 'bigint' 
                          ? Number(dividend.timestamp) 
                          : Number(dividend.timestamp);
                        
                        if (isNaN(timestamp) || timestamp === 0) {
                          return 'Date not available';
                        }
                        
                        // Convert seconds to milliseconds for JavaScript Date
                        const date = new Date(timestamp * 1000);
                        return date.toLocaleDateString();
                      } catch (error) {
                        console.warn('Error formatting dividend date:', error, 'timestamp:', dividend.timestamp);
                        return 'Invalid Date';
                      }
                    })()}
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    Dividend ID: #{dividend.id}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dividends

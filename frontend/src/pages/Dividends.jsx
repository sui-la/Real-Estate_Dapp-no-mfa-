import React, { useState, useEffect } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import ApiService from '../services/ApiService'
import TransactionService from '../services/TransactionService'
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
              let databaseDividend = null
              
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
              
              // Try to fetch corresponding database dividend for additional info
              try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/dividends?propertyId=${propertyDetails?._id}&isActive=true`)
                if (response.ok) {
                  const data = await response.json()
                  // Find dividend with matching dividendId
                  databaseDividend = data.dividends?.find(d => d.dividendId === Number(dividendId))
                  console.log(`📊 Database dividend info for ${dividendId}:`, databaseDividend)
                }
              } catch (error) {
                console.warn(`⚠️ Could not fetch database dividend info:`, error)
              }
              
              console.log(`✅ Adding dividend ${dividendId} to display list`)
              
              allDividends.push({
                id: dividendId.toString(), // Convert BigInt to string for safe handling
                propertyTokenId: i,
                propertyName: propertyDetails?.name || `Property #${i}`,
                propertyLocation: propertyDetails?.location || 'Unknown Location',
                propertyImage: propertyDetails?.imageUrl || '/vite.svg',
                claimableAmount: formatEther(claimableAmount),
                ...dividend,
                // Merge database dividend info if available
                ...(databaseDividend && {
                  distributionDate: databaseDividend.distributionDate,
                  description: databaseDividend.description,
                  source: databaseDividend.source
                }),
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
      const dividendIdBigInt = BigInt(dividendId.toString())
      
      // Get dividend information
      const dividend = await contracts.dividendDistributor.getDividend(dividendIdBigInt)
      
      // Check if user has shares in the fractional token for this dividend
      const fractionalTokenContract = new ethers.Contract(
        dividend.fractionalTokenAddress,
        [
          'function balanceOf(address) view returns (uint256)',
          'function totalSupply() view returns (uint256)',
          'function name() view returns (string)',
          'function symbol() view returns (string)'
        ],
        contracts.signer
      )
      
      const userShares = await fractionalTokenContract.balanceOf(contracts.signer.address)
      const tokenName = await fractionalTokenContract.name()
      const claimableAmount = await contracts.dividendDistributor.getClaimableDividend(contracts.signer.address, dividendIdBigInt)
      
      if (claimableAmount === 0n) {
        toast.error('No dividends to claim for this property. You may not own shares or have already claimed.')
        return
      }
      
      if (userShares === 0n) {
        toast.error(`You don't own shares in ${tokenName}. The dividend is for this token but you have 0 shares.`)
        return
      }
      
      // Try calling DividendDistributor directly first
      try {
        const signerAddress = await contracts.signer.getAddress()
        const directTx = await contracts.dividendDistributor.claimDividend(dividendIdBigInt)
        const receipt = await directTx.wait()
        
        // Track the dividend claim transaction
        try {
          console.log('🔍 [DEBUG] Starting transaction tracking...')
          const dividendData = dividends.find(d => d.id === dividendId.toString())
          console.log('🔍 [DEBUG] Dividend data:', dividendData)
          
          // Find the property in the database by tokenId to get the MongoDB _id
          console.log('🔍 [DEBUG] Looking up property with tokenId:', dividendData?.propertyTokenId)
          const property = await ApiService.getProperties({ tokenId: dividendData?.propertyTokenId })
          console.log('🔍 [DEBUG] Property lookup result:', property)
          const propertyRecord = property?.properties?.[0]
          console.log('🔍 [DEBUG] Property record:', propertyRecord)
          
          if (propertyRecord) {
            console.log('🔍 [DEBUG] Tracking dividend transaction with propertyId:', propertyRecord._id)
            await TransactionService.trackDividendTransaction({
              propertyId: propertyRecord._id,
              amount: parseFloat(formatEther(claimableAmount)),
              transactionHash: receipt.hash,
              blockNumber: receipt.blockNumber,
              gasUsed: receipt.gasUsed?.toString(),
              gasFee: (receipt.gasUsed * receipt.gasPrice)?.toString(),
              fromAddress: signerAddress,
              toAddress: contracts.dividendDistributor.target,
              distributionId: dividendId.toString()
            })
            console.log('✅ [DEBUG] Transaction tracking completed successfully')
          } else {
            console.warn('❌ [DEBUG] No property record found for tokenId:', dividendData?.propertyTokenId)
          }
        } catch (trackingError) {
          console.error('❌ [DEBUG] Failed to track dividend transaction:', trackingError)
        }
        
        toast.success(`Dividend claimed successfully! Received ${formatEther(claimableAmount)} ETH`)
        await loadDividends()
        return
        
      } catch (directError) {
        // Fallback to RealEstateFractionalization call
        const tx = await contracts.realEstateFractionalization.claimDividend(dividendIdBigInt)
        const receipt = await tx.wait()
        
        // Track the dividend claim transaction
        try {
          const signerAddress = await contracts.signer.getAddress()
          const dividendData = dividends.find(d => d.id === dividendId.toString())
          // Find the property in the database by tokenId to get the MongoDB _id
          const property = await ApiService.getProperties({ tokenId: dividendData?.propertyTokenId })
          const propertyRecord = property?.properties?.[0]
          
          if (propertyRecord) {
            await TransactionService.trackDividendTransaction({
              propertyId: propertyRecord._id,
              amount: parseFloat(formatEther(claimableAmount)),
              transactionHash: receipt.hash,
              blockNumber: receipt.blockNumber,
              gasUsed: receipt.gasUsed?.toString(),
              gasFee: (receipt.gasUsed * receipt.gasPrice)?.toString(),
              fromAddress: signerAddress,
              toAddress: contracts.realEstateFractionalization.target,
              distributionId: dividendId.toString()
            })
          }
        } catch (trackingError) {
          console.warn('Failed to track dividend transaction:', trackingError)
        }
        
        toast.success(`Dividend claimed successfully! Received ${formatEther(claimableAmount)} ETH`)
        await loadDividends()
      }
      
    } catch (error) {
      console.error('Error claiming dividend:', error)
      
      if (error.message?.includes('No shares to claim dividends for')) {
        toast.error('You don\'t own shares in this property or have already claimed this dividend.')
      } else if (error.message?.includes('Already claimed this dividend')) {
        toast.error('You have already claimed this dividend.')
      } else if (error.message?.includes('Dividend is not active')) {
        toast.error('This dividend is no longer active.')
      } else if (error.message?.includes('No dividends to claim')) {
        toast.error('No dividends available to claim.')
      } else {
        toast.error(`Failed to claim dividend: ${error.message}`)
      }
    }
  }

  const claimAllDividends = async () => {
    try {
      if (dividends.length === 0) {
        toast.error('No dividends to claim')
        return
      }

      let totalClaimed = 0n
      let successCount = 0
      let errorCount = 0

      // Claim each dividend individually using the same logic as individual claim
      for (const dividend of dividends) {
        try {
          const dividendIdBigInt = BigInt(dividend.id.toString())
          
          // Get claimable amount for this dividend
          const claimableAmount = await contracts.dividendDistributor.getClaimableDividend(contracts.signer.address, dividendIdBigInt)
          
          if (claimableAmount === 0n) {
            continue // Skip dividends with 0 claimable amount
          }

          // Try calling DividendDistributor directly first
          try {
            const signerAddress = await contracts.signer.getAddress()
            const directTx = await contracts.dividendDistributor.claimDividend(dividendIdBigInt)
            const receipt = await directTx.wait()
            
            // Track the dividend claim transaction
            try {
              // Find the property in the database by tokenId to get the MongoDB _id
              const property = await ApiService.getProperties({ tokenId: dividend.propertyTokenId })
              const propertyRecord = property?.properties?.[0]
              
              if (propertyRecord) {
                await TransactionService.trackDividendTransaction({
                  propertyId: propertyRecord._id,
                  amount: parseFloat(formatEther(claimableAmount)),
                  transactionHash: receipt.hash,
                  blockNumber: receipt.blockNumber,
                  gasUsed: receipt.gasUsed?.toString(),
                  gasFee: (receipt.gasUsed * receipt.gasPrice)?.toString(),
                  fromAddress: signerAddress,
                  toAddress: contracts.dividendDistributor.target,
                  distributionId: dividend.id
                })
              }
            } catch (trackingError) {
              console.warn('Failed to track dividend transaction:', trackingError)
            }
            
            totalClaimed += claimableAmount
            successCount++
            
          } catch (directError) {
            // Fallback to RealEstateFractionalization call
            const signerAddress = await contracts.signer.getAddress()
            const tx = await contracts.realEstateFractionalization.claimDividend(dividendIdBigInt)
            const receipt = await tx.wait()
            
            // Track the dividend claim transaction
            try {
              // Find the property in the database by tokenId to get the MongoDB _id
              const property = await ApiService.getProperties({ tokenId: dividend.propertyTokenId })
              const propertyRecord = property?.properties?.[0]
              
              if (propertyRecord) {
                await TransactionService.trackDividendTransaction({
                  propertyId: propertyRecord._id,
                  amount: parseFloat(formatEther(claimableAmount)),
                  transactionHash: receipt.hash,
                  blockNumber: receipt.blockNumber,
                  gasUsed: receipt.gasUsed?.toString(),
                  gasFee: (receipt.gasUsed * receipt.gasPrice)?.toString(),
                  fromAddress: signerAddress,
                  toAddress: contracts.realEstateFractionalization.target,
                  distributionId: dividend.id
                })
              }
            } catch (trackingError) {
              console.warn('Failed to track dividend transaction:', trackingError)
            }
            
            totalClaimed += claimableAmount
            successCount++
          }
          
        } catch (error) {
          console.error(`Error claiming dividend ${dividend.id}:`, error)
          errorCount++
          // Continue with next dividend instead of stopping
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully claimed ${successCount} dividend(s)! Received ${formatEther(totalClaimed)} ETH`)
      }
      
      if (errorCount > 0) {
        toast.warning(`${errorCount} dividend(s) could not be claimed (already claimed or no shares)`)
      }

      if (successCount === 0 && errorCount === 0) {
        toast.error('No dividends available to claim')
      }

      await loadDividends()
      
    } catch (error) {
      console.error('Error in claim all dividends:', error)
      toast.error(`Failed to claim dividends: ${error.message}`)
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
        <button
          onClick={() => window.location.reload()}
          className="mt-4 btn-secondary"
        >
          🔄 Force Refresh Data
        </button>
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
                      e.target.src = '/vite.svg'
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
                        if (dividend.distributionDate) {
                          // Database date - already in correct format
                          const date = new Date(dividend.distributionDate);
                          return date.toLocaleDateString();
                        } else {
                          // Blockchain dividend without valid timestamp
                          return 'Recently distributed';
                        }
                      } catch (error) {
                        console.warn('Error formatting dividend date:', error, 'dividend:', dividend);
                        return 'Recently distributed';
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

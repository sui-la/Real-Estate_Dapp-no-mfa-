import React, { useState, useEffect } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import {
  CurrencyDollarIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

const Dividends = () => {
  const { contracts, isConnected, formatEther } = useWeb3()
  const { isAuthenticated } = useAuth()
  const [dividends, setDividends] = useState([])
  const [totalClaimable, setTotalClaimable] = useState(0)
  const [loading, setLoading] = useState(true)

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

      // Get total claimable dividends
      const totalClaimableAmount = await contracts.realEstateFractionalization.getTotalClaimableDividends(contracts.signer.address)
      setTotalClaimable(parseFloat(formatEther(totalClaimableAmount)))

      // Get total number of properties
      const totalProperties = await contracts.propertyToken.getTotalProperties()
      const allDividends = []

      // Load dividends for each property
      for (let i = 1; i <= totalProperties; i++) {
        try {
          const propertyDividends = await contracts.realEstateFractionalization.getPropertyDividends(i)
          
          for (const dividendId of propertyDividends) {
            const dividend = await contracts.dividendDistributor.getDividend(dividendId)
            if (dividend.isActive) {
              allDividends.push({
                id: dividendId,
                propertyTokenId: i,
                ...dividend,
                totalAmountFormatted: formatEther(dividend.totalAmount),
                distributedAmountFormatted: formatEther(dividend.distributedAmount),
              })
            }
          }
        } catch (error) {
          console.error(`Error loading dividends for property ${i}:`, error)
        }
      }

      setDividends(allDividends)
    } catch (error) {
      console.error('Error loading dividends:', error)
      toast.error('Failed to load dividends')
    } finally {
      setLoading(false)
    }
  }

  const claimDividend = async (dividendId) => {
    try {
      const tx = await contracts.realEstateFractionalization.claimDividend(dividendId)
      await tx.wait()
      
      toast.success('Dividend claimed successfully!')
      await loadDividends() // Reload dividends
      
    } catch (error) {
      console.error('Error claiming dividend:', error)
      toast.error('Failed to claim dividend')
    }
  }

  const claimAllDividends = async () => {
    try {
      const dividendIds = dividends.map(d => d.id)
      if (dividendIds.length === 0) {
        toast.error('No dividends to claim')
        return
      }

      const tx = await contracts.realEstateFractionalization.batchClaimDividends(dividendIds)
      await tx.wait()
      
      toast.success('All dividends claimed successfully!')
      await loadDividends() // Reload dividends
      
    } catch (error) {
      console.error('Error claiming all dividends:', error)
      toast.error('Failed to claim dividends')
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
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                      Dividend
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Property #{dividend.propertyTokenId}
                      </div>
                      <div className="text-sm text-gray-500">
                        {dividend.description}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      ${parseFloat(dividend.totalAmountFormatted).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Total Amount
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      ${parseFloat(dividend.distributedAmountFormatted).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Distributed
                    </div>
                  </div>

                  <button
                    onClick={() => claimDividend(dividend.id)}
                    className="btn-primary"
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Claim
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    <span>
                      Distributed: {new Date(dividend.timestamp * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
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

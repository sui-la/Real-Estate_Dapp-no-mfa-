import React, { useState } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import ApiService from '../services/ApiService'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CogIcon,
} from '@heroicons/react/24/outline'

const Admin = () => {
  const { web3Service, isConnected } = useWeb3()
  const { user, checkAdminStatus } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('properties')
  const [properties, setProperties] = useState([])
  const [loadingProperties, setLoadingProperties] = useState(false)

  // Property creation form
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    description: '',
    location: '',
    totalValue: '',
    totalShares: '',
    imageUrl: '',
    documents: '',
    fractionalTokenName: '',
    fractionalTokenSymbol: '',
  })

  // Dividend distribution form
  const [dividendForm, setDividendForm] = useState({
    propertyTokenId: '',
    description: '',
    amount: '',
  })

  React.useEffect(() => {
    checkAdminAccess()
    if (isAdmin) {
      fetchProperties()
    }
  }, [user, isAdmin, web3Service])

  const checkAdminAccess = async () => {
    try {
      const adminStatus = await checkAdminStatus()
      setIsAdmin(adminStatus)
    } catch (error) {
      console.error('Error checking admin status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePropertyFormChange = (e) => {
    const { name, value } = e.target
    setPropertyForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDividendFormChange = (e) => {
    const { name, value } = e.target
    setDividendForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const createProperty = async (e) => {
    e.preventDefault()
    
    console.log('🔍 [DEBUG] Admin: Starting property creation');
    console.log('🔍 [DEBUG] Admin: Property form data:', propertyForm);
    
    if (!web3Service) {
      console.error('❌ [ERROR] Admin: Web3 service not initialized');
      toast.error('Web3 service not initialized')
      return
    }

    try {
      setLoading(true)
      
      console.log('🔍 [DEBUG] Admin: Calling backend API to create property...');
      
      // First create property in backend database
      const backendProperty = await ApiService.createProperty({
        name: propertyForm.name,
        description: propertyForm.description,
        location: propertyForm.location,
        totalValue: parseFloat(propertyForm.totalValue),
        totalShares: parseInt(propertyForm.totalShares),
        imageUrl: propertyForm.imageUrl && propertyForm.imageUrl.startsWith('http') ? propertyForm.imageUrl : 'https://via.placeholder.com/400x300?text=Property+Image',
        documents: propertyForm.documents ? propertyForm.documents.split(',').map(doc => doc.trim()) : []
      })
      
      console.log('✅ [SUCCESS] Admin: Property created in backend:', backendProperty)
      
      console.log('🔍 [DEBUG] Admin: Calling blockchain to create and fractionalize property...');
      
      // Then create and fractionalize on blockchain
      const receipt = await web3Service.createProperty({
        ...propertyForm,
        documents: propertyForm.documents ? propertyForm.documents.split(',').map(doc => doc.trim()) : []
      })
      
      console.log('✅ [SUCCESS] Admin: Property created and fractionalized on blockchain');
      console.log('🔍 [DEBUG] Admin: Transaction receipt:', receipt)
      
      // Update database with blockchain data
      console.log('🔍 [DEBUG] Admin: Updating database with blockchain data...')
      
      // Extract tokenId from transaction events
      let tokenId = null
      let fractionalTokenAddress = null
      
      if (receipt.logs && receipt.logs.length > 0) {
        console.log('🔍 [DEBUG] Admin: Transaction logs:', receipt.logs)
        // Look for PropertyFractionalized event
        for (const log of receipt.logs) {
          try {
            const decoded = web3Service.contracts.realEstateFractionalization.interface.parseLog(log)
            console.log('🔍 [DEBUG] Admin: Decoded log:', decoded)
            if (decoded && decoded.name === 'PropertyFractionalized') {
              tokenId = decoded.args.propertyTokenId.toString()
              fractionalTokenAddress = decoded.args.fractionalTokenAddress
              console.log('🔍 [DEBUG] Admin: Found PropertyFractionalized event:', { tokenId, fractionalTokenAddress })
              break
            }
          } catch (e) {
            console.log('🔍 [DEBUG] Admin: Log parsing failed (not our event):', e.message)
            // Not our event, continue
          }
        }
      }
      
        // Fallback: get from contract state
        if (!tokenId || !fractionalTokenAddress) {
          console.log('🔍 [DEBUG] Admin: Getting from contract state...')
          try {
            // Wait longer for the transaction to be fully processed
            await new Promise(resolve => setTimeout(resolve, 3000))
            
            const totalProperties = await web3Service.contracts.propertyToken.getTotalProperties()
            console.log('🔍 [DEBUG] Admin: Total properties from contract:', totalProperties)
            
            if (totalProperties === 0n) {
              throw new Error('No properties found in contract - property creation may have failed')
            }
            
            // The new property should be the last one (totalProperties - 1)
            // But tokenId starts from 1, not 0
            tokenId = totalProperties.toString()
            console.log('🔍 [DEBUG] Admin: Calculated tokenId:', tokenId)
            
            // Check if property exists
            const propertyExists = await web3Service.contracts.propertyToken.propertyExists(tokenId)
            console.log('🔍 [DEBUG] Admin: Property exists:', propertyExists)
            
            if (!propertyExists) {
              throw new Error(`Property with tokenId ${tokenId} does not exist`)
            }
            
            // Try multiple times to get the fractional token address
            let attempts = 0
            const maxAttempts = 10
            
            while (attempts < maxAttempts) {
              fractionalTokenAddress = await web3Service.contracts.realEstateFractionalization.fractionalTokens(tokenId)
              console.log(`🔍 [DEBUG] Admin: Attempt ${attempts + 1} - Got fractionalTokenAddress:`, fractionalTokenAddress)
              
              if (fractionalTokenAddress !== '0x0000000000000000000000000000000000000000') {
                break
              }
              
              attempts++
              if (attempts < maxAttempts) {
                console.log(`🔍 [DEBUG] Admin: Fractional token address is zero, waiting and retrying... (attempt ${attempts + 1}/${maxAttempts})`)
                await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
              }
            }
            
            if (fractionalTokenAddress === '0x0000000000000000000000000000000000000000') {
              console.error('❌ [ERROR] Admin: Property was not properly fractionalized after all attempts!')
              
              // Try to get more debugging info
              try {
                const debugInfo = await web3Service.debugPropertyCreation(tokenId)
                console.log('🔍 [DEBUG] Admin: Debug info:', debugInfo)
              } catch (debugError) {
                console.error('❌ [ERROR] Admin: Debug info failed:', debugError)
              }
              
              throw new Error('Property fractionalization failed - fractional token address is zero')
            }
          } catch (contractError) {
            console.error('❌ [ERROR] Admin: Failed to get contract state:', contractError)
            throw contractError
          }
        }
      
      const blockchainData = {
        tokenId: tokenId,
        fractionalTokenAddress: fractionalTokenAddress
      }
      
      console.log('🔍 [DEBUG] Admin: Blockchain data to update:', blockchainData)
      
      try {
        await ApiService.updateProperty(backendProperty._id, blockchainData)
        console.log('✅ [SUCCESS] Admin: Database updated with blockchain data')
      } catch (updateError) {
        console.error('❌ [ERROR] Admin: Failed to update database:', updateError)
        throw updateError
      }
      
      toast.success('Property created and fractionalized successfully!')
      
      // Reset form
      setPropertyForm({
        name: '',
        description: '',
        location: '',
        totalValue: '',
        totalShares: '',
        imageUrl: '',
        documents: '',
        fractionalTokenName: '',
        fractionalTokenSymbol: '',
      })
      
      // Refresh properties list
      await fetchProperties()
      
    } catch (error) {
      console.error('❌ [ERROR] Admin: Error creating property:', error)
      console.error('❌ [ERROR] Admin: Error details:', {
        message: error.message,
        stack: error.stack
      })
      toast.error(`Failed to create property: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const distributeDividends = async (e) => {
    e.preventDefault()
    
    if (!web3Service) {
      toast.error('Web3 service not initialized')
      return
    }

    try {
      setLoading(true)
      
      await web3Service.distributeDividends(
        parseInt(dividendForm.propertyTokenId),
        dividendForm.description,
        dividendForm.amount
      )
      
      toast.success('Dividends distributed successfully!')
      
      // Reset form
      setDividendForm({
        propertyTokenId: '',
        description: '',
        amount: '',
      })
      
    } catch (error) {
      console.error('Error distributing dividends:', error)
      toast.error('Failed to distribute dividends')
    } finally {
      setLoading(false)
    }
  }

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true)
      console.log('🔍 [DEBUG] Admin: Fetching properties from database...')
      const response = await ApiService.getProperties()
      console.log('🔍 [DEBUG] Admin: Database properties received:', response)
      
      // Extract properties from the response
      const propertiesList = response.properties || response || []
      setProperties(propertiesList)
    } catch (error) {
      console.error('Error fetching properties:', error)
      toast.error('Failed to fetch properties')
    } finally {
      setLoadingProperties(false)
    }
  }

  const enableTrading = async (propertyTokenId) => {
    try {
      setLoading(true)
      console.log('🔍 [DEBUG] Admin: Enabling trading for property:', propertyTokenId)
      
      await web3Service.enableTrading(propertyTokenId)
      
      console.log('✅ [SUCCESS] Admin: Trading enabled successfully')
      toast.success('Trading enabled successfully!')
      
      // Refresh properties list
      await fetchProperties()
    } catch (error) {
      console.error('❌ [ERROR] Admin: Error enabling trading:', error)
      toast.error('Failed to enable trading: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have administrator privileges to access this page.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-lg text-gray-600">
          Manage properties, distributions, and platform settings
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { name: 'Properties', value: 'properties', icon: BuildingOfficeIcon },
              { name: 'Dividends', value: 'dividends', icon: CurrencyDollarIcon },
              { name: 'Analytics', value: 'analytics', icon: ChartBarIcon },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.value
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Properties Tab */}
      {activeTab === 'properties' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Property</h3>
            
            <form onSubmit={createProperty} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={propertyForm.name}
                    onChange={handlePropertyFormChange}
                    required
                    className="input-field"
                    placeholder="Enter property name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={propertyForm.location}
                    onChange={handlePropertyFormChange}
                    required
                    className="input-field"
                    placeholder="Enter property location"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={propertyForm.description}
                  onChange={handlePropertyFormChange}
                  required
                  rows={3}
                  className="input-field"
                  placeholder="Enter property description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Value (ETH)
                  </label>
                  <input
                    type="number"
                    name="totalValue"
                    value={propertyForm.totalValue}
                    onChange={handlePropertyFormChange}
                    required
                    step="0.01"
                    className="input-field"
                    placeholder="Enter total value"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Shares
                  </label>
                  <input
                    type="number"
                    name="totalShares"
                    value={propertyForm.totalShares}
                    onChange={handlePropertyFormChange}
                    required
                    className="input-field"
                    placeholder="Enter total shares"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  name="imageUrl"
                  value={propertyForm.imageUrl}
                  onChange={handlePropertyFormChange}
                  className="input-field"
                  placeholder="Enter image URL"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Name
                  </label>
                  <input
                    type="text"
                    name="fractionalTokenName"
                    value={propertyForm.fractionalTokenName}
                    onChange={handlePropertyFormChange}
                    required
                    className="input-field"
                    placeholder="Enter token name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Symbol
                  </label>
                  <input
                    type="text"
                    name="fractionalTokenSymbol"
                    value={propertyForm.fractionalTokenSymbol}
                    onChange={handlePropertyFormChange}
                    required
                    maxLength="10"
                    className="input-field"
                    placeholder="Enter token symbol"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document URLs (comma-separated)
                </label>
                <input
                  type="text"
                  name="documents"
                  value={propertyForm.documents}
                  onChange={handlePropertyFormChange}
                  className="input-field"
                  placeholder="Enter document URLs separated by commas"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {loading ? 'Creating...' : 'Create Property'}
              </button>
            </form>
          </div>

          {/* Properties List */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Properties</h3>
            
            {loadingProperties ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading properties...</span>
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-8">
                <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No properties found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {properties.map((property) => (
                  <div key={property.id || property._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900">{property.name}</h4>
                        <p className="text-sm text-gray-600">{property.location}</p>
                        <p className="text-sm text-gray-500 mt-1">{property.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>Value: {property.totalValue} ETH</span>
                          <span>Shares: {property.totalShares}</span>
                          <span>Token ID: {property.tokenId !== null ? property.tokenId : 'Not created'}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {property.tokenId !== null ? (
                          <button
                            onClick={() => enableTrading(property.tokenId)}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Enabling...' : 'Enable Trading'}
                          </button>
                        ) : (
                          <span className="px-4 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-md">
                            Blockchain creation needed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dividends Tab */}
      {activeTab === 'dividends' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribute Dividends</h3>
            
            <form onSubmit={distributeDividends} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Token ID
                </label>
                <input
                  type="number"
                  name="propertyTokenId"
                  value={dividendForm.propertyTokenId}
                  onChange={handleDividendFormChange}
                  required
                  className="input-field"
                  placeholder="Enter property token ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={dividendForm.description}
                  onChange={handleDividendFormChange}
                  required
                  className="input-field"
                  placeholder="Enter dividend description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (ETH)
                </label>
                <input
                  type="number"
                  name="amount"
                  value={dividendForm.amount}
                  onChange={handleDividendFormChange}
                  required
                  step="0.01"
                  className="input-field"
                  placeholder="Enter dividend amount"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center"
              >
                <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                {loading ? 'Distributing...' : 'Distribute Dividends'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Analytics</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Analytics dashboard coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin

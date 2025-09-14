import React, { useState } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import ApiService from '../services/ApiService'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CogIcon,
  PencilIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const Admin = () => {
  const { web3Service, isConnected } = useWeb3()
  const { user, checkAdminStatus } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('properties')
  const [properties, setProperties] = useState([])
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [propertyTradingStatus, setPropertyTradingStatus] = useState({})
  const [loadingTradingStatus, setLoadingTradingStatus] = useState(false)
  const [tradingStatusFilter, setTradingStatusFilter] = useState('all') // 'all', 'enabled', 'disabled', 'not-listed'

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

  // Property edit form
  const [editingProperty, setEditingProperty] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    location: '',
    totalValue: '',
    totalShares: '',
    imageUrl: '',
    documents: '',
  })

  // Dividend distribution form
  const [dividendForm, setDividendForm] = useState({
    propertyTokenId: '',
    description: '',
    amount: '',
  })
  const [dividendPreview, setDividendPreview] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

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

  const handleEditFormChange = (e) => {
    const { name, value } = e.target
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Filter properties based on trading status
  const filteredProperties = properties.filter(property => {
    if (tradingStatusFilter === 'all') return true
    
    if (tradingStatusFilter === 'not-listed') {
      return property.tokenId === null
    }
    
    if (tradingStatusFilter === 'enabled') {
      return property.tokenId !== null && propertyTradingStatus[property.tokenId] === true
    }
    
    if (tradingStatusFilter === 'disabled') {
      return property.tokenId !== null && propertyTradingStatus[property.tokenId] === false
    }
    
    return true
  })

  const handleDividendFormChange = (e) => {
    const { name, value } = e.target
    setDividendForm(prev => ({
      ...prev,
      [name]: value
    }))

    // Auto-generate preview when amount changes
    if (name === 'amount' && value && dividendForm.propertyTokenId) {
      generateDividendPreview(dividendForm.propertyTokenId, value)
    }
  }

  const handlePropertySelection = (propertyTokenId) => {
    const property = properties.find(p => p.tokenId === parseInt(propertyTokenId))
    setSelectedProperty(property)
    setDividendForm(prev => ({
      ...prev,
      propertyTokenId: propertyTokenId
    }))

    // Generate preview if amount is already filled
    if (dividendForm.amount) {
      generateDividendPreview(propertyTokenId, dividendForm.amount)
    }
  }

  const generateDividendPreview = async (tokenId, amount) => {
    if (!tokenId || !amount || !web3Service) return

    try {
      setLoadingPreview(true)
      
      // Get property details and shareholder info
      const property = properties.find(p => p.tokenId === parseInt(tokenId))
      if (!property) return

      const totalShares = property.totalShares
      const dividendAmount = parseFloat(amount)
      const pricePerShare = dividendAmount / totalShares

      setDividendPreview({
        propertyName: property.name,
        totalShares: totalShares,
        totalAmount: dividendAmount,
        pricePerShare: pricePerShare.toFixed(6),
        estimatedRecipients: '~' + Math.ceil(totalShares * 0.1) // Rough estimate
      })
    } catch (error) {
      console.warn('Could not generate preview:', error)
    } finally {
      setLoadingPreview(false)
    }
  }

  const createProperty = async (e) => {
    e.preventDefault()

    if (!web3Service) {
      console.error('❌ [ERROR] Admin: Web3 service not initialized');
      toast.error('Web3 service not initialized')
      return
    }

    try {
      setLoading(true)

      // First create property in backend database
      const backendProperty = await ApiService.createProperty({
        name: propertyForm.name,
        description: propertyForm.description,
        location: propertyForm.location,
        totalValue: parseFloat(propertyForm.totalValue),
        totalShares: parseInt(propertyForm.totalShares),
        imageUrl: propertyForm.imageUrl && propertyForm.imageUrl.startsWith('http') ? propertyForm.imageUrl : '/vite.svg',
        documents: propertyForm.documents ? propertyForm.documents.split(',').map(doc => doc.trim()) : []
      })
      
      console.log('✅ [SUCCESS] Admin: Property created in backend:', backendProperty)

      // Then create and fractionalize on blockchain
      const receipt = await web3Service.createProperty({
        ...propertyForm,
        documents: propertyForm.documents ? propertyForm.documents.split(',').map(doc => doc.trim()) : []
      })
      
      console.log('✅ [SUCCESS] Admin: Property created and fractionalized on blockchain');

      // Update database with blockchain data

      // Extract tokenId from transaction events
      let tokenId = null
      let fractionalTokenAddress = null
      
      if (receipt.logs && receipt.logs.length > 0) {

        // Look for PropertyFractionalized event
        for (const log of receipt.logs) {
          try {
            const decoded = web3Service.contracts.realEstateFractionalization.interface.parseLog(log)

            if (decoded && decoded.name === 'PropertyFractionalized') {
              tokenId = decoded.args.propertyTokenId.toString()
              fractionalTokenAddress = decoded.args.fractionalTokenAddress

              break
            }
          } catch (e) {

            // Not our event, continue
          }
        }
      }
      
        // Fallback: get from contract state
        if (!tokenId || !fractionalTokenAddress) {

          try {
            // Wait longer for the transaction to be fully processed
            await new Promise(resolve => setTimeout(resolve, 3000))
            
            const totalProperties = await web3Service.contracts.propertyToken.getTotalProperties()

            if (totalProperties === 0n) {
              throw new Error('No properties found in contract - property creation may have failed')
            }
            
            // The new property should be the last one (totalProperties - 1)
            // But tokenId starts from 1, not 0
            tokenId = totalProperties.toString()

            // Check if property exists
            const propertyExists = await web3Service.contracts.propertyToken.propertyExists(tokenId)

            if (!propertyExists) {
              throw new Error(`Property with tokenId ${tokenId} does not exist`)
            }
            
            // Try multiple times to get the fractional token address
            let attempts = 0
            const maxAttempts = 10
            
            while (attempts < maxAttempts) {
              fractionalTokenAddress = await web3Service.contracts.realEstateFractionalization.fractionalTokens(tokenId)

              if (fractionalTokenAddress !== '0x0000000000000000000000000000000000000000') {
                break
              }
              
              attempts++
              if (attempts < maxAttempts) {

                await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
              }
            }
            
            if (fractionalTokenAddress === '0x0000000000000000000000000000000000000000') {
              console.error('❌ [ERROR] Admin: Property was not properly fractionalized after all attempts!')
              
              // Try to get more debugging info
              try {
                const debugInfo = await web3Service.debugPropertyCreation(tokenId)

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
    setShowConfirmDialog(true)
  }

  const confirmDistribution = async () => {
    if (!web3Service) {
      toast.error('Web3 service not initialized')
      return
    }

    // Validation
    if (!dividendForm.propertyTokenId) {
      toast.error('Please select a property')
      return
    }

    if (!dividendForm.description.trim()) {
      toast.error('Please enter a description')
      return
    }

    if (!dividendForm.amount || parseFloat(dividendForm.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    try {
      setLoading(true)
      setShowConfirmDialog(false)
      
      await web3Service.distributeDividends(
        parseInt(dividendForm.propertyTokenId),
        dividendForm.description,
        dividendForm.amount
      )
      
      toast.success('Dividends distributed successfully!')
      
      // Reset form and preview
      setDividendForm({
        propertyTokenId: '',
        description: '',
        amount: '',
      })
      setDividendPreview(null)
      setSelectedProperty(null)
      
    } catch (error) {
      console.error('Error distributing dividends:', error)
      toast.error('Failed to distribute dividends: ' + (error.reason || error.message))
    } finally {
      setLoading(false)
    }
  }

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true)

      const response = await ApiService.getProperties({ limit: 1000 }) // Get all properties
      console.log('🔍 [DEBUG] Admin: API response format:', response)
      console.log('🔍 [DEBUG] Admin: Response type:', typeof response)
      console.log('🔍 [DEBUG] Admin: Is array?', Array.isArray(response))

      // Extract properties from the response
      const propertiesList = response.properties || response || []
      console.log('🔍 [DEBUG] Admin: Properties list:', propertiesList)
      console.log('🔍 [DEBUG] Admin: Properties count:', propertiesList.length)
      setProperties(propertiesList)

      // Extract trading status from database properties
      const tradingStatusMap = {}
      for (const property of propertiesList) {
        if (property.tokenId) {
          // Use tradingEnabled from database instead of blockchain call
          tradingStatusMap[property.tokenId] = property.tradingEnabled || false
          console.log(`🔍 Trading status for ${property.name} (ID: ${property.tokenId}):`, property.tradingEnabled)
        }
      }
      setPropertyTradingStatus(tradingStatusMap)
      console.log('✅ Trading status extracted from database')
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

      // First, enable trading on the blockchain
      await web3Service.enableTrading(propertyTokenId)
      console.log('✅ [SUCCESS] Admin: Trading enabled on blockchain')
      
      // Then, update the database
      await ApiService.updateTradingStatus(propertyTokenId, true)
      console.log('✅ [SUCCESS] Admin: Trading status updated in database')
      
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

  const disableTrading = async (propertyTokenId) => {
    try {
      setLoading(true)

      // First, disable trading on the blockchain
      await web3Service.disableTrading(propertyTokenId)
      console.log('✅ [SUCCESS] Admin: Trading disabled on blockchain')
      
      // Then, update the database
      await ApiService.updateTradingStatus(propertyTokenId, false)
      console.log('✅ [SUCCESS] Admin: Trading status updated in database')
      
      toast.success('Trading disabled successfully!')
      
      // Refresh properties list
      await fetchProperties()
    } catch (error) {
      console.error('❌ [ERROR] Admin: Error disabling trading:', error)
      toast.error('Failed to disable trading: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (property) => {
    setEditingProperty(property)
    setEditForm({
      name: property.name,
      description: property.description,
      location: property.location,
      totalValue: property.totalValue.toString(),
      totalShares: property.totalShares.toString(),
      imageUrl: property.imageUrl || '',
      documents: property.documents ? property.documents.join(', ') : '',
    })
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setEditingProperty(null)
    setShowEditModal(false)
    setEditForm({
      name: '',
      description: '',
      location: '',
      totalValue: '',
      totalShares: '',
      imageUrl: '',
      documents: '',
    })
  }

  const updateProperty = async (e) => {
    e.preventDefault()

    if (!editingProperty) return

    try {
      setLoading(true)

      const updateData = {
        name: editForm.name,
        description: editForm.description,
        location: editForm.location,
        totalValue: parseFloat(editForm.totalValue),
        totalShares: parseInt(editForm.totalShares),
        imageUrl: editForm.imageUrl && editForm.imageUrl.startsWith('http') ? editForm.imageUrl : '/vite.svg',
        documents: editForm.documents ? editForm.documents.split(',').map(doc => doc.trim()).filter(doc => doc) : []
      }

      await ApiService.updateProperty(editingProperty._id, updateData)
      
      toast.success('Property updated successfully!')
      
      // Close modal and refresh properties list
      closeEditModal()
      await fetchProperties()
      
    } catch (error) {
      console.error('❌ [ERROR] Admin: Error updating property:', error)
      toast.error('Failed to update property: ' + error.message)
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Properties</h3>
                <p className="text-sm text-gray-500">
                  Showing {filteredProperties.length} of {properties.length} properties
                </p>
              </div>
              
              {/* Trading Status Filter */}
              <div className="flex items-center space-x-2">
                <label htmlFor="trading-status-filter" className="text-sm font-medium text-gray-700">
                  Filter by Status:
                </label>
                <select
                  id="trading-status-filter"
                  value={tradingStatusFilter}
                  onChange={(e) => setTradingStatusFilter(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Properties</option>
                  <option value="enabled">Trading Enabled</option>
                  <option value="disabled">Trading Disabled</option>
                  <option value="not-listed">Not Listed on Blockchain</option>
                </select>
              </div>
            </div>
            
            {loadingProperties ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading properties...</span>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-8">
                <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  {tradingStatusFilter === 'all' 
                    ? 'No properties found' 
                    : `No properties found with status: ${
                        tradingStatusFilter === 'enabled' ? 'Trading Enabled' :
                        tradingStatusFilter === 'disabled' ? 'Trading Disabled' :
                        tradingStatusFilter === 'not-listed' ? 'Not Listed on Blockchain' : 
                        'Selected Filter'
                      }`
                  }
                </p>
                {tradingStatusFilter !== 'all' && (
                  <button
                    onClick={() => setTradingStatusFilter('all')}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProperties.map((property) => (
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
                          {property.tokenId !== null && (
                            loadingTradingStatus ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <div className="animate-spin w-2 h-2 border border-yellow-600 border-t-transparent rounded-full mr-1"></div>
                                Checking...
                              </span>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                propertyTradingStatus[property.tokenId] 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {propertyTradingStatus[property.tokenId] ? (
                                  <>
                                    <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                                    Trading Enabled
                                  </>
                                ) : (
                                  <>
                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-1"></span>
                                    Trading Disabled
                                  </>
                                )}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(property)}
                          className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center"
                        >
                          <PencilIcon className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                        {property.tokenId !== null ? (
                          propertyTradingStatus[property.tokenId] ? (
                            <button
                              onClick={() => disableTrading(property.tokenId)}
                              disabled={loading}
                              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading ? 'Disabling...' : 'Disable Trading'}
                            </button>
                          ) : (
                            <button
                              onClick={() => enableTrading(property.tokenId)}
                              disabled={loading}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading ? 'Enabling...' : 'Enable Trading'}
                            </button>
                          )
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
            
            <form onSubmit={distributeDividends} className="space-y-6">
              {/* Property Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Property
                </label>
                <select
                  name="propertyTokenId"
                  value={dividendForm.propertyTokenId}
                  onChange={(e) => handlePropertySelection(e.target.value)}
                  required
                  className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  size="8"
                  style={{ 
                    height: '200px', 
                    overflowY: 'auto',
                    appearance: 'none',
                    backgroundImage: 'none'
                  }}
                >
                  <option value="">Choose a property...</option>
                  {properties
                    .filter(p => p.tokenId !== null) // Only show properties on blockchain
                    .sort((a, b) => a.tokenId - b.tokenId) // Sort by tokenId ascending (1, 2, 3...)
                    .map((property) => (
                      <option key={property.tokenId} value={property.tokenId}>
                        #{property.tokenId} - {property.name} ({property.totalShares} shares)
                      </option>
                    ))}
                </select>
                
                {/* Property Details */}
                {selectedProperty && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <img 
                        src={selectedProperty.imageUrl || '/vite.svg'} 
                        alt={selectedProperty.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{selectedProperty.name}</h4>
                        <p className="text-sm text-gray-600">{selectedProperty.location}</p>
                        <div className="flex space-x-4 mt-1 text-xs text-gray-500">
                          <span>Total Shares: {selectedProperty.totalShares}</span>
                          <span>Value: {selectedProperty.totalValue} ETH</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
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
                  placeholder="e.g., 'Q4 2024 Rental Income', 'Property Sale Profit'"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This description will be visible to all shareholders when they claim dividends
                </p>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount (ETH)
                </label>
                <input
                  type="number"
                  name="amount"
                  value={dividendForm.amount}
                  onChange={handleDividendFormChange}
                  required
                  step="0.001"
                  min="0.001"
                  className="input-field"
                  placeholder="0.000"
                />
              </div>

              {/* Distribution Preview */}
              {dividendPreview && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-3 flex items-center">
                    <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                    Distribution Preview
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Property:</span>
                      <p className="font-medium">{dividendPreview.propertyName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Amount:</span>
                      <p className="font-medium">{dividendPreview.totalAmount} ETH</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Shares:</span>
                      <p className="font-medium">{dividendPreview.totalShares}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Per Share:</span>
                      <p className="font-medium">{dividendPreview.pricePerShare} ETH</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs text-green-700">
                      <strong>Example:</strong> If someone owns 100 shares, they will receive {(parseFloat(dividendPreview.pricePerShare) * 100).toFixed(4)} ETH
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !dividendForm.propertyTokenId || !dividendForm.description || !dividendForm.amount}
                className="btn-primary w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                {loading ? 'Processing...' : 'Review & Distribute Dividends'}
              </button>
            </form>
          </div>

          {/* Confirmation Dialog */}
          {showConfirmDialog && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowConfirmDialog(false)}>
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
                <div className="mt-3 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                    <CurrencyDollarIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Confirm Dividend Distribution</h3>
                  
                  <div className="mt-4 text-left bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Property:</span>
                        <span className="font-medium">{selectedProperty?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Description:</span>
                        <span className="font-medium">{dividendForm.description}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium text-green-600">{dividendForm.amount} ETH</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500 mt-4">
                    This action will transfer {dividendForm.amount} ETH from your wallet to the dividend contract. This cannot be undone.
                  </p>
                  
                  <div className="items-center px-4 py-3 mt-6">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowConfirmDialog(false)}
                        className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmDistribution}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {loading ? 'Processing...' : 'Confirm & Distribute'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Property Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={closeEditModal}>
          <div className="relative top-8 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Edit Property</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={updateProperty} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleEditFormChange}
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
                    value={editForm.location}
                    onChange={handleEditFormChange}
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
                  value={editForm.description}
                  onChange={handleEditFormChange}
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
                    value={editForm.totalValue}
                    onChange={handleEditFormChange}
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
                    value={editForm.totalShares}
                    onChange={handleEditFormChange}
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
                  value={editForm.imageUrl}
                  onChange={handleEditFormChange}
                  className="input-field"
                  placeholder="Enter image URL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document URLs (comma-separated)
                </label>
                <input
                  type="text"
                  name="documents"
                  value={editForm.documents}
                  onChange={handleEditFormChange}
                  className="input-field"
                  placeholder="Enter document URLs separated by commas"
                />
              </div>

              {editingProperty && editingProperty.tokenId !== null && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This property is already created on the blockchain (Token ID: {editingProperty.tokenId}). 
                    Changes to total value and total shares will only affect the database record and won't update the blockchain.
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  {loading ? 'Updating...' : 'Update Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default Admin

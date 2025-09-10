import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import apiService from '../services/ApiService'
import toast from 'react-hot-toast'
import {
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'

const Properties = () => {
  const { web3Service, isConnected } = useWeb3()
  const { isAuthenticated } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    loadProperties()
  }, [])

  const loadProperties = async () => {
    try {
      setLoading(true)
      console.log('🔍 [DEBUG] Loading properties from database...')
      
      const response = await apiService.getProperties()
      console.log('🔍 [DEBUG] Properties response:', response)
      
      // Extract properties from the response
      const propertiesList = response.properties || response || []
      
      // Ensure we have an array and filter out any invalid properties
      const validProperties = Array.isArray(propertiesList) 
        ? propertiesList.filter(property => property && property._id)
        : []
      
      console.log('🔍 [DEBUG] Valid properties:', validProperties)
      setProperties(validProperties)

    } catch (error) {
      console.error('Error loading properties:', error)
      toast.error('Failed to load properties')
      setProperties([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const filteredProperties = properties.filter(property => {
    const matchesSearch = (property.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (property.location?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    
    let matchesFilter = true
    if (filterType === 'available') {
      matchesFilter = Number(property.sharesSold) < Number(property.totalShares)
    } else if (filterType === 'sold-out') {
      matchesFilter = Number(property.sharesSold) >= Number(property.totalShares)
    }

    return matchesSearch && matchesFilter
  })

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.createdAt - a.createdAt
      case 'oldest':
        return a.createdAt - b.createdAt
      case 'price-low':
        return parseFloat(a.totalValueFormatted) - parseFloat(b.totalValueFormatted)
      case 'price-high':
        return parseFloat(b.totalValueFormatted) - parseFloat(a.totalValueFormatted)
      case 'shares-available':
        return (Number(b.totalShares) - Number(b.sharesSold)) - (Number(a.totalShares) - Number(a.sharesSold))
      default:
        return 0
    }
  })

  const getAvailabilityStatus = (property) => {
    const totalShares = Number(property.totalShares)
    const sharesSold = Number(property.sharesSold)
    const availableShares = totalShares - sharesSold
    const percentageSold = (sharesSold / totalShares) * 100
    
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Available Properties</h1>
        <p className="mt-2 text-lg text-gray-600">
          Invest in premium real estate properties through fractional ownership
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search properties by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input-field"
            >
              <option value="all">All Properties</option>
              <option value="available">Available</option>
              <option value="sold-out">Sold Out</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="shares-available">Most Shares Available</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      {sortedProperties.length === 0 ? (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search criteria' 
              : 'No properties have been listed yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProperties.map((property) => {
            const availability = getAvailabilityStatus(property)
            const availableShares = Number(property.totalShares) - Number(property.sharesSold)
            const percentageSold = (Number(property.sharesSold) / Number(property.totalShares)) * 100

            return (
              <div key={property._id || property.id} className="card hover:shadow-xl transition-shadow duration-200">
                {/* Property Image */}
                <div className="aspect-w-16 aspect-h-9 mb-4">
                  <img
                    src={property.imageUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                    alt={property.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>

                {/* Property Info */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {property.name}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${availability.color}`}>
                      {availability.status}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    <span className="line-clamp-1">{property.location}</span>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2">
                    {property.description}
                  </p>

                  {/* Property Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                    <div>
                      <div className="text-sm text-gray-500">Total Value</div>
                      <div className="font-semibold text-gray-900">
                        ${property.totalValue.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Share Price</div>
                      <div className="font-semibold text-gray-900">
                        ${property.totalShares > 0 ? (property.totalValue / property.totalShares).toLocaleString() : '0'}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shares Sold</span>
                      <span className="font-medium text-gray-900">
                        {Number(property.sharesSold)} / {Number(property.totalShares)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(percentageSold, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {availableShares} shares remaining
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-3">
                    <Link
                      to={`/properties/${property._id || property.id}`}
                      className="w-full btn-primary flex items-center justify-center"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Stats Summary */}
      {properties.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{properties.length}</div>
              <div className="text-sm text-gray-600">Total Properties</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${properties.reduce((sum, p) => sum + (parseFloat(p.totalValueFormatted) || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {properties.reduce((sum, p) => sum + (Number(p.totalShares) || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Shares</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {properties.length > 0 ? Math.round(properties.reduce((sum, p) => {
                  const totalShares = Number(p.totalShares) || 0;
                  const sharesSold = Number(p.sharesSold) || 0;
                  return sum + (totalShares > 0 ? sharesSold / totalShares : 0);
                }, 0) / properties.length * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">Avg. Sold</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Properties

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import ApiService from '../services/ApiService'
import { formatStatDisplay } from '../utils/numberUtils'
import {
  BuildingOfficeIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  StarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

const Home = () => {
  const { isConnected, connectWallet } = useWeb3()
  const { isAuthenticated } = useAuth()
  
  // State for real-time statistics
  const [stats, setStats] = useState([
    { name: 'Properties Listed', value: '50+', loading: true },
    { name: 'Total Value', value: '$100M+', loading: true },
    { name: 'Active Investors', value: '1,000+', loading: true },
  ])
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const features = [
    {
      name: 'Property Tokenization',
      description: 'Convert real estate properties into tradeable digital tokens on the blockchain.',
      icon: BuildingOfficeIcon,
    },
    {
      name: 'Fractional Ownership',
      description: 'Own a fraction of premium properties with minimal investment requirements.',
      icon: ChartBarIcon,
    },
    {
      name: 'Dividend Distribution',
      description: 'Receive automatic dividend payments from rental income and property appreciation.',
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Secure Trading',
      description: 'Trade your fractional shares on our secure, decentralized trading platform.',
      icon: ShieldCheckIcon,
    },
  ]

  // Function to fetch platform statistics
  const fetchPlatformStats = async () => {
    try {
      setIsLoadingStats(true)
      setStatsError(null)
      
      const data = await ApiService.getPlatformStats()
      
      const updatedStats = [
        { 
          name: 'Properties Listed', 
          value: formatStatDisplay(data.propertiesListed, 'count'),
          loading: false 
        },
        { 
          name: 'Total Value', 
          value: formatStatDisplay(data.totalValue, 'currency'),
          loading: false 
        },
        { 
          name: 'Active Investors', 
          value: formatStatDisplay(data.activeInvestors, 'count'),
          loading: false 
        },
      ]
      
      setStats(updatedStats)
      setLastUpdated(new Date(data.lastUpdated))
    } catch (error) {
      console.error('Error fetching platform stats:', error)
      setStatsError('Failed to load statistics')
      
      // Fallback to default values if API fails
      const fallbackStats = [
        { name: 'Properties Listed', value: '0', loading: false },
        { name: 'Total Value', value: '$0', loading: false },
        { name: 'Active Investors', value: '0', loading: false },
      ]
      setStats(fallbackStats)
    } finally {
      setIsLoadingStats(false)
    }
  }

  // Fetch stats on component mount
  useEffect(() => {
    fetchPlatformStats()
  }, [])

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPlatformStats()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  const testimonials = [
    {
      content: 'This platform has revolutionized how I invest in real estate. I can now own shares in premium properties I never could have afforded alone.',
      author: 'Sarah Johnson',
      role: 'Real Estate Investor',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
    {
      content: 'The dividend distribution system is seamless. I receive regular payments from my property investments automatically.',
      author: 'Michael Chen',
      role: 'Portfolio Manager',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
    {
      content: 'The trading platform is intuitive and secure. I can easily buy and sell my fractional shares whenever I need liquidity.',
      author: 'Emily Rodriguez',
      role: 'Financial Advisor',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <div className="gradient-bg">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Fractionalize Real Estate
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-blue-100">
              Own shares in premium real estate properties, earn dividends, and trade your fractional ownership 
              on our decentralized platform built on Ethereum blockchain.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {isAuthenticated ? (
                <Link
                  to="/properties"
                  className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Explore Properties
                  <ArrowRightIcon className="ml-2 h-4 w-4 inline" />
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Get Started
                  <ArrowRightIcon className="ml-2 h-4 w-4 inline" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats section */}
      <div className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Stats header with refresh button */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Platform Statistics</h2>
              {lastUpdated && (
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={fetchPlatformStats}
              disabled={isLoadingStats}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowPathIcon 
                className={`h-4 w-4 mr-2 ${isLoadingStats ? 'animate-spin' : ''}`}
              />
              {isLoadingStats ? 'Updating...' : 'Refresh'}
            </button>
          </div>

          {/* Error message */}
          {statsError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{statsError}</p>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.name} className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {stat.loading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-gray-300 rounded w-16 mx-auto"></div>
                    </div>
                  ) : (
                    <span className="transition-all duration-500 ease-in-out">
                      {stat.value}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-2">{stat.name}</div>
              </div>
            ))}
          </div>

          {/* Live indicator */}
          <div className="flex items-center justify-center mt-6">
            <div className="flex items-center text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Live data • Auto-refreshes every 30 seconds
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Why Choose Our Platform?
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Experience the future of real estate investment with our innovative blockchain-based platform.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.name} className="card text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{feature.name}</h3>
                <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works section */}
      <div className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Get started with fractional real estate investment in three simple steps.
            </p>
          </div>
          <div className="mt-16">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">Connect Wallet</h3>
                <p className="mt-2 text-gray-600">
                  Connect your MetaMask wallet to access the platform and start investing.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">Browse Properties</h3>
                <p className="mt-2 text-gray-600">
                  Explore available properties and choose investments that match your portfolio goals.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">Invest & Earn</h3>
                <p className="mt-2 text-gray-600">
                  Purchase fractional shares and start earning dividends from rental income and appreciation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials section */}
      <div className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              What Our Investors Say
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Join thousands of satisfied investors who have transformed their real estate investment strategy.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <img
                      className="h-10 w-10 rounded-full"
                      src={testimonial.avatar}
                      alt={testimonial.author}
                    />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{testimonial.author}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                  <div className="ml-auto">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <blockquote className="mt-4 text-gray-600">
                  <p>"{testimonial.content}"</p>
                </blockquote>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="gradient-bg">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to Start Investing?
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              Join the future of real estate investment today. Start with as little as $100.
            </p>
            <div className="mt-8">
              {isAuthenticated ? (
                <Link
                  to="/properties"
                  className="rounded-md bg-white px-8 py-3 text-lg font-semibold text-blue-600 shadow-sm hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Browse Properties
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="rounded-md bg-white px-8 py-3 text-lg font-semibold text-blue-600 shadow-sm hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home

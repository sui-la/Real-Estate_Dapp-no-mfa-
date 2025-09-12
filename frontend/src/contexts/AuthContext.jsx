import React, { createContext, useContext, useState, useEffect } from 'react'
import { useWeb3 } from './Web3Context'
import toast from 'react-hot-toast'
import ApiService from '../services/ApiService'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const { account, isConnected, disconnectWallet } = useWeb3()
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check for existing token on app load
  useEffect(() => {
    checkExistingAuth()
  }, [])

  // Handle wallet connection changes
  useEffect(() => {
    if (isConnected && account) {
      setIsWalletConnected(true)
      // If user is already logged in with email, link their wallet
      if (isAuthenticated && user) {
        linkWalletToAccount(account)
      }
    } else {
      setIsWalletConnected(false)
    }
  }, [isConnected, account, isAuthenticated, user])

  const checkExistingAuth = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        setIsLoading(true)
        // Verify token with backend and get user data
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const userData = await response.json()
          setUser(userData.user)
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem('token')
        }
      } catch (error) {
        console.error('Token verification failed:', error)
        localStorage.removeItem('token')
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Email/Password Registration
  const register = async (userData) => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Registration failed')
      }
      
      const data = await response.json()
      
      // Store JWT token
      localStorage.setItem('token', data.token)
      
      setUser(data.user)
      setIsAuthenticated(true)
      
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Email/Password Login
  const login = async (credentials) => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Login failed')
      }
      
      const data = await response.json()
      
      // Store JWT token
      localStorage.setItem('token', data.token)
      
      setUser(data.user)
      setIsAuthenticated(true)
      
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Link wallet to existing email account
  const linkWalletToAccount = async (walletAddress) => {
    try {
      console.log('🔗 linkWalletToAccount called with:', walletAddress)
      const token = localStorage.getItem('token')
      if (!token) {
        console.log('❌ No token found, aborting wallet link')
        return
      }
      console.log('✅ Token found, proceeding with wallet link')
      
      // First check if this wallet is already linked to any account
      console.log('🔍 Checking if wallet is already linked...')
      const checkResponse = await fetch(`${import.meta.env.VITE_API_URL}/auth/check-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ walletAddress })
      })
      console.log('📡 Check wallet response:', checkResponse.status)
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json()
        console.log('📊 Check wallet data:', checkData)
        if (checkData.isLinked && checkData.userId !== user?.id) {
          console.log('❌ Wallet belongs to another user')
          toast.error('This wallet is already linked to another account!')
          // Disconnect the wallet since it belongs to someone else
          if (disconnectWallet) {
            disconnectWallet()
          }
          return
        }
        
        // If wallet is already linked to current user, just update state
        if (checkData.isLinked && checkData.userId === user?.id) {
          console.log('✅ Wallet already linked to current user')
          toast.success('Wallet already linked to your account!')
          return
        }
        
        console.log('✅ Wallet is available for linking')
      }
      
      // Proceed with linking if wallet is not linked to anyone
      console.log('🔗 Proceeding to link wallet to account...')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/link-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ walletAddress })
      })
      console.log('📡 Link wallet response:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Wallet linked successfully:', data.user)
        setUser(data.user)
        toast.success('Wallet linked to your account!')
      } else {
        const errorData = await response.json()
        console.log('❌ Wallet link failed:', errorData)
        toast.error(errorData.error || 'Failed to link wallet')
        // Disconnect wallet on error
        if (disconnectWallet) {
          disconnectWallet()
        }
      }
    } catch (error) {
      console.error('❌ Wallet linking error:', error)
      toast.error('Failed to link wallet')
      // Disconnect wallet on error
      if (disconnectWallet) {
        disconnectWallet()
      }
    }
  }

  // Check if user can perform trading actions (requires wallet)
  const canTrade = () => {
    return isAuthenticated && isWalletConnected && account
  }

  // Require wallet connection for trading actions
  const requireWallet = () => {
    if (!isAuthenticated) {
      toast.error('Please login first')
      return false
    }
    if (!isWalletConnected) {
      toast.error('Please connect your wallet to trade')
      return false
    }
    return true
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    setIsWalletConnected(false)
    localStorage.removeItem('token') // Clear JWT token
    
    // Also disconnect the wallet
    if (isConnected) {
      disconnectWallet()
    } else {
      toast.success('Successfully logged out!')
    }
  }

  const updateProfile = async (profileData) => {
    try {
      setIsLoading(true)
      
      // Get JWT token from localStorage
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Make API call to update profile
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email,
          profile: {
            phone: profileData.phone,
            address: profileData.address
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const updatedUser = await response.json()
      
      // Update local state with the response from backend
      setUser(updatedUser)
      
      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const checkAdminStatus = async () => {
    try {
      // Use the user's admin status from backend
      return user?.isAdmin || false
    } catch (error) {
      console.error('Admin check error:', error)
      return false
    }
  }

  const value = {
    user,
    isAuthenticated,
    isWalletConnected,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    checkAdminStatus,
    canTrade,
    requireWallet,
    linkWalletToAccount,
    account
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

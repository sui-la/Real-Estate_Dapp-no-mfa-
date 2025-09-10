import React, { createContext, useContext, useState, useEffect } from 'react'
import { useWeb3 } from './Web3Context'
import toast from 'react-hot-toast'
import ApiService from '../services/ApiService'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const { account, isConnected } = useWeb3()
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isConnected && account) {
      // Authenticate with backend when wallet connects
      authenticateWithBackend(account)
    } else {
      setUser(null)
      setIsAuthenticated(false)
    }
  }, [isConnected, account])

  const authenticateWithBackend = async (walletAddress) => {
    try {
      setIsLoading(true)
      
      // Create a simple signature for authentication (in production, you'd sign a specific message)
      const message = `Sign this message to authenticate with Real Estate dApp: ${Date.now()}`
      
      // For demo purposes, we'll use a mock signature
      // In production, you'd get the actual signature from MetaMask
      const mockSignature = `0x${Math.random().toString(16).substr(2, 130)}`
      
      // Call backend wallet-login endpoint
      const data = await ApiService.walletLogin(walletAddress, mockSignature)
      
      // Store the JWT token
      localStorage.setItem('token', data.token)
      
      setUser({
        address: walletAddress,
        isAdmin: data.user.isAdmin,
        profile: {
          name: data.user.name,
          email: data.user.email,
          avatar: '',
        }
      })
      setIsAuthenticated(true)
      
      console.log('✅ User authenticated:', data.user)
      toast.success('Successfully authenticated!')
      
    } catch (error) {
      console.error('Authentication error:', error)
      toast.error('Authentication failed')
      
      // Fallback to local state if backend is not available
      setUser({
        address: walletAddress,
        isAdmin: walletAddress.toLowerCase() === import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase(),
        profile: {
          name: `User ${walletAddress.slice(0, 6)}`,
          email: `${walletAddress}@wallet.local`,
          avatar: '',
        }
      })
      setIsAuthenticated(true)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (userData) => {
    try {
      setIsLoading(true)
      
      // In a real application, you would:
      // 1. Sign a message with the wallet
      // 2. Send the signature to your backend
      // 3. Backend verifies the signature and returns a JWT token
      // 4. Store the JWT token for API calls
      
      // For demo purposes, we'll just set the user data
      setUser({
        address: account,
        ...userData,
        isAdmin: userData?.isAdmin || false,
      })
      setIsAuthenticated(true)
      
      toast.success('Successfully logged in!')
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Failed to login')
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    toast.success('Successfully logged out!')
  }

  const updateProfile = async (profileData) => {
    try {
      setIsLoading(true)
      
      // In a real application, you would update the profile on your backend
      setUser(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          ...profileData
        }
      }))
      
      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('Failed to update profile')
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
    isLoading,
    login,
    logout,
    updateProfile,
    checkAdminStatus,
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

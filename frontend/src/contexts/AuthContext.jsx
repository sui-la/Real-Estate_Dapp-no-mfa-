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
  const [isLinkingWallet, setIsLinkingWallet] = useState(false)

  // Check for existing token on app load
  useEffect(() => {
    checkExistingAuth()
  }, [])

  // Handle wallet connection changes
  useEffect(() => {
    if (isConnected && account) {
      setIsWalletConnected(true)
      // If user is already logged in with email, link their wallet
      // Only link if wallet is different from user's current wallet and not already linking
      if (isAuthenticated && user && !isLinkingWallet && 
          user.walletAddress?.toLowerCase() !== account.toLowerCase()) {
        linkWalletToAccount(account)
      }
    } else {
      setIsWalletConnected(false)
    }
  }, [isConnected, account, isAuthenticated, user, isLinkingWallet])

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
    if (isLinkingWallet) {
      console.log('🔄 Already linking wallet, skipping...')
      return
    }
    
    try {
      setIsLinkingWallet(true)
      console.log('🔗 linkWalletToAccount called with:', walletAddress)
      const token = localStorage.getItem('token')
      if (!token) {
        console.log('❌ No token found, aborting wallet link')
        setIsLinkingWallet(false)
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
          
          // Offer to switch to the account that owns this wallet
          const shouldSwitch = window.confirm(
            `This wallet is linked to another account. Would you like to switch to that account?\n\nClick OK to switch accounts, or Cancel to disconnect the wallet.`
          )
          
          if (shouldSwitch) {
            // Switch to the account that owns this wallet
            await switchToWalletOwner(checkData.userId)
          } else {
            toast.error('Wallet disconnected - it belongs to another account')
            // Disconnect the wallet since it belongs to someone else
            if (disconnectWallet) {
              disconnectWallet()
            }
          }
          return
        }
        
        // If wallet is already linked to current user, just update state
        if (checkData.isLinked && checkData.userId === user?.id) {
          console.log('✅ Wallet already linked to current user')
          // Don't show toast for already linked wallets to prevent spam
          setIsLinkingWallet(false)
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
    } finally {
      setIsLinkingWallet(false)
    }
  }

  // Switch to the user account that owns the connected wallet
  const switchToWalletOwner = async (userId) => {
    try {
      console.log('🔄 Switching to wallet owner:', userId)
      
      // Fetch the user data for the wallet owner
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/user/${userId}`)
      
      if (response.ok) {
        const userData = await response.json()
        
        // Create a token for this user (this would need proper authentication in production)
        // For development, we'll simulate the switch
        const loginResponse = await fetch(`${import.meta.env.VITE_API_URL}/auth/wallet-switch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            userId: userId,
            walletAddress: account 
          })
        })
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json()
          localStorage.setItem('token', loginData.token)
          setUser(loginData.user)
          setIsAuthenticated(true)
          toast.success(`Switched to account: ${loginData.user.name}`)
        } else {
          const errorData = await loginResponse.json()
          toast.error(errorData.error || 'Failed to switch accounts')
          if (disconnectWallet) {
            disconnectWallet()
          }
        }
      } else {
        toast.error('Failed to switch accounts')
        if (disconnectWallet) {
          disconnectWallet()
        }
      }
    } catch (error) {
      console.error('Error switching to wallet owner:', error)
      toast.error('Failed to switch accounts')
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

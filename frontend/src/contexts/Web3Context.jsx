import React, { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import Web3Service from '../services/Web3Service'

const Web3Context = createContext()

// Contract ABIs (simplified for demo - in production, these would be imported from compiled contracts)
const REAL_ESTATE_FRACTIONALIZATION_ABI = [
  // Essential functions for the app to work
  "function createAndFractionalizeProperty(string name, string description, string location, uint256 totalValue, uint256 totalShares, string imageUrl, string[] documents, string fractionalTokenName, string fractionalTokenSymbol) external returns (uint256, address)",
  "function purchaseShares(uint256 propertyTokenId, uint256 shares) external payable",
  "function getPropertyDetails(uint256 propertyTokenId) external view returns (tuple(uint256,string,string,string,uint256,uint256,uint256,address,bool,uint256,string,string[]), address, bool)",
  "function getUserOwnershipInfo(address user, uint256 propertyTokenId) external view returns (uint256, uint256, uint256)",
  "function getContractAddresses() external view returns (address, address, address)",
  "function fractionalTokens(uint256) external view returns (address)",
  "function isPropertyFractionalized(uint256) external view returns (bool)",
  
  // Additional functions
  "function sellShares(uint256 propertyTokenId, uint256 shares) external",
  "function createSellOrder(uint256 propertyTokenId, uint256 shares, uint256 pricePerShare, uint256 expiresIn) external returns (uint256)",
  "function createBuyOrder(uint256 propertyTokenId, uint256 shares, uint256 pricePerShare, uint256 expiresIn) external payable returns (uint256)",
  "function distributeDividends(uint256 propertyTokenId, string description) external payable",
  "function claimDividend(uint256 dividendId) external",
  "function batchClaimDividends(uint256[] dividendIds) external",
  "function getActiveOrders(uint256 propertyTokenId) external view returns (uint256[])",
  "function getPropertyDividends(uint256 propertyTokenId) external view returns (uint256[])",
  "function getTotalClaimableDividends(address user) external view returns (uint256)",
  "function enableTrading(uint256 propertyTokenId) external",
  "function disableTrading(uint256 propertyTokenId) external"
]

const PROPERTY_TOKEN_ABI = [
  "function getProperty(uint256 tokenId) external view returns (tuple(uint256 tokenId, string name, string description, string location, uint256 totalValue, uint256 totalShares, uint256 sharesSold, address originalOwner, bool isActive, uint256 createdAt, string imageUrl, string[] documents))",
  "function getTotalProperties() external view returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function propertyExists(uint256 tokenId) external view returns (bool)"
]

const FRACTIONAL_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function sharePrice() external view returns (uint256)",
  "function tradingEnabled() external view returns (bool)",
  "function getOwnershipPercentage(address shareholder) external view returns (uint256)",
  "function getPropertyValueOwned(address shareholder) external view returns (uint256)",
  "function getClaimableDividends(address shareholder) external view returns (uint256)",
  "function purchaseShares(uint256 amount) external payable",
  "function sellShares(uint256 amount) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
]

const TRADING_PLATFORM_ABI = [
  "function createSellOrder(uint256 propertyTokenId, address fractionalTokenAddress, uint256 shares, uint256 pricePerShare, uint256 expiresIn) external returns (uint256)",
  "function createBuyOrder(uint256 propertyTokenId, address fractionalTokenAddress, uint256 shares, uint256 pricePerShare, uint256 expiresIn) external payable returns (uint256)",
  "function fillSellOrder(uint256 orderId) external payable",
  "function fillBuyOrder(uint256 orderId) external",
  "function cancelOrder(uint256 orderId) external",
  "function getActiveOrders(uint256 propertyTokenId) external view returns (uint256[] memory)",
  "function getOrder(uint256 orderId) external view returns (tuple(uint256 orderId, address seller, address buyer, uint256 propertyTokenId, address fractionalTokenAddress, uint256 shares, uint256 pricePerShare, bool isBuyOrder, bool isActive, uint256 createdAt, uint256 expiresAt))",
  "function platformFee() external view returns (uint256)",
  "function updatePlatformFee(uint256 newFee) external",
  "function withdrawFees() external",
  "function getContractBalance() external view returns (uint256)"
]

const DIVIDEND_DISTRIBUTOR_ABI = [
  "function createDividend(uint256 propertyTokenId, address fractionalTokenAddress, string memory description) external payable",
  "function claimDividend(uint256 dividendId) external",
  "function batchClaimDividends(uint256[] memory dividendIds) external",
  "function getClaimableDividend(address user, uint256 dividendId) external view returns (uint256)",
  "function getTotalClaimableDividends(address user) external view returns (uint256)",
  "function getPropertyDividends(uint256 propertyTokenId) external view returns (uint256[] memory)",
  "function getDividend(uint256 dividendId) external view returns (tuple(uint256 propertyTokenId, address fractionalTokenAddress, uint256 totalAmount, uint256 distributedAmount, uint256 timestamp, string description, bool isActive))",
  "function getTotalDividends() external view returns (uint256)",
  "function deactivateDividend(uint256 dividendId) external",
  "function withdrawUnclaimedDividend(uint256 dividendId, uint256 amount) external",
  "function hasClaimedDividend(address, uint256) external view returns (bool)"
]

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [contracts, setContracts] = useState({})
  const [web3Service, setWeb3Service] = useState(null)

  // Contract addresses (from environment variables, updated by deployment script)
  const CONTRACT_ADDRESSES = {
    RealEstateFractionalization: import.meta.env.VITE_MAIN_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    PropertyToken: import.meta.env.VITE_PROPERTY_TOKEN_ADDRESS || "0xa16E02E87b7454126E5E10d957A927A7F5B5d2be",
    TradingPlatform: import.meta.env.VITE_TRADING_PLATFORM_ADDRESS || "0xB7A5bd0345EF1Cc5E66bf61BdeC17D2461fBd968",
    DividendDistributor: import.meta.env.VITE_DIVIDEND_DISTRIBUTOR_ADDRESS || "0xeEBe00Ac0756308ac4AaBfD76c05c4F3088B8883",
  }

  useEffect(() => {
    initializeWeb3()
  }, [])

  const initializeWeb3 = async () => {
    try {
      let web3Provider

      // Check for MetaMask first
      if (typeof window.ethereum !== 'undefined') {
        console.log('🔗 MetaMask detected, initializing Web3Provider...')
        web3Provider = new ethers.BrowserProvider(window.ethereum)
        
        // Check if already connected (only for MetaMask)
        try {
          const accounts = await web3Provider.listAccounts()
          console.log('👥 MetaMask accounts:', accounts.length)
          if (accounts.length > 0) {
            setProvider(web3Provider)
            await connectWallet()
          } else {
            setProvider(web3Provider)
          }

          // Listen for account changes
          window.ethereum.on('accountsChanged', handleAccountsChanged)
          window.ethereum.on('chainChanged', handleChainChanged)
        } catch (error) {
          console.warn('MetaMask connection check failed:', error)
          setProvider(web3Provider)
        }
      } else {
        // Fallback to local Hardhat node for development
        console.log('🔧 No MetaMask detected, trying local Hardhat node...')
        const localProvider = new ethers.JsonRpcProvider('http://localhost:8545')
        
        // Test if Hardhat node is available
        try {
          await localProvider.getNetwork()
          console.log('✅ Hardhat node connected successfully')
          web3Provider = localProvider
          setProvider(web3Provider)
          
          // Auto-connect to local Hardhat for development
          await connectWallet()
        } catch (error) {
          console.error('❌ Hardhat node not available:', error)
          // Don't show error toast immediately, let user try to connect first
        }
      }

      console.log('✅ Web3 initialization completed, provider set:', !!web3Provider)

    } catch (error) {
      console.error('❌ Error initializing Web3:', error)
      // Don't show error toast immediately, let user try to connect first
    }
  }

  const connectWallet = async () => {
    // Get the current provider (either from state or create a new one)
    let currentProvider = provider
    
    if (!currentProvider) {
      // Try to create provider if not available
      try {
        console.log('No provider available, creating new one...')
        
        if (typeof window.ethereum !== 'undefined') {
          currentProvider = new ethers.BrowserProvider(window.ethereum)
        } else {
          currentProvider = new ethers.JsonRpcProvider('http://localhost:8545')
          // Test if Hardhat node is available
          await currentProvider.getNetwork()
        }
        
        // Update the provider state
        setProvider(currentProvider)
      } catch (error) {
        console.error('Could not create provider:', error)
        toast.error('Web3 provider not available. Please install MetaMask or start Hardhat node.')
        return
      }
    }

    try {
      setIsLoading(true)
      
      let accounts = []
      
      // Handle MetaMask connection
      if (typeof window.ethereum !== 'undefined') {
        accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        })
      } else {
        // For local Hardhat node, use the first account
        const signer = await currentProvider.getSigner(0)
        const address = await signer.getAddress()
        accounts = [address]
      }

      if (accounts.length > 0) {
        const web3Signer = await currentProvider.getSigner()
        const address = await web3Signer.getAddress()
        const network = await currentProvider.getNetwork()

        setSigner(web3Signer)
        setAccount(address)
        setChainId(Number(network.chainId))
        setIsConnected(true)

        // Initialize contracts
        await initializeContracts(web3Signer)

        toast.success(`Connected to ${address.slice(0, 6)}...${address.slice(-4)}`)
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      toast.error('Failed to connect wallet')
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    setSigner(null)
    setAccount(null)
    setChainId(null)
    setIsConnected(false)
    setContracts({})
    setWeb3Service(null)
    toast.success('Wallet disconnected')
  }

  const initializeContracts = async (web3Signer) => {
    try {
      console.log('🏗️  Initializing contracts with addresses:', CONTRACT_ADDRESSES)
      
      const realEstateContract = new ethers.Contract(
        CONTRACT_ADDRESSES.RealEstateFractionalization,
        REAL_ESTATE_FRACTIONALIZATION_ABI,
        web3Signer
      )

      console.log('✅ Main contract initialized:', CONTRACT_ADDRESSES.RealEstateFractionalization)

      // Get additional contract addresses from the main contract
      let propertyTokenAddress, tradingPlatformAddress, dividendDistributorAddress
      
      try {
        console.log('🔍 Getting contract addresses from main contract...')
        ;[propertyTokenAddress, tradingPlatformAddress, dividendDistributorAddress] = 
          await realEstateContract.getContractAddresses()
        console.log('✅ Contract addresses retrieved:', {
          propertyTokenAddress,
          tradingPlatformAddress,
          dividendDistributorAddress
        })
      } catch (error) {
        console.warn('⚠️  Could not get contract addresses from main contract, using environment addresses:', error)
        // Fallback to environment addresses
        propertyTokenAddress = CONTRACT_ADDRESSES.PropertyToken
        tradingPlatformAddress = CONTRACT_ADDRESSES.TradingPlatform
        dividendDistributorAddress = CONTRACT_ADDRESSES.DividendDistributor
        console.log('🔄 Using fallback addresses:', {
          propertyTokenAddress,
          tradingPlatformAddress,
          dividendDistributorAddress
        })
      }

      const propertyTokenContract = new ethers.Contract(
        propertyTokenAddress,
        PROPERTY_TOKEN_ABI,
        web3Signer
      )

      const tradingPlatformContract = new ethers.Contract(
        tradingPlatformAddress,
        TRADING_PLATFORM_ABI,
        web3Signer
      )

      const dividendDistributorContract = new ethers.Contract(
        dividendDistributorAddress,
        DIVIDEND_DISTRIBUTOR_ABI,
        web3Signer
      )

      const contractInstances = {
        realEstateFractionalization: realEstateContract,
        propertyToken: propertyTokenContract,
        tradingPlatform: tradingPlatformContract,
        dividendDistributor: dividendDistributorContract,
        signer: web3Signer
      }

      setContracts(contractInstances)
      setWeb3Service(new Web3Service(contractInstances, web3Signer))
      
    } catch (error) {
      console.error('Error initializing contracts:', error)
      toast.error('Failed to initialize contracts')
    }
  }

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet()
    } else {
      connectWallet()
    }
  }

  const handleChainChanged = (chainId) => {
    setChainId(Number(chainId))
    window.location.reload()
  }

  const switchToLocalhost = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '31337' }],
      })
    } catch (switchError) {
      // If the chain doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '31337',
                chainName: 'Localhost',
                rpcUrls: ['http://127.0.0.1:8545'],
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                blockExplorerUrls: null,
              },
            ],
          })
        } catch (addError) {
          console.error('Error adding localhost network:', addError)
          toast.error('Failed to add localhost network')
        }
      } else {
        console.error('Error switching to localhost:', switchError)
        toast.error('Failed to switch to localhost network')
      }
    }
  }

  const getFractionalTokenContract = async (fractionalTokenAddress) => {
    if (!signer) return null
    
    try {
      return new ethers.Contract(
        fractionalTokenAddress,
        FRACTIONAL_TOKEN_ABI,
        signer
      )
    } catch (error) {
      console.error('Error creating fractional token contract:', error)
      return null
    }
  }

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatEther = (value) => {
    if (!value) return '0'
    return ethers.formatEther(value)
  }

  const parseEther = (value) => {
    return ethers.parseEther(value.toString())
  }

  const value = {
    // State
    provider,
    signer,
    account,
    chainId,
    isConnected,
    isLoading,
    contracts,
    web3Service,
    
    // Methods
    connectWallet,
    disconnectWallet,
    switchToLocalhost,
    getFractionalTokenContract,
    formatAddress,
    formatEther,
    parseEther,
  }

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  )
}

export const useWeb3 = () => {
  const context = useContext(Web3Context)
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider')
  }
  return context
}

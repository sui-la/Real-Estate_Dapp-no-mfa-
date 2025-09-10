import React, { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import Web3Service from '../services/Web3Service'

const Web3Context = createContext()

// Contract ABIs (simplified for demo - in production, these would be imported from compiled contracts)
const REAL_ESTATE_FRACTIONALIZATION_ABI = [
  "function createAndFractionalizeProperty(string memory name, string memory description, string memory location, uint256 totalValue, uint256 totalShares, string memory imageUrl, string[] memory documents, string memory fractionalTokenName, string memory fractionalTokenSymbol) external returns (uint256 propertyTokenId, address fractionalTokenAddress)",
  "function purchaseShares(uint256 propertyTokenId, uint256 shares) external payable",
  "function sellShares(uint256 propertyTokenId, uint256 shares) external",
  "function createSellOrder(uint256 propertyTokenId, uint256 shares, uint256 pricePerShare, uint256 expiresIn) external returns (uint256)",
  "function createBuyOrder(uint256 propertyTokenId, uint256 shares, uint256 pricePerShare, uint256 expiresIn) external payable returns (uint256)",
  "function distributeDividends(uint256 propertyTokenId, string memory description) external payable",
  "function claimDividend(uint256 dividendId) external",
  "function batchClaimDividends(uint256[] memory dividendIds) external",
  "function getPropertyDetails(uint256 propertyTokenId) external view returns (tuple(uint256 tokenId, string name, string description, string location, uint256 totalValue, uint256 totalShares, uint256 sharesSold, address originalOwner, bool isActive, uint256 createdAt, string imageUrl, string[] documents) property, address fractionalTokenAddress, bool isFractionalized)",
  "function getUserOwnershipInfo(address user, uint256 propertyTokenId) external view returns (uint256 ownershipPercentage, uint256 sharesOwned, uint256 propertyValueOwned)",
  "function getActiveOrders(uint256 propertyTokenId) external view returns (uint256[] memory)",
  "function getPropertyDividends(uint256 propertyTokenId) external view returns (uint256[] memory)",
  "function getTotalClaimableDividends(address user) external view returns (uint256)",
  "function getContractAddresses() external view returns (address propertyTokenAddress, address tradingPlatformAddress, address dividendDistributorAddress)",
  "function fractionalTokens(uint256) external view returns (address)",
  "function isPropertyFractionalized(uint256) external view returns (bool)",
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
  "function withdrawFees() external"
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
  "function withdrawUnclaimedDividend(uint256 dividendId, uint256 amount) external"
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

  // Contract addresses (automatically updated by deployment script)
  const CONTRACT_ADDRESSES = {
    RealEstateFractionalization: "0x1613beB3B2C4f22Ee086B2b38C1476A3cE7f78E8", // FRESH DEPLOYMENT
    PropertyToken: "0x9467A509DA43CB50EB332187602534991Be1fEa4", // FRESH DEPLOYMENT
    TradingPlatform: "0x7bc9A7e2bDf4c4f6b1Ff8Cff272310a4b17F783d", // FRESH DEPLOYMENT
    DividendDistributor: "0x8b89239aca8527bFa52A144faEc4B0EB99052D03", // FRESH DEPLOYMENT
  }

  
  // Debug logging
  console.log('🔍 [DEBUG] Web3Context: Environment variables:', {
    VITE_MAIN_CONTRACT_ADDRESS: import.meta.env.VITE_MAIN_CONTRACT_ADDRESS,
    VITE_PROPERTY_TOKEN_ADDRESS: import.meta.env.VITE_PROPERTY_TOKEN_ADDRESS,
    VITE_TRADING_PLATFORM_ADDRESS: import.meta.env.VITE_TRADING_PLATFORM_ADDRESS,
    VITE_DIVIDEND_DISTRIBUTOR_ADDRESS: import.meta.env.VITE_DIVIDEND_DISTRIBUTOR_ADDRESS
  })
  console.log('🔍 [DEBUG] Web3Context: Final contract addresses:', CONTRACT_ADDRESSES)
  console.log('🔍 [DEBUG] Web3Context: CACHE BUST - Timestamp:', Date.now())

  useEffect(() => {
    initializeWeb3()
  }, [])

  const initializeWeb3 = async () => {
    try {
      let web3Provider

      // Check for MetaMask first
      if (typeof window.ethereum !== 'undefined') {
        web3Provider = new ethers.BrowserProvider(window.ethereum)
        console.log('Using MetaMask provider')
      } else {
        // Fallback to local Hardhat node for development
        const localProvider = new ethers.JsonRpcProvider('http://localhost:8545')
        
        // Test if Hardhat node is available
        try {
          await localProvider.getNetwork()
          web3Provider = localProvider
          console.log('Using local Hardhat provider')
        } catch (error) {
          console.error('Hardhat node not available:', error)
          toast.error('Please install MetaMask or start Hardhat node')
          return
        }
      }

      setProvider(web3Provider)

      // Check if already connected (only for MetaMask)
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await web3Provider.listAccounts()
        if (accounts.length > 0) {
          await connectWallet()
        }

        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged)
        window.ethereum.on('chainChanged', handleChainChanged)
      }

    } catch (error) {
      console.error('Error initializing Web3:', error)
      toast.error('Failed to initialize Web3')
    }
  }

  const connectWallet = async () => {
    if (!provider) {
      toast.error('Web3 provider not available')
      return
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
        const signer = await provider.getSigner(0)
        const address = await signer.getAddress()
        accounts = [address]
      }

      if (accounts.length > 0) {
        const web3Signer = await provider.getSigner()
        const address = await web3Signer.getAddress()
        const network = await provider.getNetwork()

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
      console.log('🔍 [DEBUG] Initializing contracts...')
      console.log('🔍 [DEBUG] Using contract addresses:', CONTRACT_ADDRESSES)
      
      const realEstateContract = new ethers.Contract(
        CONTRACT_ADDRESSES.RealEstateFractionalization,
        REAL_ESTATE_FRACTIONALIZATION_ABI,
        web3Signer
      )

      console.log('🔍 [DEBUG] Main contract created at:', realEstateContract.target)

      // Get additional contract addresses from the main contract
      let propertyTokenAddress, tradingPlatformAddress, dividendDistributorAddress
      
      try {
        console.log('🔍 [DEBUG] Getting contract addresses from main contract...')
        [propertyTokenAddress, tradingPlatformAddress, dividendDistributorAddress] = 
          await realEstateContract.getContractAddresses()
        
        console.log('🔍 [DEBUG] Contract addresses from main contract:')
        console.log('  - PropertyToken:', propertyTokenAddress)
        console.log('  - TradingPlatform:', tradingPlatformAddress)
        console.log('  - DividendDistributor:', dividendDistributorAddress)
      } catch (error) {
        console.warn('⚠️ [WARNING] Could not get contract addresses from main contract, using environment addresses:', error)
        // Fallback to environment addresses
        propertyTokenAddress = CONTRACT_ADDRESSES.PropertyToken
        tradingPlatformAddress = CONTRACT_ADDRESSES.TradingPlatform
        dividendDistributorAddress = CONTRACT_ADDRESSES.DividendDistributor
        
        console.log('🔍 [DEBUG] Using fallback addresses:')
        console.log('  - PropertyToken:', propertyTokenAddress)
        console.log('  - TradingPlatform:', tradingPlatformAddress)
        console.log('  - DividendDistributor:', dividendDistributorAddress)
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

      console.log('🔍 [DEBUG] All contracts created successfully')
      console.log('🔍 [DEBUG] Contract addresses:')
      console.log('  - RealEstate:', realEstateContract.target)
      console.log('  - PropertyToken:', propertyTokenContract.target)
      console.log('  - TradingPlatform:', tradingPlatformContract.target)
      console.log('  - DividendDistributor:', dividendDistributorContract.target)

      const contractInstances = {
        realEstateFractionalization: realEstateContract,
        propertyToken: propertyTokenContract,
        tradingPlatform: tradingPlatformContract,
        dividendDistributor: dividendDistributorContract,
        signer: web3Signer
      }

      setContracts(contractInstances)
      setWeb3Service(new Web3Service(contractInstances, web3Signer))
      
      console.log('✅ [SUCCESS] Contracts initialized and Web3Service created')
    } catch (error) {
      console.error('❌ [ERROR] Error initializing contracts:', error)
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PropertyToken.sol";
import "./FractionalToken.sol";
import "./TradingPlatform.sol";
import "./DividendDistributor.sol";

/**
 * @title RealEstateFractionalization
 * @dev Main contract that manages the entire real estate fractionalization system
 */
contract RealEstateFractionalization is Ownable {
    // Contract addresses
    PropertyToken public propertyToken;
    TradingPlatform public tradingPlatform;
    DividendDistributor public dividendDistributor;
    
    // Mapping from property token ID to fractional token contract
    mapping(uint256 => address) public fractionalTokens;
    
    // Mapping from property token ID to property status
    mapping(uint256 => bool) public isPropertyFractionalized;
    
    // Events
    event PropertyFractionalized(
        uint256 indexed propertyTokenId,
        address indexed fractionalTokenAddress,
        uint256 totalShares,
        uint256 sharePrice
    );
    
    event FractionalTokenCreated(
        uint256 indexed propertyTokenId,
        address indexed fractionalTokenAddress,
        string name,
        string symbol
    );
    
    constructor() Ownable(msg.sender) {
        // Deploy core contracts
        propertyToken = new PropertyToken();
        tradingPlatform = new TradingPlatform();
        dividendDistributor = new DividendDistributor();
    }
    
    /**
     * @dev Create a new property and fractionalize it
     * @param name Property name
     * @param description Property description
     * @param location Property location
     * @param totalValue Total property value in wei
     * @param totalShares Total number of fractional shares
     * @param imageUrl Property image URL
     * @param documents Array of document URLs
     * @param fractionalTokenName Name for the fractional token
     * @param fractionalTokenSymbol Symbol for the fractional token
     */
    function createAndFractionalizeProperty(
        string memory name,
        string memory description,
        string memory location,
        uint256 totalValue,
        uint256 totalShares,
        string memory imageUrl,
        string[] memory documents,
        string memory fractionalTokenName,
        string memory fractionalTokenSymbol
    ) external returns (uint256 propertyTokenId, address fractionalTokenAddress) {
        // Create the property token
        propertyTokenId = propertyToken.createProperty(
            name,
            description,
            location,
            totalValue,
            totalShares,
            imageUrl,
            documents
        );
        
        // Create the fractional token
        fractionalTokenAddress = address(new FractionalToken(
            propertyTokenId,
            address(propertyToken),
            totalValue,
            totalShares,
            fractionalTokenName,
            fractionalTokenSymbol
        ));
        
        // Store the relationship
        fractionalTokens[propertyTokenId] = fractionalTokenAddress;
        isPropertyFractionalized[propertyTokenId] = true;
        
        // Set the fractional token address in the property token contract
        propertyToken.setFractionalToken(propertyTokenId, fractionalTokenAddress);
        
        emit PropertyFractionalized(propertyTokenId, fractionalTokenAddress, totalShares, totalValue / totalShares);
        emit FractionalTokenCreated(propertyTokenId, fractionalTokenAddress, fractionalTokenName, fractionalTokenSymbol);
        
        return (propertyTokenId, fractionalTokenAddress);
    }
    
    /**
     * @dev Enable trading for a property's fractional tokens
     * @param propertyTokenId Property token ID
     */
    function enableTrading(uint256 propertyTokenId) external onlyOwner {
        require(isPropertyFractionalized[propertyTokenId], "Property is not fractionalized");
        
        address fractionalTokenAddress = fractionalTokens[propertyTokenId];
        FractionalToken fractionalToken = FractionalToken(fractionalTokenAddress);
        // Call setTradingEnabled from this contract (which is the owner of FractionalToken)
        fractionalToken.setTradingEnabled(true);
    }
    
    /**
     * @dev Disable trading for a property's fractional tokens
     * @param propertyTokenId Property token ID
     */
    function disableTrading(uint256 propertyTokenId) external onlyOwner {
        require(isPropertyFractionalized[propertyTokenId], "Property is not fractionalized");
        
        address fractionalTokenAddress = fractionalTokens[propertyTokenId];
        FractionalToken fractionalToken = FractionalToken(fractionalTokenAddress);
        fractionalToken.setTradingEnabled(false);
    }
    
    /**
     * @dev Purchase fractional shares directly from the contract
     * @param propertyTokenId Property token ID
     * @param shares Number of shares to purchase
     */
    function purchaseShares(uint256 propertyTokenId, uint256 shares) external payable {
        require(isPropertyFractionalized[propertyTokenId], "Property is not fractionalized");
        
        address fractionalTokenAddress = fractionalTokens[propertyTokenId];
        FractionalToken fractionalToken = FractionalToken(fractionalTokenAddress);
        fractionalToken.purchaseSharesFor{value: msg.value}(msg.sender, shares);
    }
    
    /**
     * @dev Sell fractional shares back to the contract
     * @param propertyTokenId Property token ID
     * @param shares Number of shares to sell
     */
    function sellShares(uint256 propertyTokenId, uint256 shares) external {
        require(isPropertyFractionalized[propertyTokenId], "Property is not fractionalized");
        
        address fractionalTokenAddress = fractionalTokens[propertyTokenId];
        FractionalToken fractionalToken = FractionalToken(fractionalTokenAddress);
        fractionalToken.sellShares(shares);
    }
    
    /**
     * @dev Create a sell order on the trading platform
     * @param propertyTokenId Property token ID
     * @param shares Number of shares to sell
     * @param pricePerShare Price per share in wei
     * @param expiresIn Duration in seconds until order expires
     */
    function createSellOrder(
        uint256 propertyTokenId,
        uint256 shares,
        uint256 pricePerShare,
        uint256 expiresIn
    ) external returns (uint256) {
        require(isPropertyFractionalized[propertyTokenId], "Property is not fractionalized");
        
        address fractionalTokenAddress = fractionalTokens[propertyTokenId];
        return tradingPlatform.createSellOrder(
            propertyTokenId,
            fractionalTokenAddress,
            shares,
            pricePerShare,
            expiresIn
        );
    }
    
    /**
     * @dev Create a buy order on the trading platform
     * @param propertyTokenId Property token ID
     * @param shares Number of shares to buy
     * @param pricePerShare Price per share in wei
     * @param expiresIn Duration in seconds until order expires
     */
    function createBuyOrder(
        uint256 propertyTokenId,
        uint256 shares,
        uint256 pricePerShare,
        uint256 expiresIn
    ) external payable returns (uint256) {
        require(isPropertyFractionalized[propertyTokenId], "Property is not fractionalized");
        
        address fractionalTokenAddress = fractionalTokens[propertyTokenId];
        return tradingPlatform.createBuyOrder{value: msg.value}(
            propertyTokenId,
            fractionalTokenAddress,
            shares,
            pricePerShare,
            expiresIn
        );
    }
    
    /**
     * @dev Distribute dividends for a property
     * @param propertyTokenId Property token ID
     * @param description Description of the dividend source
     */
    function distributeDividends(uint256 propertyTokenId, string memory description) external payable {
        require(isPropertyFractionalized[propertyTokenId], "Property is not fractionalized");
        require(msg.value > 0, "Dividend amount must be greater than 0");
        
        address fractionalTokenAddress = fractionalTokens[propertyTokenId];
        dividendDistributor.createDividend{value: msg.value}(
            propertyTokenId,
            fractionalTokenAddress,
            description
        );
    }
    
    /**
     * @dev Claim dividends for a specific dividend
     * @param dividendId Dividend ID to claim
     */
    function claimDividend(uint256 dividendId) external {
        dividendDistributor.claimDividend(dividendId);
    }
    
    /**
     * @dev Batch claim multiple dividends
     * @param dividendIds Array of dividend IDs to claim
     */
    function batchClaimDividends(uint256[] memory dividendIds) external {
        dividendDistributor.batchClaimDividends(dividendIds);
    }
    
    /**
     * @dev Get property information with fractional token details
     * @param propertyTokenId Property token ID
     * @return property Property details
     * @return fractionalTokenAddress Fractional token contract address
     * @return isFractionalized Whether property is fractionalized
     */
    function getPropertyDetails(uint256 propertyTokenId) external view returns (
        PropertyToken.Property memory property,
        address fractionalTokenAddress,
        bool isFractionalized
    ) {
        property = propertyToken.getProperty(propertyTokenId);
        fractionalTokenAddress = fractionalTokens[propertyTokenId];
        isFractionalized = isPropertyFractionalized[propertyTokenId];
        
        return (property, fractionalTokenAddress, isFractionalized);
    }
    
    /**
     * @dev Get user's ownership information for a property
     * @param user User address
     * @param propertyTokenId Property token ID
     * @return ownershipPercentage User's ownership percentage
     * @return sharesOwned Number of shares owned by user
     * @return propertyValueOwned Property value owned by user
     */
    function getUserOwnershipInfo(address user, uint256 propertyTokenId) external view returns (
        uint256 ownershipPercentage,
        uint256 sharesOwned,
        uint256 propertyValueOwned
    ) {
        require(isPropertyFractionalized[propertyTokenId], "Property is not fractionalized");
        
        address fractionalTokenAddress = fractionalTokens[propertyTokenId];
        FractionalToken fractionalToken = FractionalToken(fractionalTokenAddress);
        
        sharesOwned = fractionalToken.balanceOf(user);
        ownershipPercentage = fractionalToken.getOwnershipPercentage(user);
        propertyValueOwned = fractionalToken.getPropertyValueOwned(user);
        
        return (ownershipPercentage, sharesOwned, propertyValueOwned);
    }
    
    /**
     * @dev Get active orders for a property
     * @param propertyTokenId Property token ID
     * @return Array of active order IDs
     */
    function getActiveOrders(uint256 propertyTokenId) external view returns (uint256[] memory) {
        return tradingPlatform.getActiveOrders(propertyTokenId);
    }
    
    /**
     * @dev Get dividends for a property
     * @param propertyTokenId Property token ID
     * @return Array of dividend IDs
     */
    function getPropertyDividends(uint256 propertyTokenId) external view returns (uint256[] memory) {
        return dividendDistributor.getPropertyDividends(propertyTokenId);
    }
    
    /**
     * @dev Get total claimable dividends for a user
     * @param user User address
     * @return Total claimable amount in wei
     */
    function getTotalClaimableDividends(address user) external view returns (uint256) {
        return dividendDistributor.getTotalClaimableDividends(user);
    }
    
    /**
     * @dev Get contract addresses
     * @return propertyTokenAddress Property token contract address
     * @return tradingPlatformAddress Trading platform contract address
     * @return dividendDistributorAddress Dividend distributor contract address
     */
    function getContractAddresses() external view returns (
        address propertyTokenAddress,
        address tradingPlatformAddress,
        address dividendDistributorAddress
    ) {
        return (address(propertyToken), address(tradingPlatform), address(dividendDistributor));
    }
    
    /**
     * @dev Update platform fee
     * @param newFee New fee in basis points
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        tradingPlatform.updatePlatformFee(newFee);
    }
    
    /**
     * @dev Withdraw platform fees
     */
    function withdrawPlatformFees() external onlyOwner {
        tradingPlatform.withdrawFees();
    }
    
    /**
     * @dev Emergency withdraw function
     */
    function emergencyWithdraw() external onlyOwner {
        dividendDistributor.emergencyWithdraw();
    }
}

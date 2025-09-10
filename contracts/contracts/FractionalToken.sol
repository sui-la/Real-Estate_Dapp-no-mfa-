// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title FractionalToken
 * @dev ERC-20 token representing fractional ownership of a specific property
 * Each property has its own fractional token contract
 */
contract FractionalToken is ERC20, Ownable, ERC20Permit {
    // Property details
    uint256 public propertyTokenId;
    address public propertyTokenContract;
    uint256 public propertyTotalValue;
    uint256 public totalShares;
    uint256 public sharePrice; // Price per share in wei
    
    // Trading and dividend information
    bool public tradingEnabled;
    uint256 public totalDividendsDistributed;
    mapping(address => uint256) public lastDividendClaim;
    
    // Events
    event SharesPurchased(address indexed buyer, uint256 amount, uint256 totalCost);
    event SharesSold(address indexed seller, uint256 amount, uint256 totalReceived);
    event DividendDistributed(uint256 amount, uint256 timestamp);
    event TradingEnabled(bool enabled);
    
    constructor(
        uint256 _propertyTokenId,
        address _propertyTokenContract,
        uint256 _propertyTotalValue,
        uint256 _totalShares,
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) Ownable(msg.sender) ERC20Permit(name) {
        propertyTokenId = _propertyTokenId;
        propertyTokenContract = _propertyTokenContract;
        propertyTotalValue = _propertyTotalValue;
        totalShares = _totalShares;
        sharePrice = _propertyTotalValue / _totalShares;
        
        // Mint all shares to this contract initially
        _mint(address(this), _totalShares * 10**18);
    }
    
    /**
     * @dev Purchase fractional shares
     * @param amount Number of shares to purchase
     */
    function purchaseShares(uint256 amount) external payable {
        console.log("[DEBUG] FractionalToken: purchaseShares called");
        console.log("[DEBUG] FractionalToken: amount:", amount);
        console.log("[DEBUG] FractionalToken: msg.sender:", msg.sender);
        console.log("[DEBUG] FractionalToken: msg.value:", msg.value);
        
        require(tradingEnabled, "Trading is not enabled");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= totalShares, "Cannot purchase more than total shares");
        
        uint256 totalCost = amount * sharePrice;
        console.log("[DEBUG] FractionalToken: totalCost:", totalCost);
        require(msg.value >= totalCost, "Insufficient payment");
        
        uint256 tokensToTransfer = amount * 10**18;
        uint256 contractBalance = balanceOf(address(this));
        uint256 buyerBalanceBefore = balanceOf(msg.sender);
        
        console.log("[DEBUG] FractionalToken: tokensToTransfer:", tokensToTransfer);
        console.log("[DEBUG] FractionalToken: contractBalance:", contractBalance);
        console.log("[DEBUG] FractionalToken: buyerBalanceBefore:", buyerBalanceBefore);
        
        require(contractBalance >= tokensToTransfer, "Contract has insufficient tokens");
        
        // Transfer shares from contract to buyer
        _transfer(address(this), msg.sender, tokensToTransfer);
        
        uint256 buyerBalanceAfter = balanceOf(msg.sender);
        console.log("[DEBUG] FractionalToken: buyerBalanceAfter:", buyerBalanceAfter);
        
        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit SharesPurchased(msg.sender, amount, totalCost);
        console.log("[DEBUG] FractionalToken: purchaseShares completed successfully");
    }
    
    /**
     * @dev Sell fractional shares back to the contract
     * @param amount Number of shares to sell
     */
    function sellShares(uint256 amount) external {
        require(tradingEnabled, "Trading is not enabled");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount * 10**18, "Insufficient shares");
        
        uint256 totalReceived = amount * sharePrice;
        require(address(this).balance >= totalReceived, "Contract has insufficient funds");
        
        // Transfer shares from seller to contract
        _transfer(msg.sender, address(this), amount * 10**18);
        
        // Transfer payment to seller
        payable(msg.sender).transfer(totalReceived);
        
        emit SharesSold(msg.sender, amount, totalReceived);
    }
    
    /**
     * @dev Enable or disable trading
     * @param enabled True to enable trading, false to disable
     */
    function setTradingEnabled(bool enabled) external onlyOwner {
        tradingEnabled = enabled;
        emit TradingEnabled(enabled);
    }
    
    /**
     * @dev Update share price
     * @param newPrice New price per share in wei
     */
    function updateSharePrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Share price must be greater than 0");
        sharePrice = newPrice;
    }
    
    /**
     * @dev Distribute dividends to all shareholders
     */
    function distributeDividends() external payable onlyOwner {
        require(msg.value > 0, "No dividends to distribute");
        
        totalDividendsDistributed += msg.value;
        
        emit DividendDistributed(msg.value, block.timestamp);
    }
    
    /**
     * @dev Claim dividends for a specific shareholder
     * @param shareholder Address of the shareholder
     */
    function claimDividends(address shareholder) external {
        uint256 shares = balanceOf(shareholder);
        require(shares > 0, "No shares to claim dividends for");
        
        uint256 totalSharesInCirculation = totalSupply();
        uint256 dividendsOwed = (shares * totalDividendsDistributed) / totalSharesInCirculation;
        
        require(dividendsOwed > lastDividendClaim[shareholder], "No new dividends to claim");
        
        uint256 claimableAmount = dividendsOwed - lastDividendClaim[shareholder];
        lastDividendClaim[shareholder] = dividendsOwed;
        
        require(address(this).balance >= claimableAmount, "Insufficient contract balance");
        
        payable(shareholder).transfer(claimableAmount);
    }
    
    /**
     * @dev Get claimable dividends for a shareholder
     * @param shareholder Address of the shareholder
     * @return Amount of claimable dividends
     */
    function getClaimableDividends(address shareholder) external view returns (uint256) {
        uint256 shares = balanceOf(shareholder);
        if (shares == 0) return 0;
        
        uint256 totalSharesInCirculation = totalSupply();
        uint256 dividendsOwed = (shares * totalDividendsDistributed) / totalSharesInCirculation;
        
        if (dividendsOwed <= lastDividendClaim[shareholder]) {
            return 0;
        }
        
        return dividendsOwed - lastDividendClaim[shareholder];
    }
    
    /**
     * @dev Get ownership percentage for a shareholder
     * @param shareholder Address of the shareholder
     * @return Ownership percentage (in basis points, e.g., 1000 = 10%)
     */
    function getOwnershipPercentage(address shareholder) external view returns (uint256) {
        uint256 shares = balanceOf(shareholder);
        if (shares == 0) return 0;
        
        return (shares * 10000) / totalSupply(); // Returns in basis points
    }
    
    /**
     * @dev Get property value owned by a shareholder
     * @param shareholder Address of the shareholder
     * @return Value of property owned in wei
     */
    function getPropertyValueOwned(address shareholder) external view returns (uint256) {
        uint256 shares = balanceOf(shareholder);
        if (shares == 0) return 0;
        
        return (shares * propertyTotalValue) / totalSupply();
    }
    
    /**
     * @dev Deposit funds to the contract (for share purchases)
     */
    function deposit() external payable onlyOwner {
        // This function allows the contract owner to deposit funds
        // that can be used for share purchases
    }
    
    /**
     * @dev Withdraw funds from the contract
     * @param amount Amount to withdraw in wei
     */
    function withdraw(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient contract balance");
        payable(owner()).transfer(amount);
    }
    
    /**
     * @dev Get contract balance
     * @return Contract balance in wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Override transfer to ensure trading is enabled
     */
    function _update(address from, address to, uint256 value) internal override {
        // Allow transfers if trading is enabled or if it's a mint/burn operation
        if (from != address(0) && to != address(0)) {
            require(tradingEnabled, "Trading is not enabled");
        }
        
        super._update(from, to, value);
    }
}

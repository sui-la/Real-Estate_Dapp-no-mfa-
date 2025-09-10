// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PropertyToken.sol";
import "./FractionalToken.sol";

/**
 * @title DividendDistributor
 * @dev Handles dividend distribution for property owners
 */
contract DividendDistributor is Ownable, ReentrancyGuard {
    // Dividend record structure
    struct DividendRecord {
        uint256 propertyTokenId;
        address fractionalTokenAddress;
        uint256 totalAmount;
        uint256 distributedAmount;
        uint256 timestamp;
        string description;
        bool isActive;
    }
    
    // Mapping from dividend ID to dividend record
    mapping(uint256 => DividendRecord) public dividends;
    
    // Mapping from property token ID to array of dividend IDs
    mapping(uint256 => uint256[]) public propertyDividends;
    
    // Mapping from user to claimed dividends
    mapping(address => mapping(uint256 => bool)) public hasClaimedDividend;
    
    // Dividend counter
    uint256 private _dividendCounter;
    
    // Events
    event DividendCreated(
        uint256 indexed dividendId,
        uint256 propertyTokenId,
        uint256 totalAmount,
        string description
    );
    
    event DividendClaimed(
        uint256 indexed dividendId,
        address indexed claimant,
        uint256 amount
    );
    
    event DividendDistributed(
        uint256 indexed dividendId,
        uint256 totalDistributed
    );
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Create a new dividend distribution
     * @param propertyTokenId Property token ID
     * @param fractionalTokenAddress Address of the fractional token contract
     * @param description Description of the dividend source
     */
    function createDividend(
        uint256 propertyTokenId,
        address fractionalTokenAddress,
        string memory description
    ) external payable onlyOwner nonReentrant {
        require(msg.value > 0, "Dividend amount must be greater than 0");
        require(bytes(description).length > 0, "Description cannot be empty");
        
        _dividendCounter++;
        uint256 dividendId = _dividendCounter;
        
        DividendRecord memory newDividend = DividendRecord({
            propertyTokenId: propertyTokenId,
            fractionalTokenAddress: fractionalTokenAddress,
            totalAmount: msg.value,
            distributedAmount: 0,
            timestamp: block.timestamp,
            description: description,
            isActive: true
        });
        
        dividends[dividendId] = newDividend;
        propertyDividends[propertyTokenId].push(dividendId);
        
        emit DividendCreated(dividendId, propertyTokenId, msg.value, description);
    }
    
    /**
     * @dev Claim dividends for a specific dividend
     * @param dividendId Dividend ID to claim
     */
    function claimDividend(uint256 dividendId) external nonReentrant {
        DividendRecord storage dividend = dividends[dividendId];
        require(dividend.isActive, "Dividend is not active");
        require(!hasClaimedDividend[msg.sender][dividendId], "Already claimed this dividend");
        
        FractionalToken fractionalToken = FractionalToken(dividend.fractionalTokenAddress);
        uint256 userShares = fractionalToken.balanceOf(msg.sender);
        require(userShares > 0, "No shares to claim dividends for");
        
        uint256 totalShares = fractionalToken.totalSupply();
        uint256 userDividend = (userShares * dividend.totalAmount) / totalShares;
        
        require(userDividend > 0, "No dividends to claim");
        require(address(this).balance >= userDividend, "Insufficient contract balance");
        
        // Mark as claimed
        hasClaimedDividend[msg.sender][dividendId] = true;
        
        // Update distributed amount
        dividend.distributedAmount += userDividend;
        
        // Transfer dividend to user
        payable(msg.sender).transfer(userDividend);
        
        emit DividendClaimed(dividendId, msg.sender, userDividend);
    }
    
    /**
     * @dev Batch claim multiple dividends
     * @param dividendIds Array of dividend IDs to claim
     */
    function batchClaimDividends(uint256[] memory dividendIds) external nonReentrant {
        uint256 totalClaimed = 0;
        
        for (uint256 i = 0; i < dividendIds.length; i++) {
            uint256 dividendId = dividendIds[i];
            DividendRecord storage dividend = dividends[dividendId];
            
            if (dividend.isActive && !hasClaimedDividend[msg.sender][dividendId]) {
                FractionalToken fractionalToken = FractionalToken(dividend.fractionalTokenAddress);
                uint256 userShares = fractionalToken.balanceOf(msg.sender);
                
                if (userShares > 0) {
                    uint256 totalShares = fractionalToken.totalSupply();
                    uint256 userDividend = (userShares * dividend.totalAmount) / totalShares;
                    
                    if (userDividend > 0) {
                        hasClaimedDividend[msg.sender][dividendId] = true;
                        dividend.distributedAmount += userDividend;
                        totalClaimed += userDividend;
                        
                        emit DividendClaimed(dividendId, msg.sender, userDividend);
                    }
                }
            }
        }
        
        require(totalClaimed > 0, "No dividends to claim");
        require(address(this).balance >= totalClaimed, "Insufficient contract balance");
        
        payable(msg.sender).transfer(totalClaimed);
    }
    
    /**
     * @dev Get claimable dividend amount for a user
     * @param user User address
     * @param dividendId Dividend ID
     * @return Claimable amount in wei
     */
    function getClaimableDividend(address user, uint256 dividendId) external view returns (uint256) {
        DividendRecord memory dividend = dividends[dividendId];
        
        if (!dividend.isActive || hasClaimedDividend[user][dividendId]) {
            return 0;
        }
        
        FractionalToken fractionalToken = FractionalToken(dividend.fractionalTokenAddress);
        uint256 userShares = fractionalToken.balanceOf(user);
        
        if (userShares == 0) {
            return 0;
        }
        
        uint256 totalShares = fractionalToken.totalSupply();
        return (userShares * dividend.totalAmount) / totalShares;
    }
    
    /**
     * @dev Get all claimable dividends for a user across all properties
     * @param user User address
     * @return Total claimable amount in wei
     */
    function getTotalClaimableDividends(address user) external view returns (uint256) {
        uint256 totalClaimable = 0;
        
        for (uint256 i = 1; i <= _dividendCounter; i++) {
            DividendRecord memory dividend = dividends[i];
            
            if (dividend.isActive && !hasClaimedDividend[user][i]) {
                FractionalToken fractionalToken = FractionalToken(dividend.fractionalTokenAddress);
                uint256 userShares = fractionalToken.balanceOf(user);
                
                if (userShares > 0) {
                    uint256 totalShares = fractionalToken.totalSupply();
                    uint256 userDividend = (userShares * dividend.totalAmount) / totalShares;
                    totalClaimable += userDividend;
                }
            }
        }
        
        return totalClaimable;
    }
    
    /**
     * @dev Get dividends for a specific property
     * @param propertyTokenId Property token ID
     * @return Array of dividend IDs
     */
    function getPropertyDividends(uint256 propertyTokenId) external view returns (uint256[] memory) {
        return propertyDividends[propertyTokenId];
    }
    
    /**
     * @dev Get dividend details
     * @param dividendId Dividend ID
     * @return DividendRecord struct
     */
    function getDividend(uint256 dividendId) external view returns (DividendRecord memory) {
        return dividends[dividendId];
    }
    
    /**
     * @dev Get total dividends created
     * @return Total count of dividends
     */
    function getTotalDividends() external view returns (uint256) {
        return _dividendCounter;
    }
    
    /**
     * @dev Deactivate a dividend (emergency function)
     * @param dividendId Dividend ID to deactivate
     */
    function deactivateDividend(uint256 dividendId) external onlyOwner {
        require(dividends[dividendId].isActive, "Dividend is already inactive");
        dividends[dividendId].isActive = false;
    }
    
    /**
     * @dev Withdraw unclaimed dividends (after a certain period)
     * @param dividendId Dividend ID
     * @param amount Amount to withdraw
     */
    function withdrawUnclaimedDividend(uint256 dividendId, uint256 amount) external onlyOwner {
        DividendRecord storage dividend = dividends[dividendId];
        require(dividend.isActive, "Dividend is not active");
        
        uint256 unclaimedAmount = dividend.totalAmount - dividend.distributedAmount;
        require(amount <= unclaimedAmount, "Amount exceeds unclaimed dividends");
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        dividend.distributedAmount += amount;
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
     * @dev Emergency withdraw function
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner()).transfer(balance);
    }
}

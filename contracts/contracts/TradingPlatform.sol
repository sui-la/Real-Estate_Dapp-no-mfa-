// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PropertyToken.sol";
import "./FractionalToken.sol";

/**
 * @title TradingPlatform
 * @dev Handles the trading of fractional shares between users
 */
contract TradingPlatform is Ownable, ReentrancyGuard {
    // Order structure for buy/sell orders
    struct Order {
        uint256 orderId;
        address seller;
        address buyer;
        uint256 propertyTokenId;
        address fractionalTokenAddress;
        uint256 shares;
        uint256 pricePerShare;
        bool isBuyOrder;
        bool isActive;
        uint256 createdAt;
        uint256 expiresAt;
    }
    
    // Mapping from order ID to order details
    mapping(uint256 => Order) public orders;
    
    // Mapping from property token ID to array of active orders
    mapping(uint256 => uint256[]) public propertyOrders;
    
    // Order counter
    uint256 private _orderCounter;
    
    // Platform fee (in basis points, e.g., 250 = 2.5%)
    uint256 public platformFee = 250; // 2.5%
    
    // Events
    event OrderCreated(
        uint256 indexed orderId,
        address indexed creator,
        uint256 propertyTokenId,
        uint256 shares,
        uint256 pricePerShare,
        bool isBuyOrder
    );
    
    event OrderFilled(
        uint256 indexed orderId,
        address indexed buyer,
        address indexed seller,
        uint256 shares,
        uint256 totalPrice
    );
    
    event OrderCancelled(uint256 indexed orderId);
    event PlatformFeeUpdated(uint256 newFee);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Create a sell order
     * @param propertyTokenId Property token ID
     * @param fractionalTokenAddress Address of the fractional token contract
     * @param shares Number of shares to sell
     * @param pricePerShare Price per share in wei
     * @param expiresIn Duration in seconds until order expires
     */
    function createSellOrder(
        uint256 propertyTokenId,
        address fractionalTokenAddress,
        uint256 shares,
        uint256 pricePerShare,
        uint256 expiresIn
    ) external nonReentrant returns (uint256) {
        require(shares > 0, "Shares must be greater than 0");
        require(pricePerShare > 0, "Price per share must be greater than 0");
        require(expiresIn > 0, "Expiration time must be greater than 0");
        
        // Verify the caller owns the shares
        FractionalToken fractionalToken = FractionalToken(fractionalTokenAddress);
        require(fractionalToken.balanceOf(msg.sender) >= shares * 10**18, "Insufficient shares");
        
        // Approve the contract to transfer shares
        fractionalToken.transferFrom(msg.sender, address(this), shares * 10**18);
        
        _orderCounter++;
        uint256 orderId = _orderCounter;
        
        Order memory newOrder = Order({
            orderId: orderId,
            seller: msg.sender,
            buyer: address(0),
            propertyTokenId: propertyTokenId,
            fractionalTokenAddress: fractionalTokenAddress,
            shares: shares,
            pricePerShare: pricePerShare,
            isBuyOrder: false,
            isActive: true,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + expiresIn
        });
        
        orders[orderId] = newOrder;
        propertyOrders[propertyTokenId].push(orderId);
        
        emit OrderCreated(orderId, msg.sender, propertyTokenId, shares, pricePerShare, false);
        
        return orderId;
    }
    
    /**
     * @dev Create a buy order
     * @param propertyTokenId Property token ID
     * @param fractionalTokenAddress Address of the fractional token contract
     * @param shares Number of shares to buy
     * @param pricePerShare Price per share in wei
     * @param expiresIn Duration in seconds until order expires
     */
    function createBuyOrder(
        uint256 propertyTokenId,
        address fractionalTokenAddress,
        uint256 shares,
        uint256 pricePerShare,
        uint256 expiresIn
    ) external payable nonReentrant returns (uint256) {
        require(shares > 0, "Shares must be greater than 0");
        require(pricePerShare > 0, "Price per share must be greater than 0");
        require(expiresIn > 0, "Expiration time must be greater than 0");
        
        uint256 totalCost = shares * pricePerShare;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Store the payment in the contract
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        _orderCounter++;
        uint256 orderId = _orderCounter;
        
        Order memory newOrder = Order({
            orderId: orderId,
            seller: address(0),
            buyer: msg.sender,
            propertyTokenId: propertyTokenId,
            fractionalTokenAddress: fractionalTokenAddress,
            shares: shares,
            pricePerShare: pricePerShare,
            isBuyOrder: true,
            isActive: true,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + expiresIn
        });
        
        orders[orderId] = newOrder;
        propertyOrders[propertyTokenId].push(orderId);
        
        emit OrderCreated(orderId, msg.sender, propertyTokenId, shares, pricePerShare, true);
        
        return orderId;
    }
    
    /**
     * @dev Fill a sell order (buy shares)
     * @param orderId Order ID to fill
     */
    function fillSellOrder(uint256 orderId) external payable nonReentrant {
        Order storage order = orders[orderId];
        require(order.isActive, "Order is not active");
        require(!order.isBuyOrder, "Cannot fill buy order with this function");
        require(block.timestamp <= order.expiresAt, "Order has expired");
        require(msg.sender != order.seller, "Cannot buy your own order");
        
        uint256 totalCost = order.shares * order.pricePerShare;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Calculate platform fee
        uint256 fee = (totalCost * platformFee) / 10000;
        uint256 sellerAmount = totalCost - fee;
        
        // Transfer shares from contract to buyer
        FractionalToken fractionalToken = FractionalToken(order.fractionalTokenAddress);
        fractionalToken.transfer(msg.sender, order.shares * 10**18);
        
        // Transfer payment to seller
        payable(order.seller).transfer(sellerAmount);
        
        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        // Mark order as filled
        order.isActive = false;
        order.buyer = msg.sender;
        
        emit OrderFilled(orderId, msg.sender, order.seller, order.shares, totalCost);
    }
    
    /**
     * @dev Fill a buy order (sell shares)
     * @param orderId Order ID to fill
     */
    function fillBuyOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.isActive, "Order is not active");
        require(order.isBuyOrder, "Cannot fill sell order with this function");
        require(block.timestamp <= order.expiresAt, "Order has expired");
        require(msg.sender != order.buyer, "Cannot sell to your own order");
        
        // Verify the caller owns the shares
        FractionalToken fractionalToken = FractionalToken(order.fractionalTokenAddress);
        require(fractionalToken.balanceOf(msg.sender) >= order.shares * 10**18, "Insufficient shares");
        
        uint256 totalCost = order.shares * order.pricePerShare;
        
        // Calculate platform fee
        uint256 fee = (totalCost * platformFee) / 10000;
        uint256 sellerAmount = totalCost - fee;
        
        // Transfer shares from seller to buyer
        fractionalToken.transferFrom(msg.sender, order.buyer, order.shares * 10**18);
        
        // Transfer payment to seller
        payable(msg.sender).transfer(sellerAmount);
        
        // Mark order as filled
        order.isActive = false;
        order.seller = msg.sender;
        
        emit OrderFilled(orderId, order.buyer, msg.sender, order.shares, totalCost);
    }
    
    /**
     * @dev Cancel an order
     * @param orderId Order ID to cancel
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.isActive, "Order is not active");
        require(msg.sender == order.seller || msg.sender == order.buyer, "Not authorized to cancel this order");
        
        if (order.isBuyOrder) {
            // Refund the buyer
            uint256 totalCost = order.shares * order.pricePerShare;
            payable(order.buyer).transfer(totalCost);
        } else {
            // Return shares to the seller
            FractionalToken fractionalToken = FractionalToken(order.fractionalTokenAddress);
            fractionalToken.transfer(order.seller, order.shares * 10**18);
        }
        
        order.isActive = false;
        
        emit OrderCancelled(orderId);
    }
    
    /**
     * @dev Get active orders for a property
     * @param propertyTokenId Property token ID
     * @return Array of active order IDs
     */
    function getActiveOrders(uint256 propertyTokenId) external view returns (uint256[] memory) {
        uint256[] memory allOrders = propertyOrders[propertyTokenId];
        uint256 activeCount = 0;
        
        // Count active orders
        for (uint256 i = 0; i < allOrders.length; i++) {
            if (orders[allOrders[i]].isActive && block.timestamp <= orders[allOrders[i]].expiresAt) {
                activeCount++;
            }
        }
        
        // Create array of active orders
        uint256[] memory activeOrders = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allOrders.length; i++) {
            if (orders[allOrders[i]].isActive && block.timestamp <= orders[allOrders[i]].expiresAt) {
                activeOrders[index] = allOrders[i];
                index++;
            }
        }
        
        return activeOrders;
    }
    
    /**
     * @dev Get order details
     * @param orderId Order ID
     * @return Order struct
     */
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }
    
    /**
     * @dev Update platform fee
     * @param newFee New fee in basis points
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee cannot exceed 10%");
        platformFee = newFee;
        emit PlatformFeeUpdated(newFee);
    }
    
    /**
     * @dev Withdraw platform fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Get contract balance
     * @return Contract balance in wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

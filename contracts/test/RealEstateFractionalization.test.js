const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Real Estate Fractionalization", function () {
  let realEstateFractionalization;
  let propertyToken;
  let tradingPlatform;
  let dividendDistributor;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const RealEstateFractionalization = await ethers.getContractFactory("RealEstateFractionalization");
    realEstateFractionalization = await RealEstateFractionalization.deploy();
    await realEstateFractionalization.waitForDeployment();

    const [propertyTokenAddress, tradingPlatformAddress, dividendDistributorAddress] = 
      await realEstateFractionalization.getContractAddresses();

    propertyToken = await ethers.getContractAt("PropertyToken", propertyTokenAddress);
    tradingPlatform = await ethers.getContractAt("TradingPlatform", tradingPlatformAddress);
    dividendDistributor = await ethers.getContractAt("DividendDistributor", dividendDistributorAddress);
  });

  describe("Property Creation and Fractionalization", function () {
    it("Should create and fractionalize a property", async function () {
      const tx = await realEstateFractionalization.createAndFractionalizeProperty(
        "Test Property",
        "A test property for unit testing",
        "123 Test Street, Test City",
        ethers.parseEther("100000"), // $100K property value
        100, // 100 shares
        "https://example.com/test-image.jpg",
        ["https://example.com/test-doc.pdf"],
        "Test Property Shares",
        "TEST"
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      // Check if property was created
      const property = await propertyToken.getProperty(1);
      expect(property.name).to.equal("Test Property");
      expect(property.totalValue).to.equal(ethers.parseEther("100000"));
      expect(property.totalShares).to.equal(100);

      // Check if fractional token was created
      const fractionalTokenAddress = await realEstateFractionalization.fractionalTokens(1);
      expect(fractionalTokenAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should enable trading for a property", async function () {
      // First create a property
      await realEstateFractionalization.createAndFractionalizeProperty(
        "Test Property",
        "A test property for unit testing",
        "123 Test Street, Test City",
        ethers.parseEther("100000"),
        100,
        "https://example.com/test-image.jpg",
        ["https://example.com/test-doc.pdf"],
        "Test Property Shares",
        "TEST"
      );

      // Enable trading
      await realEstateFractionalization.enableTrading(1);
      
      const fractionalTokenAddress = await realEstateFractionalization.fractionalTokens(1);
      const fractionalToken = await ethers.getContractAt("FractionalToken", fractionalTokenAddress);
      
      const tradingEnabled = await fractionalToken.tradingEnabled();
      expect(tradingEnabled).to.be.true;
    });
  });

  describe("Share Trading", function () {
    beforeEach(async function () {
      // Create a property and enable trading
      await realEstateFractionalization.createAndFractionalizeProperty(
        "Test Property",
        "A test property for unit testing",
        "123 Test Street, Test City",
        ethers.parseEther("100000"),
        100,
        "https://example.com/test-image.jpg",
        ["https://example.com/test-doc.pdf"],
        "Test Property Shares",
        "TEST"
      );

      await realEstateFractionalization.enableTrading(1);
    });

    it("Should allow users to purchase shares", async function () {
      const fractionalTokenAddress = await realEstateFractionalization.fractionalTokens(1);
      const fractionalToken = await ethers.getContractAt("FractionalToken", fractionalTokenAddress);
      
      // Deposit funds to the fractional token contract
      await fractionalToken.deposit({ value: ethers.parseEther("1000") });

      // Purchase shares
      const sharesToBuy = 10;
      const sharePrice = await fractionalToken.sharePrice();
      const totalCost = sharePrice * BigInt(sharesToBuy);

      await realEstateFractionalization.connect(user1).purchaseShares(1, sharesToBuy, { value: totalCost });

      const userShares = await fractionalToken.balanceOf(user1.address);
      expect(userShares).to.equal(ethers.parseEther("10"));
    });

    it("Should allow users to create sell orders", async function () {
      const fractionalTokenAddress = await realEstateFractionalization.fractionalTokens(1);
      const fractionalToken = await ethers.getContractAt("FractionalToken", fractionalTokenAddress);
      
      // Give user1 some shares
      await fractionalToken.transfer(user1.address, ethers.parseEther("50"));

      // Create sell order
      const sharesToSell = 10;
      const pricePerShare = ethers.parseEther("1000"); // $1000 per share
      const expiresIn = 86400; // 24 hours

      await fractionalToken.connect(user1).approve(tradingPlatform.target, ethers.parseEther("10"));
      
      const tx = await realEstateFractionalization.connect(user1).createSellOrder(
        1,
        sharesToSell,
        pricePerShare,
        expiresIn
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });
  });

  describe("Dividend Distribution", function () {
    beforeEach(async function () {
      // Create a property
      await realEstateFractionalization.createAndFractionalizeProperty(
        "Test Property",
        "A test property for unit testing",
        "123 Test Street, Test City",
        ethers.parseEther("100000"),
        100,
        "https://example.com/test-image.jpg",
        ["https://example.com/test-doc.pdf"],
        "Test Property Shares",
        "TEST"
      );

      await realEstateFractionalization.enableTrading(1);
    });

    it("Should distribute dividends to shareholders", async function () {
      const fractionalTokenAddress = await realEstateFractionalization.fractionalTokens(1);
      const fractionalToken = await ethers.getContractAt("FractionalToken", fractionalTokenAddress);
      
      // Give user1 some shares
      await fractionalToken.transfer(user1.address, ethers.parseEther("50"));

      // Distribute dividends
      const dividendAmount = ethers.parseEther("1000");
      await realEstateFractionalization.distributeDividends(1, "Rental income distribution", { value: dividendAmount });

      // Check if dividend was created
      const dividends = await dividendDistributor.getPropertyDividends(1);
      expect(dividends.length).to.equal(1);

      // Check claimable dividends for user1
      const claimableDividends = await dividendDistributor.getClaimableDividend(user1.address, 1);
      expect(claimableDividends).to.be.gt(0);
    });

    it("Should allow users to claim dividends", async function () {
      const fractionalTokenAddress = await realEstateFractionalization.fractionalTokens(1);
      const fractionalToken = await ethers.getContractAt("FractionalToken", fractionalTokenAddress);
      
      // Give user1 some shares
      await fractionalToken.transfer(user1.address, ethers.parseEther("50"));

      // Distribute dividends
      const dividendAmount = ethers.parseEther("1000");
      await realEstateFractionalization.distributeDividends(1, "Rental income distribution", { value: dividendAmount });

      // Claim dividends
      const initialBalance = await ethers.provider.getBalance(user1.address);
      await realEstateFractionalization.connect(user1).claimDividend(1);
      const finalBalance = await ethers.provider.getBalance(user1.address);

      expect(finalBalance).to.be.gt(initialBalance);
    });
  });

  describe("Ownership Information", function () {
    beforeEach(async function () {
      // Create a property
      await realEstateFractionalization.createAndFractionalizeProperty(
        "Test Property",
        "A test property for unit testing",
        "123 Test Street, Test City",
        ethers.parseEther("100000"),
        100,
        "https://example.com/test-image.jpg",
        ["https://example.com/test-doc.pdf"],
        "Test Property Shares",
        "TEST"
      );

      await realEstateFractionalization.enableTrading(1);
    });

    it("Should return correct ownership information", async function () {
      const fractionalTokenAddress = await realEstateFractionalization.fractionalTokens(1);
      const fractionalToken = await ethers.getContractAt("FractionalToken", fractionalTokenAddress);
      
      // Give user1 some shares
      await fractionalToken.transfer(user1.address, ethers.parseEther("25"));

      const [ownershipPercentage, sharesOwned, propertyValueOwned] = 
        await realEstateFractionalization.getUserOwnershipInfo(user1.address, 1);

      expect(sharesOwned).to.equal(ethers.parseEther("25"));
      expect(ownershipPercentage).to.be.gt(0);
      expect(propertyValueOwned).to.be.gt(0);
    });
  });
});

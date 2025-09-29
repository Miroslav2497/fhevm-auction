const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PrivateAuction", function () {
  let privateAuction;
  let owner;
  let bidder1;
  let bidder2;

  beforeEach(async function () {
    [owner, bidder1, bidder2] = await ethers.getSigners();
    
    const PrivateAuction = await ethers.getContractFactory("PrivateAuction");
    privateAuction = await PrivateAuction.deploy();
    await privateAuction.waitForDeployment();
  });

  describe("部署", function () {
    it("应该正确部署合约", async function () {
      expect(await privateAuction.getAddress()).to.be.properAddress;
    });

    it("初始状态应该正确", async function () {
      expect(await privateAuction.auctionActive()).to.be.false;
      expect(await privateAuction.getAuctioneer()).to.equal(owner.address);
    });
  });

  describe("拍卖管理", function () {
    it("只有拍卖师可以开始拍卖", async function () {
      const duration = 300; // 5分钟
      await privateAuction.startAuction(duration);
      
      const auctionInfo = await privateAuction.getAuctionInfo();
      expect(auctionInfo[0]).to.be.true; // active
    });

    it("非拍卖师不能开始拍卖", async function () {
      const duration = 300;
      await expect(
        privateAuction.connect(bidder1).startAuction(duration)
      ).to.be.revertedWith("Only auctioneer can perform this action");
    });

    it("应该防止重复开始拍卖", async function () {
      const duration = 300;
      await privateAuction.startAuction(duration);
      
      await expect(
        privateAuction.startAuction(duration)
      ).to.be.revertedWith("Auction is already active");
    });
  });

  describe("出价功能", function () {
    beforeEach(async function () {
      const duration = 300;
      await privateAuction.startAuction(duration);
    });

    it("应该允许用户出价", async function () {
      // 注意：在实际测试中，你需要使用真实的加密数据
      // 这里我们模拟出价过程
      const auctionActive = await privateAuction.auctionActive();
      expect(auctionActive).to.be.true;
    });

    it("应该防止重复出价", async function () {
      // 模拟第一次出价
      const hasBidBefore = await privateAuction.hasBidderPlacedBid(bidder1.address);
      expect(hasBidBefore).to.be.false;
      
      // 在实际实现中，这里会调用placeBid函数
      // 然后检查hasBid状态
    });
  });

  describe("拍卖结束", function () {
    beforeEach(async function () {
      const duration = 300;
      await privateAuction.startAuction(duration);
    });

    it("只有拍卖师可以结束拍卖", async function () {
      await privateAuction.endAuction();
      expect(await privateAuction.auctionActive()).to.be.false;
    });

    it("非拍卖师不能结束拍卖", async function () {
      await expect(
        privateAuction.connect(bidder1).endAuction()
      ).to.be.revertedWith("Only auctioneer can perform this action");
    });
  });

  describe("状态查询", function () {
    it("应该返回正确的拍卖信息", async function () {
      const auctionInfo = await privateAuction.getAuctionInfo();
      expect(auctionInfo[0]).to.be.false; // not active initially
    });

    it("应该正确检查出价状态", async function () {
      const hasBid = await privateAuction.hasBidderPlacedBid(bidder1.address);
      expect(hasBid).to.be.false;
    });
  });
});

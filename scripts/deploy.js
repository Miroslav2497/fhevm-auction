const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署PrivateAuction合约...");

  // 获取合约工厂
  const PrivateAuction = await ethers.getContractFactory("PrivateAuction");
  
  // 部署合约
  const privateAuction = await PrivateAuction.deploy();
  
  // 等待部署完成
  await privateAuction.waitForDeployment();
  
  const contractAddress = await privateAuction.getAddress();
  
  console.log("✅ 合约部署成功!");
  console.log("合约地址:", contractAddress);
  console.log("网络:", network.name);
  
  // 保存部署信息
  const fs = require('fs');
  const deploymentInfo = {
    contractAddress: contractAddress,
    network: network.name,
    timestamp: new Date().toISOString(),
    deployer: await privateAuction.runner.getAddress()
  };
  
  fs.writeFileSync(
    './deployment.json', 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("部署信息已保存到 deployment.json");
  
  // 验证合约功能
  console.log("\n🔍 验证合约功能...");
  
  const auctionActive = await privateAuction.auctionActive();
  const auctioneer = await privateAuction.getAuctioneer();
  const auctionInfo = await privateAuction.getAuctionInfo();
  
  console.log("拍卖状态:", auctionActive ? "活跃" : "未开始");
  console.log("拍卖师地址:", auctioneer);
  console.log("拍卖信息:", {
    active: auctionInfo[0],
    endTime: auctionInfo[1].toString(),
    timeRemaining: auctionInfo[2].toString()
  });
  
  const highestBid = await privateAuction.getHighestBid();
  const totalBids = await privateAuction.getTotalBids();
  
  console.log("初始拍卖统计:");
  console.log("- 最高出价:", highestBid);
  console.log("- 总出价数:", totalBids);
  
  console.log("\n📝 下一步:");
  console.log("1. 更新前端代码中的 CONTRACT_ADDRESS");
  console.log("2. 运行 'npm run dev' 启动前端");
  console.log("3. 在浏览器中测试拍卖功能");
  console.log("4. 作为拍卖师开始拍卖");
  console.log("5. 作为竞拍者出价");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { FhevmInstance, createInstance } from 'fhevmjs';

interface AuctionState {
  auctionActive: boolean;
  auctionEndTime: number;
  timeRemaining: number;
  hasBid: boolean;
  totalBids: string;
  highestBid: string;
  auctioneer: string;
}

const Home: React.FC = () => {
  const [account, setAccount] = useState<string>('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [fhevm, setFhevm] = useState<FhevmInstance | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [auctionState, setAuctionState] = useState<AuctionState>({
    auctionActive: false,
    auctionEndTime: 0,
    timeRemaining: 0,
    hasBid: false,
    totalBids: '0',
    highestBid: '0',
    auctioneer: '',
  });
  const [bidAmount, setBidAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isAuctioneer, setIsAuctioneer] = useState(false);

  // 合约地址和ABI (部署后需要更新)
  const CONTRACT_ADDRESS = '0x...'; // 部署后更新
  const CONTRACT_ABI = [
    {
      "inputs": [{"internalType": "uint256", "name": "duration", "type": "uint256"}],
      "name": "startAuction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes", "name": "encryptedBidAmount", "type": "bytes"}],
      "name": "placeBid",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "endAuction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getHighestBid",
      "outputs": [{"internalType": "bytes", "name": "", "type": "bytes"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTotalBids",
      "outputs": [{"internalType": "bytes", "name": "", "type": "bytes"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "bidder", "type": "address"}],
      "name": "hasBidderPlacedBid",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getAuctionInfo",
      "outputs": [
        {"internalType": "bool", "name": "active", "type": "bool"},
        {"internalType": "uint256", "name": "endTime", "type": "uint256"},
        {"internalType": "uint256", "name": "timeRemaining", "type": "uint256"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getAuctioneer",
      "outputs": [{"internalType": "address", "name": "", "type": "address"}],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  // 连接钱包
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        const account = accounts[0];
        
        setProvider(provider);
        setAccount(account);
        
        // 初始化FHEVM
        const instance = await createInstance({ provider, chainId: 8009 });
        setFhevm(instance);
        
        // 创建合约实例
        const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider.getSigner());
        setContract(contractInstance);
        
        await loadAuctionState(contractInstance, account);
      } else {
        setError('请安装MetaMask钱包');
      }
    } catch (err) {
      setError('连接钱包失败: ' + (err as Error).message);
    }
  };

  // 加载拍卖状态
  const loadAuctionState = async (contractInstance: ethers.Contract, userAccount: string) => {
    try {
      const [auctionInfo, hasBid, auctioneer] = await Promise.all([
        contractInstance.getAuctionInfo(),
        contractInstance.hasBidderPlacedBid(userAccount),
        contractInstance.getAuctioneer()
      ]);

      const isAuctioneer = auctioneer.toLowerCase() === userAccount.toLowerCase();
      setIsAuctioneer(isAuctioneer);

      setAuctionState(prev => ({
        ...prev,
        auctionActive: auctionInfo[0],
        auctionEndTime: Number(auctionInfo[1]),
        timeRemaining: Number(auctionInfo[2]),
        hasBid,
        auctioneer
      }));
    } catch (err) {
      console.error('加载拍卖状态失败:', err);
    }
  };

  // 开始拍卖
  const startAuction = async () => {
    if (!contract || !isAuctioneer) {
      setError('只有拍卖师可以开始拍卖');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const duration = 300; // 5分钟
      const tx = await contract.startAuction(duration);
      await tx.wait();
      
      await loadAuctionState(contract, account);
      alert('拍卖已开始！');
    } catch (err) {
      setError('开始拍卖失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 出价
  const placeBid = async () => {
    if (!fhevm || !contract || !account) {
      setError('请先连接钱包');
      return;
    }

    if (!bidAmount || isNaN(Number(bidAmount))) {
      setError('请输入有效的出价金额');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 加密出价
      const encryptedBid = fhevm.encrypt32(Number(bidAmount));
      
      // 发送交易
      const tx = await contract.placeBid(encryptedBid);
      await tx.wait();
      
      // 更新状态
      setAuctionState(prev => ({
        ...prev,
        hasBid: true
      }));
      
      alert('出价成功！');
    } catch (err) {
      setError('出价失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 结束拍卖
  const endAuction = async () => {
    if (!contract || !isAuctioneer) {
      setError('只有拍卖师可以结束拍卖');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const tx = await contract.endAuction();
      await tx.wait();
      
      await loadAuctionState(contract, account);
      alert('拍卖已结束！');
    } catch (err) {
      setError('结束拍卖失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 解密结果
  const decryptResults = async () => {
    if (!fhevm || !contract) {
      setError('请先连接钱包');
      return;
    }

    try {
      const [highestBidEncrypted, totalBidsEncrypted] = await Promise.all([
        contract.getHighestBid(),
        contract.getTotalBids()
      ]);

      const highestBid = fhevm.decrypt32(highestBidEncrypted);
      const totalBids = fhevm.decrypt32(totalBidsEncrypted);

      setAuctionState(prev => ({
        ...prev,
        highestBid: highestBid.toString(),
        totalBids: totalBids.toString()
      }));
    } catch (err) {
      setError('解密结果失败: ' + (err as Error).message);
    }
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 标题 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              🏆 机密拍卖系统
            </h1>
            <p className="text-lg text-gray-600">
              使用FHEVM构建的完全隐私保护拍卖应用
            </p>
          </div>

          {/* 连接钱包 */}
          {!account && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8 text-center">
              <h2 className="text-2xl font-semibold mb-4">连接钱包开始拍卖</h2>
              <button
                onClick={connectWallet}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
              >
                连接MetaMask
              </button>
            </div>
          )}

          {/* 拍卖界面 */}
          {account && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* 拍卖控制区域 */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold mb-4">拍卖控制</h2>
                
                {/* 拍卖状态 */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">拍卖状态</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>状态:</span>
                      <span className={auctionState.auctionActive ? "text-green-600" : "text-red-600"}>
                        {auctionState.auctionActive ? "进行中" : "已结束"}
                      </span>
                    </div>
                    {auctionState.auctionActive && (
                      <div className="flex justify-between">
                        <span>剩余时间:</span>
                        <span className="font-mono">{formatTime(auctionState.timeRemaining)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>你的出价:</span>
                      <span>{auctionState.hasBid ? "已出价" : "未出价"}</span>
                    </div>
                  </div>
                </div>

                {/* 拍卖师功能 */}
                {isAuctioneer && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3">拍卖师功能</h3>
                    <div className="space-y-3">
                      {!auctionState.auctionActive ? (
                        <button
                          onClick={startAuction}
                          disabled={loading}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
                        >
                          {loading ? '开始中...' : '开始拍卖 (5分钟)'}
                        </button>
                      ) : (
                        <button
                          onClick={endAuction}
                          disabled={loading}
                          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
                        >
                          {loading ? '结束中...' : '结束拍卖'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 出价功能 */}
                {auctionState.auctionActive && !auctionState.hasBid && (
                  <div>
                    <h3 className="font-semibold mb-3">出价</h3>
                    <div className="space-y-3">
                      <input
                        type="number"
                        placeholder="输入出价金额"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        onClick={placeBid}
                        disabled={loading || !bidAmount}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
                      >
                        {loading ? '出价中...' : '提交出价'}
                      </button>
                    </div>
                  </div>
                )}

                {auctionState.hasBid && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                    你已经出价了！出价金额已加密保护。
                  </div>
                )}
              </div>

              {/* 结果区域 */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold mb-4">拍卖结果</h2>
                <p className="text-sm text-gray-600 mb-4">
                  点击下方按钮解密并查看结果
                </p>
                
                <button
                  onClick={decryptResults}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 mb-6"
                >
                  解密结果
                </button>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span>🏆 最高出价</span>
                    <span className="font-bold">{auctionState.highestBid} ETH</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span>📊 总出价数量</span>
                    <span className="font-bold">{auctionState.totalBids}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="text-sm text-gray-600">
                      <p>• 所有出价都被加密保护</p>
                      <p>• 只有最终结果会被公开</p>
                      <p>• 出价者身份完全保密</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
              {error}
            </div>
          )}

          {/* 技术说明 */}
          <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
            <h3 className="text-xl font-semibold mb-4">🔐 技术说明</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold mb-2">1. 加密出价</h4>
                <p>你的出价在发送到区块链之前被完全加密</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <h4 className="font-semibold mb-2">2. 隐私比较</h4>
                <p>智能合约在加密状态下比较出价高低</p>
              </div>
              <div className="p-4 bg-pink-50 rounded-lg">
                <h4 className="font-semibold mb-2">3. 解密结果</h4>
                <p>只有最终的最高出价被解密并公开</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

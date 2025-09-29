import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              🏆 机密拍卖系统
            </h1>
            <p className="text-lg text-gray-600">
              使用FHEVM构建的完全隐私保护拍卖应用
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-2xl font-semibold mb-4">项目信息</h2>
            <p className="mb-4">这是一个FHEVM机密拍卖系统演示项目</p>
            <p className="text-sm text-gray-600 mb-4">
              完整的交互式应用请查看GitHub仓库中的本地部署说明
            </p>
            <div className="space-y-2 text-left">
              <p><strong>技术栈:</strong> Solidity + FHEVM + Next.js + React</p>
              <p><strong>功能:</strong> 机密拍卖、加密出价、隐私保护</p>
              <p><strong>教程:</strong> 查看GitHub仓库中的TUTORIAL.md</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

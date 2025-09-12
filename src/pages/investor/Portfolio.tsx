import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import { X, AlertTriangle } from 'lucide-react';

interface StakedAsset {
  _id: string;
  chainId: string;
  chainName: string;
  prettyName: string;
  asset: string;
  stakedAmount: string;
  pendingRewards: string;
  validatorName: string;
  validatorAddress: string;
  apr: number;
}

interface AvailableBalance {
  _id: string;
  chainId: string;
  chainName: string;
  prettyName: string;
  asset: string;
  availableBalance: string;
  usdPrice: number;
  validatorName: string;
  validatorAddress: string;
}

interface UnstakingAsset {
  _id: string;
  chainId: string;
  chainName: string;
  asset: string;
  amount: string;
  completionDate: string;
  validatorName: string;
}

interface PortfolioOverview {
  totalStakedValue: number;
  totalPendingRewards: number;
  totalUnstakingValue: number;
  totalAvailableValue: number;
  // totalAssets: number;
  averageAPR: number;
}

const InvestorPortfolio: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { isConnected, keplrAddress, namadaAddress, namadaNotAvailable } = useWallet();

  // Use Keplr address if available, otherwise use Namada
  const primaryAddress = keplrAddress || namadaAddress;
  const [stakedAssets, setStakedAssets] = useState<StakedAsset[]>([]);
  const [availableBalances, setAvailableBalances] = useState<AvailableBalance[]>([]);
  const [unstakingAssets, setUnstakingAssets] = useState<UnstakingAsset[]>([]);
  const [showNamadaNotification, setShowNamadaNotification] = useState(false);
  const [overview, setOverview] = useState<PortfolioOverview>({
    totalStakedValue: 0,
    totalPendingRewards: 0,
    totalUnstakingValue: 0,
    totalAvailableValue: 0,
    // totalAssets: 0,
    averageAPR: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  // Mock data for demonstration
  const mockAvailableBalances: AvailableBalance[] = [
    {
      _id: '1',
      chainId: 'cosmoshub-4',
      chainName: 'cosmoshub',
      prettyName: 'Cosmos Hub',
      asset: 'ATOM',
      availableBalance: '25.67',
      usdPrice: 5.85, // Mock price similar to screenshot
      validatorName: 'EthicalNode Validator',
      validatorAddress: 'cosmosvaloper1...'
    },
    {
      _id: '2',
      chainId: 'akashnet-2',
      chainName: 'akash',
      prettyName: 'Akash Network',
      asset: 'AKT',
      availableBalance: '120.45',
      usdPrice: 2.15,
      validatorName: 'EthicalNode Validator',
      validatorAddress: 'akashvaloper1...'
    },
    {
      _id: '3',
      chainId: 'fetchhub-4',
      chainName: 'fetchhub',
      prettyName: 'Fetch.AI',
      asset: 'FET',
      availableBalance: '450.89',
      usdPrice: 0.85,
      validatorName: 'EthicalNode Validator',
      validatorAddress: 'fetchvaloper1...'
    }
  ];

  const mockStakedAssets: StakedAsset[] = [
    {
      _id: '1',
      chainId: 'cosmoshub-4',
      chainName: 'cosmoshub',
      prettyName: 'Cosmos Hub',
      asset: 'ATOM',
      stakedAmount: '150.5',
      pendingRewards: '2.34',
      validatorName: 'EthicalNode Validator',
      validatorAddress: 'cosmosvaloper1...',
      apr: 18.5
    },
    {
      _id: '2',
      chainId: 'akashnet-2',
      chainName: 'akash',
      prettyName: 'Akash Network',
      asset: 'AKT',
      stakedAmount: '500.0',
      pendingRewards: '12.67',
      validatorName: 'EthicalNode Validator',
      validatorAddress: 'akashvaloper1...',
      apr: 15.2
    },
    {
      _id: '3',
      chainId: 'fetchhub-4',
      chainName: 'fetchhub',
      prettyName: 'Fetch.AI',
      asset: 'FET',
      stakedAmount: '2000.0',
      pendingRewards: '45.89',
      validatorName: 'EthicalNode Validator',
      validatorAddress: 'fetchvaloper1...',
      apr: 12.8
    }
  ];

  const mockUnstakingAssets: UnstakingAsset[] = [
    {
      _id: '1',
      chainId: 'cosmoshub-4',
      chainName: 'cosmoshub',
      asset: 'ATOM',
      amount: '50.0',
      completionDate: new Date(Date.now() + 86400000 * 18).toISOString(), // 18 days from now
      validatorName: 'EthicalNode Validator'
    },
    {
      _id: '2',
      chainId: 'akashnet-2',
      chainName: 'akash',
      asset: 'AKT',
      amount: '25.5',
      completionDate: new Date(Date.now() + 86400000 * 12).toISOString(), // 12 days from now
      validatorName: 'EthicalNode Validator'
    },
    {
      _id: '3',
      chainId: 'fetchhub-4',
      chainName: 'fetchhub',
      asset: 'FET',
      amount: '100.0',
      completionDate: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
      validatorName: 'EthicalNode Validator'
    }
  ];

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching portfolio data for wallet:', primaryAddress);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, you would call your API here:
      // const response = await fetch(`http://localhost:3000/api/portfolio?wallet=${walletAddress}`);
      // const result = await response.json();
      
      setAvailableBalances(mockAvailableBalances);
      setStakedAssets(mockStakedAssets);
      setUnstakingAssets(mockUnstakingAssets);
      
      // Calculate overview
      const totalStaked = mockStakedAssets.reduce((sum, asset) => sum + parseFloat(asset.stakedAmount), 0);
      const totalRewards = mockStakedAssets.reduce((sum, asset) => sum + parseFloat(asset.pendingRewards), 0);
      const totalUnstaking = mockUnstakingAssets.reduce((sum, asset) => sum + parseFloat(asset.amount), 0);
      const totalAvailable = mockAvailableBalances.reduce((sum, balance) => 
        sum + (parseFloat(balance.availableBalance) * balance.usdPrice), 0
      );
      const avgAPR = mockStakedAssets.reduce((sum, asset) => sum + asset.apr, 0) / mockStakedAssets.length;

      setOverview({
        totalStakedValue: totalStaked,
        totalPendingRewards: totalRewards,
        totalUnstakingValue: totalUnstaking,
        totalAvailableValue: totalAvailable,
        // totalAssets: mockStakedAssets.length,
        averageAPR: avgAPR
      });
      
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
      setError('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isConnected) {
      setAvailableBalances([]);
      setStakedAssets([]);
      setUnstakingAssets([]);
      setOverview({
        totalStakedValue: 0,
        totalPendingRewards: 0,
        totalUnstakingValue: 0,
        totalAvailableValue: 0,
        // totalAssets: 0,
        averageAPR: 0
      });
      setLoading(false);
      return;
    }

    if (hasInitialized.current) {
      return;
    }
    
    hasInitialized.current = true;
    fetchPortfolioData();
  }, [isConnected, primaryAddress]);

  // Show Namada notification if wallet is not available
  useEffect(() => {
    if (namadaNotAvailable) {
      setShowNamadaNotification(true);
    }
  }, [namadaNotAvailable]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (dateString: string) => {
    const diff = new Date(dateString).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} min-h-screen`}>
      {/* Namada Not Available Notification */}
      {showNamadaNotification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50 max-w-sm w-full"
        >
          <div className={`rounded-lg shadow-lg border-2 p-4 ${
            isDarkMode 
              ? 'bg-yellow-900 border-yellow-600 text-yellow-100' 
              : 'bg-yellow-50 border-yellow-300 text-yellow-800'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3 w-0 flex-1">
                <h3 className="text-sm font-medium mb-1">
                  Namada Wallet Not Detected
                </h3>
                <p className="text-sm">
                  The Namada wallet extension was not found. Please install it to access the full functionality of the platform.
                </p>
                <div className="mt-3">
                  <button
                    onClick={() => window.open('https://namada.net', '_blank')}
                    className={`text-sm underline font-medium hover:no-underline ${
                      isDarkMode ? 'text-yellow-200' : 'text-yellow-700'
                    }`}
                  >
                    Install Namada Wallet
                  </button>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => setShowNamadaNotification(false)}
                  className={`rounded-md inline-flex ${
                    isDarkMode 
                      ? 'text-yellow-200 hover:text-yellow-100' 
                      : 'text-yellow-600 hover:text-yellow-800'
                  }`}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className={`text-3xl font-bold mb-2 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Portfolio
        </h1>
        <p className={`text-lg ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Overview of your staked assets and pending rewards
        </p>
      </motion.div>

      {!isConnected ? (
        <div className="text-center py-12">
          <div className={`text-lg mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Wallet not connected
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please connect your wallet to view your portfolio
          </p>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Loading portfolio...
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className={`text-lg mb-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
            Failed to load portfolio
          </div>
          <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {error}
          </p>
          <button
            onClick={fetchPortfolioData}
            className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Overview Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className={`p-6 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Total Balance
              </h3>
              <p className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                ${(overview.totalStakedValue + overview.totalPendingRewards + overview.totalUnstakingValue + overview.totalAvailableValue).toFixed(2)}
              </p>
            </div>

            <div className={`p-6 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Available Balance
              </h3>
              <p className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                ${overview.totalAvailableValue.toFixed(2)}
              </p>
            </div>
            <div className={`p-6 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Total Staked
              </h3>
              <p className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                ${overview.totalStakedValue.toFixed(2)}
              </p>
            </div>

            <div className={`p-6 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Pending Rewards
              </h3>
              <p className={`text-2xl font-bold text-green-600 ${
                isDarkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                ${overview.totalPendingRewards.toFixed(2)}
              </p>
            </div>

            <div className={`p-6 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Unstaking
              </h3>
              <p className={`text-2xl font-bold text-yellow-600 ${
                isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
              }`}>
                ${overview.totalUnstakingValue.toFixed(2)}
              </p>
            </div>

            {/* <div className={`p-6 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Assets
              </h3>
              <p className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {overview.totalAssets}
              </p>
            </div> */}

            <div className={`p-6 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Avg APR
              </h3>
              <p className={`text-2xl font-bold text-teal-600 ${
                isDarkMode ? 'text-teal-400' : 'text-teal-600'
              }`}>
                {overview.averageAPR.toFixed(1)}%
              </p>
            </div>
          </motion.div>

          {/* Available Balances and Unstaking Assets Row */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Available Balances - 1/3 width */}
            <div className="lg:col-span-1">
              <h2 className={`text-xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Available Balances
              </h2>
              
              {availableBalances.length === 0 ? (
                <div className={`text-center py-6 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 text-gray-400' 
                    : 'bg-white border-gray-200 text-gray-600'
                }`}>
                  No available balances
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border shadow-sm">
                  <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-700 divide-gray-700' 
                        : 'bg-white border-gray-200 divide-gray-200'
                    }`}>
                      <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Asset
                          </th>
                          <th className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${
                        isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                      }`}>
                        {availableBalances.map((balance, index) => {
                          const usdValue = parseFloat(balance.availableBalance) * balance.usdPrice;
                          return (
                            <motion.tr
                              key={balance._id}
                              className={`hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-200`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.4, delay: index * 0.1 }}
                            >
                              <td className={`px-4 py-3 whitespace-nowrap ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                <div className="flex items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                                    balance.asset === 'ATOM' ? 'bg-blue-600 text-white' :
                                    balance.asset === 'AKT' ? 'bg-red-600 text-white' :
                                    'bg-purple-600 text-white'
                                  }`}>
                                    {balance.asset.slice(0, 2)}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium">{balance.asset}</div>
                                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {balance.prettyName}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className={`px-4 py-3 whitespace-nowrap text-right ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                <div className="text-sm font-medium">
                                  {parseFloat(balance.availableBalance).toFixed(2)} {balance.asset}
                                </div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  ${usdValue.toFixed(2)}
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Unstaking Assets - 2/3 width */}
            <div className="lg:col-span-2">
              <h2 className={`text-xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Unstaking Assets
              </h2>
              
              {unstakingAssets.length === 0 ? (
                <div className={`text-center py-6 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 text-gray-400' 
                    : 'bg-white border-gray-200 text-gray-600'
                }`}>
                  No unstaking assets
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border shadow-sm">
                  <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-700 divide-gray-700' 
                        : 'bg-white border-gray-200 divide-gray-200'
                    }`}>
                      <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Asset
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Amount
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Completion Date
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Days Remaining
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Validator
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${
                        isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                      }`}>
                        {unstakingAssets.map((asset, index) => (
                          <motion.tr
                            key={asset._id}
                            className={`hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-200`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                          >
                            <td className={`px-6 py-4 whitespace-nowrap ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              <div>
                                <div className="text-sm font-medium">{asset.chainName}</div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {asset.asset}
                                </div>
                              </div>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {asset.amount} {asset.asset}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {formatDate(asset.completionDate)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                            }`}>
                              {getDaysRemaining(asset.completionDate)} days
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {asset.validatorName}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Staked Assets */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h2 className={`text-2xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Staked Assets
            </h2>
            
            {stakedAssets.length === 0 ? (
              <div className={`text-center py-8 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                No staked assets found
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border shadow-sm">
                <div className="overflow-x-auto">
                  <table className={`min-w-full divide-y ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700 divide-gray-700' 
                      : 'bg-white border-gray-200 divide-gray-200'
                  }`}>
                    <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          Asset
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          Staked Amount
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          Pending Rewards
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          APR
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          Validator
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${
                      isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                    }`}>
                      {stakedAssets.map((asset, index) => (
                        <motion.tr
                          key={asset._id}
                          className={`hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-200`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                        >
                          <td className={`px-6 py-4 whitespace-nowrap ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            <div>
                              <div className="text-sm font-medium">{asset.prettyName}</div>
                              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {asset.asset}
                              </div>
                            </div>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {asset.stakedAmount} {asset.asset}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            isDarkMode ? 'text-green-400' : 'text-green-600'
                          }`}>
                            {asset.pendingRewards} {asset.asset}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            isDarkMode ? 'text-teal-400' : 'text-teal-600'
                          }`}>
                            {asset.apr.toFixed(1)}%
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {asset.validatorName}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default InvestorPortfolio;

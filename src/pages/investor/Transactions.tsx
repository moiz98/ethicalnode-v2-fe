import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';

interface Transaction {
  _id: string;
  txHash: string;
  chainId: string;
  chainName: string;
  type: 'stake' | 'unstake' | 'claim' | 'transfer';
  amount: string;
  asset: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: string;
  validatorAddress?: string;
  validatorName?: string;
  fee: string;
  blockHeight?: number;
}

const Transactions: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { isConnected, keplrAddress, namadaAddress } = useWallet();
  
  // Use Keplr address if available, otherwise use Namada
  const primaryAddress = keplrAddress || namadaAddress;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'stake' | 'unstake' | 'claim' | 'transfer'>('all');
  const hasInitialized = useRef(false);

  // Mock data for demonstration - replace with actual API call
  const mockTransactions: Transaction[] = [
    {
      _id: '1',
      txHash: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 'cosmoshub-4',
      chainName: 'cosmoshub',
      type: 'stake',
      amount: '100',
      asset: 'ATOM',
      status: 'success',
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      validatorAddress: 'cosmosvaloper1...',
      validatorName: 'EthicalNode Validator',
      fee: '0.01',
      blockHeight: 12345678
    },
    {
      _id: '2',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef12',
      chainId: 'akashnet-2',
      chainName: 'akash',
      type: 'claim',
      amount: '5.5',
      asset: 'AKT',
      status: 'success',
      timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      validatorAddress: 'akashvaloper1...',
      validatorName: 'EthicalNode Validator',
      fee: '0.005',
      blockHeight: 8765432
    },
    {
      _id: '3',
      txHash: '0x567890abcdef1234567890abcdef1234567890ab',
      chainId: 'fetchhub-4',
      chainName: 'fetchhub',
      type: 'unstake',
      amount: '50',
      asset: 'FET',
      status: 'pending',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      validatorAddress: 'fetchvaloper1...',
      validatorName: 'EthicalNode Validator',
      fee: '0.02'
    }
  ];

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching transactions for wallet:', primaryAddress);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, you would call your API here:
      // const response = await fetch(`http://localhost:3000/api/transactions?wallet=${walletAddress}`);
      // const result = await response.json();
      
      // For now, using mock data
      setTransactions(mockTransactions);
      
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transaction data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isConnected) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    if (hasInitialized.current) {
      return;
    }
    
    hasInitialized.current = true;
    fetchTransactions();
  }, [isConnected, primaryAddress]);

  const filteredTransactions = transactions.filter(tx => 
    filter === 'all' || tx.type === filter
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return isDarkMode 
          ? 'bg-green-900/30 text-green-400 border-green-400/30' 
          : 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return isDarkMode 
          ? 'bg-yellow-900/30 text-yellow-400 border-yellow-400/30' 
          : 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return isDarkMode 
          ? 'bg-red-900/30 text-red-400 border-red-400/30' 
          : 'bg-red-100 text-red-800 border-red-200';
      default:
        return isDarkMode 
          ? 'bg-gray-900/30 text-gray-400 border-gray-400/30' 
          : 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'stake':
        return isDarkMode ? 'text-green-400' : 'text-green-600';
      case 'unstake':
        return isDarkMode ? 'text-red-400' : 'text-red-600';
      case 'claim':
        return isDarkMode ? 'text-blue-400' : 'text-blue-600';
      case 'transfer':
        return isDarkMode ? 'text-purple-400' : 'text-purple-600';
      default:
        return isDarkMode ? 'text-gray-400' : 'text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} min-h-screen`}>
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
          Transactions
        </h1>
        <p className={`text-lg ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          View your transaction history across all connected chains
        </p>
      </motion.div>

      {!isConnected ? (
        <div className="text-center py-12">
          <div className={`text-lg mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Wallet not connected
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please connect your wallet to view transaction history
          </p>
        </div>
      ) : (
        <>
          {/* Filter Tabs */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex space-x-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800">
              {['all', 'stake', 'unstake', 'claim', 'transfer'].map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType as any)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filter === filterType
                      ? 'bg-white text-teal-600 shadow-sm dark:bg-gray-700 dark:text-teal-400'
                      : isDarkMode
                        ? 'text-gray-400 hover:text-gray-200'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Loading transactions...
                </span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className={`text-lg mb-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                Failed to load transactions
              </div>
              <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {error}
              </p>
              <button
                onClick={fetchTransactions}
                className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Retry
              </button>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className={`text-lg mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                No transactions found
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {filter === 'all' 
                  ? 'You haven\'t made any transactions yet' 
                  : `No ${filter} transactions found`
                }
              </p>
            </div>
          ) : (
            <motion.div
              className="overflow-hidden rounded-lg border shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
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
                        Transaction Hash
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Type
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Amount
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Chain
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Status
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                  }`}>
                    {filteredTransactions.map((transaction, index) => (
                      <motion.tr
                        key={transaction._id}
                        className={`hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-200`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                      >
                        <td className={`px-6 py-4 whitespace-nowrap ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          <div className="flex items-center">
                            <span 
                              className="text-sm font-mono cursor-pointer hover:text-teal-600"
                              onClick={() => copyToClipboard(transaction.txHash)}
                              title="Click to copy"
                            >
                              {truncateHash(transaction.txHash)}
                            </span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          getTypeColor(transaction.type)
                        }`}>
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {transaction.amount} {transaction.asset}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {transaction.chainName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            getStatusColor(transaction.status)
                          }`}>
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {formatDate(transaction.timestamp)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default Transactions;

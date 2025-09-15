import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';

interface Transaction {
  _id: string;
  txHash: string;
  userPublicAddress: string;
  chainId: string;
  chainName: string;
  type: 'delegate' | 'undelegate' | 'redelegate' | 'claim_rewards' | 'cancel_undelegate'; // Added 'cancel_undelegate' type
  amount: string;
  tokenSymbol: string;
  tokenDenom: string;
  validatorAddress: string;
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface TransactionsResponse {
  success: boolean;
  message: string;
  data: {
    transactions: Transaction[];
    pagination: PaginationInfo;
  };
}

const Transactions: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { isConnected, keplrPublicKey } = useWallet();
  
  // Use Keplr Public Address
  const primaryAddress = keplrPublicKey;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'delegate' | 'undelegate' | 'redelegate' | 'claim_rewards'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [chainFilter, setChainFilter] = useState<string>('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showChainDropdown, setShowChainDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const hasInitialized = useRef(false);

  const fetchTransactions = async (page: number = 1) => {
    if (!primaryAddress) {
      setTransactions([]);
      setPagination(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching transactions for wallet:', primaryAddress);
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20' // Show 20 transactions per page
      });

      // Add filters if selected
      if (filter !== 'all') {
        queryParams.append('type', filter);
      }
      if (statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }
      if (chainFilter !== 'all') {
        queryParams.append('chainId', chainFilter);
      }

      const apiUrl = `http://localhost:3000/api/transactions/investor/${primaryAddress}?${queryParams}`;
      console.log('API URL:', apiUrl);

      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`);
      }
      
      const result: TransactionsResponse = await response.json();
      console.log('Transactions API Response:', result);
      
      if (result.success && result.data) {
        setTransactions(result.data.transactions);
        setPagination(result.data.pagination);
      } else {
        throw new Error(result.message || 'Failed to fetch transactions');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transaction data');
      setTransactions([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isConnected || !primaryAddress) {
      setTransactions([]);
      setPagination(null);
      setLoading(false);
      return;
    }

    // Reset to first page when filters change, otherwise use current page
    const pageToFetch = hasInitialized.current ? 1 : currentPage;
    if (hasInitialized.current) {
      setCurrentPage(1);
    } else {
      hasInitialized.current = true;
    }
    
    fetchTransactions(pageToFetch);
  }, [isConnected, primaryAddress, filter, statusFilter, chainFilter]);

  // Handle page changes separately (only when page changes, not filters)
  useEffect(() => {
    if (hasInitialized.current && isConnected && primaryAddress && currentPage > 1) {
      fetchTransactions(currentPage);
    }
  }, [currentPage]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowTypeDropdown(false);
        setShowStatusDropdown(false);
        setShowChainDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter transactions based on search query (client-side filtering for search)
  const filteredTransactions = transactions.filter(transaction => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      transaction.txHash.toLowerCase().includes(query) ||
      transaction.chainName.toLowerCase().includes(query) ||
      transaction.tokenSymbol.toLowerCase().includes(query) ||
      formatTransactionType(transaction.type).toLowerCase().includes(query) ||
      transaction.status.toLowerCase().includes(query)
    );
  });

  // Get unique chains from transactions for the filter dropdown
  const getUniqueChains = () => {
    const chains = transactions.reduce((acc: { chainId: string; chainName: string }[], transaction) => {
      const existingChain = acc.find(chain => chain.chainId === transaction.chainId);
      if (!existingChain) {
        acc.push({ chainId: transaction.chainId, chainName: transaction.chainName });
      }
      return acc;
    }, []);
    return chains.sort((a, b) => a.chainName.localeCompare(b.chainName));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'delegate':
        return isDarkMode ? 'text-green-400' : 'text-green-600';
      case 'undelegate':
        return isDarkMode ? 'text-red-400' : 'text-red-600';
      case 'redelegate':
        return isDarkMode ? 'text-yellow-400' : 'text-yellow-600';
      case 'claim_rewards':
        return isDarkMode ? 'text-blue-400' : 'text-blue-600';
      case 'cancel_undelegate':
        return isDarkMode ? 'text-green-400' : 'text-green-600';
      default:
        return isDarkMode ? 'text-gray-400' : 'text-gray-600';
    }
  };

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'delegate':
        return 'Stake';
      case 'undelegate':
        return 'Unstake';
      case 'redelegate':
        return 'Redelegate';
      case 'claim_rewards':
        return 'Claim Rewards';
      case 'cancel_undelegate':
        return 'Cancel Unstake';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const formatAmount = (amount: string, tokenSymbol: string) => {
    // Convert from base units to display units
    // Most tokens have 6 decimal places (micro units)
    const decimals = 6;
    const displayAmount = (parseInt(amount) / Math.pow(10, decimals)).toFixed(6);
    // Remove trailing zeros
    const formattedAmount = parseFloat(displayAmount).toString();
    return `${formattedAmount} ${tokenSymbol}`;
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
          {/* Search and Filters Bar */}
          <motion.div
            className={`mb-6 p-4 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Left Side - Search Bar */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search blockchain or token"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm transition-colors ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-gray-300 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
                        : 'bg-gray-50 border-gray-300 text-gray-700 placeholder-gray-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
                    }`}
                  />
                </div>
              </div>

              {/* Right Side - Filters */}
              <div className="flex items-center gap-3">
                {/* Transaction Type Dropdown */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => {
                      setShowTypeDropdown(!showTypeDropdown);
                      setShowStatusDropdown(false);
                      setShowChainDropdown(false);
                    }}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors flex items-center gap-2 min-w-[140px] justify-between ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{filter === 'all' ? 'All Types' : formatTransactionType(filter)}</span>
                    <svg className={`w-4 h-4 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showTypeDropdown && (
                    <div className={`absolute top-full right-0 mt-1 w-48 rounded-lg border shadow-xl z-20 ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-white border-gray-200'
                    }`}>
                      {['all', 'delegate', 'undelegate', 'redelegate', 'claim_rewards'].map((filterType) => (
                        <button
                          key={filterType}
                          onClick={() => {
                            setFilter(filterType as any);
                            setShowTypeDropdown(false);
                          }}
                          className={`w-full px-4 py-3 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                            filter === filterType
                              ? isDarkMode
                                ? 'bg-teal-600 text-white'
                                : 'bg-teal-50 text-teal-700'
                              : isDarkMode
                                ? 'text-gray-300 hover:bg-gray-600'
                                : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {filterType === 'all' ? 'All Types' : formatTransactionType(filterType)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Dropdown */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => {
                      setShowStatusDropdown(!showStatusDropdown);
                      setShowTypeDropdown(false);
                      setShowChainDropdown(false);
                    }}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors flex items-center gap-2 min-w-[120px] justify-between ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{statusFilter === 'all' ? 'All Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
                    <svg className={`w-4 h-4 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showStatusDropdown && (
                    <div className={`absolute top-full right-0 mt-1 w-36 rounded-lg border shadow-xl z-20 ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-white border-gray-200'
                    }`}>
                      {['all', 'success', 'pending', 'failed'].map((statusType) => (
                        <button
                          key={statusType}
                          onClick={() => {
                            setStatusFilter(statusType as any);
                            setShowStatusDropdown(false);
                          }}
                          className={`w-full px-4 py-3 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center ${
                            statusFilter === statusType
                              ? isDarkMode
                                ? 'bg-teal-600 text-white'
                                : 'bg-teal-50 text-teal-700'
                              : isDarkMode
                                ? 'text-gray-300 hover:bg-gray-600'
                                : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {statusType !== 'all' && (
                            <span className={`inline-block w-2 h-2 rounded-full mr-3 ${
                              statusType === 'success' 
                                ? 'bg-green-500'
                                : statusType === 'pending'
                                  ? 'bg-yellow-500'
                                  : statusType === 'failed'
                                    ? 'bg-red-500'
                                    : 'bg-gray-500'
                            }`} />
                          )}
                          {statusType === 'all' ? 'All Status' : statusType.charAt(0).toUpperCase() + statusType.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chain Filter Dropdown */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => {
                      setShowChainDropdown(!showChainDropdown);
                      setShowTypeDropdown(false);
                      setShowStatusDropdown(false);
                    }}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors flex items-center gap-2 min-w-[140px] justify-between ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>
                      {chainFilter === 'all' 
                        ? 'All Chains' 
                        : getUniqueChains().find(chain => chain.chainId === chainFilter)?.chainName || 'Unknown Chain'
                      }
                    </span>
                    <svg className={`w-4 h-4 transition-transform ${showChainDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showChainDropdown && (
                    <div className={`absolute top-full right-0 mt-1 w-48 rounded-lg border shadow-xl z-20 max-h-64 overflow-y-auto ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-white border-gray-200'
                    }`}>
                      <button
                        onClick={() => {
                          setChainFilter('all');
                          setShowChainDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm transition-colors first:rounded-t-lg ${
                          chainFilter === 'all'
                            ? isDarkMode
                              ? 'bg-teal-600 text-white'
                              : 'bg-teal-50 text-teal-700'
                            : isDarkMode
                              ? 'text-gray-300 hover:bg-gray-600'
                              : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        All Chains
                      </button>
                      {getUniqueChains().map((chain) => (
                        <button
                          key={chain.chainId}
                          onClick={() => {
                            setChainFilter(chain.chainId);
                            setShowChainDropdown(false);
                          }}
                          className={`w-full px-4 py-3 text-left text-sm transition-colors last:rounded-b-lg ${
                            chainFilter === chain.chainId
                              ? isDarkMode
                                ? 'bg-teal-600 text-white'
                                : 'bg-teal-50 text-teal-700'
                              : isDarkMode
                                ? 'text-gray-300 hover:bg-gray-600'
                                : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="font-medium">{chain.chainName}</span>
                            <span className={`ml-2 text-xs ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {chain.chainId}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Clear Filters Button */}
                {(filter !== 'all' || statusFilter !== 'all' || chainFilter !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setFilter('all');
                      setStatusFilter('all');
                      setChainFilter('all');
                      setSearchQuery('');
                    }}
                    className={`px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      isDarkMode
                        ? 'text-gray-400 hover:text-gray-200'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Clear all filters"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
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
                onClick={() => fetchTransactions(currentPage)}
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
              className={`rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <th className={`px-6 py-4 text-left text-sm font-medium ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Transaction Hash
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-medium ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Type
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-medium ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Amount
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-medium ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Chain
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-medium ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Status
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-medium ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction, index) => (
                      <motion.tr
                        key={transaction._id}
                        className={`border-b transition-colors duration-200 ${
                          isDarkMode 
                            ? 'border-gray-700 hover:bg-gray-750' 
                            : 'border-gray-100 hover:bg-gray-50'
                        }`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.02 }}
                      >
                        <td className="px-6 py-4">
                          <button
                            className={`text-sm font-mono hover:text-teal-500 transition-colors ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}
                            onClick={() => copyToClipboard(transaction.txHash)}
                            title="Click to copy transaction hash"
                          >
                            {truncateHash(transaction.txHash)}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-medium ${getTypeColor(transaction.type)}`}>
                            {formatTransactionType(transaction.type)}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {formatAmount(transaction.amount, transaction.tokenSymbol)}
                        </td>
                        <td className={`px-6 py-4 text-sm ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {transaction.chainName}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            transaction.status === 'success'
                              ? isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                              : transaction.status === 'pending'
                                ? isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
                                : isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status === 'success' && '✓ '}
                            {transaction.status === 'pending' && '⏳ '}
                            {transaction.status === 'failed' && '✗ '}
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {formatDate(transaction.createdAt)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Results Count */}
              <div className={`px-6 py-3 border-t text-sm ${
                isDarkMode 
                  ? 'border-gray-700 text-gray-400 bg-gray-750' 
                  : 'border-gray-200 text-gray-500 bg-gray-50'
              }`}>
                Showing {filteredTransactions.length} of {transactions.length} transactions
                {(filteredTransactions.length !== transactions.length || searchQuery) && (
                  <span className="ml-2">
                    • {filteredTransactions.length} active • {transactions.length - filteredTransactions.length} filtered
                  </span>
                )}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className={`px-6 py-4 border-t flex items-center justify-between ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transactions
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={!pagination.hasPrev}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        pagination.hasPrev
                          ? isDarkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : isDarkMode
                            ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Previous
                    </button>
                    
                    <span className={`px-3 py-1 text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                      disabled={!pagination.hasNext}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        pagination.hasNext
                          ? isDarkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : isDarkMode
                            ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default Transactions;

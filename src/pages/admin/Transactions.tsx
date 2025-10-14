import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { Search, Filter, RefreshCw, Calendar, DollarSign, User, Activity, CheckCircle, XCircle } from 'lucide-react';
import adminApiClient from '../../utils/adminApiClient';
import { assetLists, chains } from 'chain-registry';

interface Transaction {
  _id: string;
  txHash: string;
  userPublicAddress: string;
  chainId: string;
  chainName: string;
  type: string;
  amount: number;
  tokenSymbol: string;
  tokenDenom: string;
  validatorAddress: string;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  rawTx?: any;
  createdAt: string;
  updatedAt: string;
}

interface TransactionFilters {
  userAddress: string;
  chainId: string;
  type: string;
  status: string;
  search: string;
}

const Transactions: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>({
    userAddress: '',
    chainId: '',
    type: '',
    status: '',
    search: ''
  });
  const [appliedFilters, setAppliedFilters] = useState<TransactionFilters>({
    userAddress: '',
    chainId: '',
    type: '',
    status: '',
    search: ''
  });

  // Get unique chain IDs and names from transactions data
  const getAvailableChains = () => {
    const chainMap = new Map<string, string>();
    
    transactions.forEach(transaction => {
      const chainId = transaction.chainId;
      const chainName = transaction.chainName || getChainDisplayName(transaction.chainName, transaction.chainId);
      if (chainId && chainName) {
        chainMap.set(chainId, chainName);
      }
    });
    
    return Array.from(chainMap.entries()).map(([chainId, chainName]) => ({
      chainId,
      chainName
    }));
  };

  // Get unique transaction types from transactions data
  const getAvailableTransactionTypes = () => {
    const types = new Set<string>();
    transactions.forEach(transaction => {
      if (transaction.type) {
        types.add(transaction.type);
      }
    });
    return Array.from(types);
  };

  // Format transaction type for display
  const formatTransactionType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Fetch transactions from API
  const fetchTransactions = async (page: number = 1, filters: TransactionFilters = appliedFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim()) {
          params.append(key, value.trim());
        }
      });

      const result = await adminApiClient.get<{
        transactions: Transaction[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      }>(`/admin/transactions?${params}`);
      
      if (result.success && result.data) {
        setTransactions(result.data.transactions);
        setTotalCount(result.data.pagination.total);
        setTotalPages(result.data.pagination.totalPages);
        setCurrentPage(result.data.pagination.page);
      } else {
        throw new Error(result.message || 'Failed to fetch transactions');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (key: keyof TransactionFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    setAppliedFilters(filters);
    setCurrentPage(1);
    fetchTransactions(1, filters);
    setShowFilters(false);
  };

  // Clear filters
  const clearFilters = () => {
    const emptyFilters = {
      userAddress: '',
      chainId: '',
      type: '',
      status: '',
      search: ''
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setCurrentPage(1);
    fetchTransactions(1, emptyFilters);
    setShowFilters(false);
  };

   // Format token amount from base units to display units
  const formatTokenAmount = (chainId: string, amount: number, denom: string) => {
    const fullChainData = chains.find(c => c.chainId === chainId);
    const assetList = assetLists.find(a => a.chainName === fullChainData?.chainName);
    const assetData = assetList ? assetList.assets.find(a =>  a.typeAsset === 'sdk.coin') : null;
    const exponent = assetData ? assetData.denomUnits.find(d => d.denom === assetData.display)?.exponent : undefined;

    if (exponent !== undefined) {

      // Convert from base units to display units using the correct exponent
      // For example: uakt -> AKT, uatom -> ATOM, etc.
      const displayAmount = amount / Math.pow(10, exponent); // Most cosmos tokens use 6 decimal places
    
      // Get display denomination by removing 'u' prefix
      const displayDenom = assetData ? assetData.display : denom.replace(/^u/, '').toUpperCase();
    
      // Format the amount based on size
      let formattedAmount: string;
      if (displayAmount === 0) {
        formattedAmount = '0';
      } else if (displayAmount < 0.000001) {
        formattedAmount = '<0.000001';
      } else if (displayAmount < 0.01) {
        formattedAmount = displayAmount.toFixed(6);
      } else if (displayAmount < 1) {
        formattedAmount = displayAmount.toFixed(4);
      } else if (displayAmount < 1000) {
        formattedAmount = displayAmount.toFixed(2);
      } else if (displayAmount < 1000000) {
        formattedAmount = (displayAmount / 1000).toFixed(2) + 'K';
      } else {
        formattedAmount = (displayAmount / 1000000).toFixed(2) + 'M';
      }
    
      return `${formattedAmount} ${displayDenom}`;
    } else {
      return `${amount} ${denom}`; // Fallback if exponent not found
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchTransactions(page);
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(`${type} copied to clipboard!`);
      setTimeout(() => setCopyMessage(null), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyMessage('Failed to copy to clipboard');
      setTimeout(() => setCopyMessage(null), 3000);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format amount with proper decimal places
  // const formatAmount = (amount: number, tokenSymbol: string) => {
  //   // Convert from base units to display units (assuming 6 decimal places for most tokens)
  //   const displayAmount = amount / 1000000;
  //   return `${displayAmount.toFixed(6)} ${tokenSymbol}`;
  // };

  // Get chain display name
  const getChainDisplayName = (chainName?: string, chainId?: string) => {
    if (chainName) return chainName;

    const fullChainData = chains.find(c => c.chainId === chainId);
    return fullChainData?.prettyName || fullChainData?.chainName;
  };

  // Truncate address for display
  const truncateAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  // Truncate hash for display
  const truncateHash = (hash: string) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 12)}...${hash.slice(-8)}`;
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} min-h-screen`}>
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Transactions Management
        </h1>
        <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          View and manage all platform transactions
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          className={`p-6 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200 shadow-sm'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Transactions
              </p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {totalCount.toLocaleString()}
              </p>
            </div>
            <Activity className={`h-8 w-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
          </div>
        </motion.div>

        <motion.div
          className={`p-6 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200 shadow-sm'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Successful
              </p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {transactions.filter(t => t.status === 'success').length}
              </p>
            </div>
            <CheckCircle className={`h-8 w-8 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`} />
          </div>
        </motion.div>

        <motion.div
          className={`p-6 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200 shadow-sm'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Failed
              </p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {transactions.filter(t => t.status === 'failed').length}
              </p>
            </div>
            <XCircle className={`h-8 w-8 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
          </div>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <motion.div
        className={`p-6 rounded-lg border mb-6 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200 shadow-sm'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by hash or user address..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>

          {/* Filter Toggle and Refresh */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                isDarkMode
                  ? 'border-gray-600 hover:bg-gray-700 text-white'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>
            
            <button
              onClick={() => fetchTransactions(currentPage)}
              disabled={loading}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={applyFilters}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* User Address */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    User Address
                  </label>
                  <input
                    type="text"
                    placeholder="Enter user address..."
                    value={filters.userAddress}
                    onChange={(e) => handleFilterChange('userAddress', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                {/* Chain ID */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Chain
                  </label>
                  <select
                    value={filters.chainId}
                    onChange={(e) => handleFilterChange('chainId', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Chains</option>
                    {getAvailableChains().map(({ chainId, chainName }) => (
                      <option key={chainId} value={chainId}>
                        {chainName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transaction Type */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Transaction Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Types</option>
                    {getAvailableTransactionTypes().map(type => (
                      <option key={type} value={type}>
                        {formatTransactionType(type)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Status</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-4">
                <button
                  onClick={clearFilters}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    isDarkMode
                      ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  Clear Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Transactions Table */}
      <motion.div
        className={`rounded-lg border overflow-hidden ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200 shadow-sm'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <span className={`ml-3 text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Loading transactions...
            </span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-12">
            <XCircle className="h-8 w-8 text-red-500" />
            <span className={`ml-3 text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {error}
            </span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <Activity className="h-8 w-8 text-gray-400" />
            <span className={`ml-3 text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No transactions found
            </span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
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
                      User Address
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Validator
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
                <tbody className={`divide-y ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                  {transactions.map((transaction) => (
                    <tr key={transaction._id} className={`hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span 
                            className={`text-sm font-mono cursor-pointer hover:underline ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
                            onClick={() => copyToClipboard(transaction.txHash, 'Transaction hash')}
                            title={`Click to copy: ${transaction.txHash}`}
                          >
                            {truncateHash(transaction.txHash)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <User className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span 
                            className={`text-sm font-mono cursor-pointer hover:underline ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                            onClick={() => copyToClipboard(transaction.userPublicAddress, 'User address')}
                            title={`Click to copy: ${transaction.userPublicAddress}`}
                          >
                            {truncateAddress(transaction.userPublicAddress || 'N/A')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {transaction.validatorAddress ? truncateAddress(transaction.validatorAddress) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {formatTransactionType(transaction.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <DollarSign className={`h-4 w-4 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`} />
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatTokenAmount(transaction.chainId, transaction.amount, transaction.tokenDenom)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {getChainDisplayName(transaction.chainName, transaction.chainId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="flex flex-col">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(transaction.status)}`}>
                              {transaction.status.toUpperCase()}
                            </span>
                            {transaction.errorMessage && (
                              <span className="text-xs text-red-600 mt-1 max-w-32 truncate" title={transaction.errorMessage}>
                                {transaction.errorMessage}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {formatDate(transaction.createdAt)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                    Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} transactions
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDarkMode
                          ? 'border-gray-600 hover:bg-gray-700 text-white'
                          : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            currentPage === page
                              ? isDarkMode
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-500 text-white'
                              : isDarkMode
                                ? 'hover:bg-gray-700 text-gray-300'
                                : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDarkMode
                          ? 'border-gray-600 hover:bg-gray-700 text-white'
                          : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Copy Message Toast */}
      <AnimatePresence>
        {copyMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50"
          >
            {copyMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Transactions;
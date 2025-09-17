import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import adminApiClient from '../../utils/adminApiClient';
import { Wallet, Plus, RefreshCw, Eye, Trash2, Copy, X, Loader2, AlertTriangle } from 'lucide-react';

// TypeScript interfaces
interface RewardsWallet {
  publicAddress: string;
  chainId: string;
  chainName: string;
  prettyName: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
  balance?: {
    amount: string;
    denom: string;
    formatted: string;
  } | null;
  balanceLoading?: boolean;
}

interface ChainOption {
  chainId: string;
  chainName: string;
  prettyName: string;
  isSupported: boolean;
  isNamada: boolean;
}

interface ValidatorRecord {
  _id: string;
  chainId: string;
  chainName: string;
  prettyName: string;
  validatorAddress: string;
  moniker: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ValidatorsResponse {
  success: boolean;
  data?: {
    validators: ValidatorRecord[];
    pagination?: any;
  };
  message?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface WalletsResponse {
  success: boolean;
  data?: {
    wallets: RewardsWallet[];
    pagination: PaginationInfo;
  };
  message?: string;
}

const RewardsWalletsManagement: React.FC = () => {
  const { isDarkMode } = useTheme();
  
  // State management
  const [wallets, setWallets] = useState<RewardsWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  
  // Form states
  const [newWallet, setNewWallet] = useState({
    chainId: ''
  });
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<RewardsWallet | null>(null);
  const [deletingWallet, setDeletingWallet] = useState(false);
  const [walletSecret, setWalletSecret] = useState<{
    chainId: string;
    publicAddress: string;
    secretPhrase: string;
    warning: string;
  } | null>(null);
  const [loadingSecret, setLoadingSecret] = useState(false);
  
  // Chain options
  const [chainOptions, setChainOptions] = useState<ChainOption[]>([]);
  const [loadingChains, setLoadingChains] = useState(true);

  // Toast notification system
  const showToastMessage = (message: string, isError = false) => {
    setCopyToast(message);
    setTimeout(() => setCopyToast(null), isError ? 5000 : 3000);
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToastMessage('✅ Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showToastMessage('❌ Failed to copy to clipboard', true);
    }
  };

  // Fetch wallets from backend
  const fetchWallets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result: WalletsResponse = await adminApiClient.get('/admin/rewards-wallets');
      
      if (result.success && result.data?.wallets) {
        setWallets(result.data.wallets);
      } else {
        throw new Error(result.message || 'Failed to fetch wallets');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load wallets';
      setError(errorMessage);
      showToastMessage(`❌ ${errorMessage}`, true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available chains from validators
  const fetchAvailableChains = async () => {
    try {
      setLoadingChains(true);
      
      const result: ValidatorsResponse = await adminApiClient.get('/admin/validators?limit=1000&active=true');
      
      if (result.success && result.data?.validators) {
        const uniqueChainsMap = new Map<string, ChainOption>();
        
        result.data.validators.forEach((validator: ValidatorRecord) => {
          if (!uniqueChainsMap.has(validator.chainId)) {
            uniqueChainsMap.set(validator.chainId, {
              chainId: validator.chainId,
              chainName: validator.chainName,
              prettyName: validator.prettyName,
              isSupported: true,
              isNamada: validator.chainName.toLowerCase().includes('namada') || validator.chainId.includes('namada')
            });
          }
        });
        
        const chainOptionsArray = Array.from(uniqueChainsMap.values()).sort((a, b) => 
          a.prettyName.localeCompare(b.prettyName)
        );
        
        setChainOptions(chainOptionsArray);
      } else {
        setChainOptions([]);
        showToastMessage('❌ Failed to fetch available chains from validators', true);
      }
    } catch (error) {
      console.error('Error fetching chains:', error);
      setChainOptions([]);
      showToastMessage('❌ Error loading chains', true);
    } finally {
      setLoadingChains(false);
    }
  };

  // Create new wallet
  const handleCreateWallet = async () => {
    if (creatingWallet) return;
    
    if (!newWallet.chainId.trim()) {
      showToastMessage('❌ Please select a chain', true);
      return;
    }

    setCreatingWallet(true);

    try {
      const result = await adminApiClient.post('/admin/rewards-wallets', {
        chainId: newWallet.chainId
      });

      if (result.success && result.data) {
        // Backend returns wallet data in result.data.wallet
        const walletData = result.data.wallet || result.data;
        console.log('Created wallet data:', walletData); // Debug log
        
        // Ensure we have valid wallet data before adding to state
        if (walletData && walletData.publicAddress && walletData.chainId) {
          setWallets([walletData, ...wallets]);
          setShowCreateModal(false);
          setNewWallet({ chainId: '' });
          showToastMessage('✅ Rewards wallet created successfully!');
          
          // Fetch balance for the newly created wallet
          setTimeout(() => {
            refreshWalletBalance(walletData.chainId);
          }, 1000);
        } else {
          console.error('Invalid wallet data received:', walletData);
          throw new Error('Invalid wallet data received from server');
        }
      } else {
        throw new Error(result.message || 'Failed to create wallet');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      showToastMessage(`❌ ${errorMessage}`, true);
    } finally {
      setCreatingWallet(false);
    }
  };

  // Show delete confirmation
  const showDeleteConfirmation = (wallet: RewardsWallet) => {
    setWalletToDelete(wallet);
    setShowDeleteModal(true);
  };

  // Delete wallet
  const handleDeleteWallet = async () => {
    if (!walletToDelete) return;

    setDeletingWallet(true);
    try {
      const result = await adminApiClient.delete(`/admin/rewards-wallets/${walletToDelete.chainId}`);
      
      if (result.success) {
        setWallets(wallets.filter(w => w.chainId !== walletToDelete.chainId));
        setShowDeleteModal(false);
        setWalletToDelete(null);
        showToastMessage('✅ Wallet deleted successfully!');
      } else {
        throw new Error(result.message || 'Failed to delete wallet');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete wallet';
      showToastMessage(`❌ ${errorMessage}`, true);
    } finally {
      setDeletingWallet(false);
    }
  };

  // View wallet secret
  const handleViewSecret = async (chainId: string) => {
    setLoadingSecret(true);
    
    try {
      const result = await adminApiClient.get(`/admin/rewards-wallets/${chainId}/secret`);
      
      if (result.success && result.data) {
        setWalletSecret(result.data);
        setShowSecretModal(true);
      } else {
        throw new Error(result.message || 'Failed to retrieve secret phrase');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showToastMessage(`❌ ${errorMessage}`, true);
    } finally {
      setLoadingSecret(false);
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format balance display
  const formatBalance = (balance: { amount: string; denom: string; formatted: string }) => {
    const amount = parseFloat(balance.amount);
    if (isNaN(amount)) return '0';
    if (amount === 0) return '0';
    if (amount < 0.000001) return '<0.000001';
    if (amount < 0.001) return amount.toFixed(6);
    if (amount < 1) return amount.toFixed(6);
    if (amount < 1000) return amount.toFixed(3);
    if (amount < 1000000) return (amount / 1000).toFixed(2) + 'K';
    return (amount / 1000000).toFixed(2) + 'M';
  };

  // Check if chain is Namada
  const isNamadaChain = (chainId: string) => {
    return chainId.includes('namada') || chainId.includes('shielded-expedition');
  };

  // Fetch wallet balance
  const fetchWalletBalance = async (wallet: RewardsWallet) => {
    if (!wallet.publicAddress || !wallet.chainId) return;

    try {
      let result;
      
      if (isNamadaChain(wallet.chainId)) {
        // Use Namada balance API
        result = await adminApiClient.get(`/investors/getNamadaBalance/${wallet.publicAddress}`);
      } else {
        // Use Cosmos balance API
        result = await adminApiClient.get(`/investors/getCosmosBalance/${wallet.chainId}/${wallet.publicAddress}`);
      }

      console.log('Balance API result for', wallet.chainId, ':', result);

      if (result.success && result.data) {
        // Handle the actual backend response structure
        const balanceData = result.data.balance || result.data;
        
        if (balanceData && balanceData.amount && balanceData.denom) {
          // Convert from base units to display units
          const amount = parseFloat(balanceData.amount);
          const displayAmount = amount / 1000000; // Assuming 6 decimal places for most tokens
          
          return {
            amount: displayAmount.toString(),
            denom: balanceData.denom.replace('u', '').toUpperCase(), // Convert uakt to AKT
            formatted: `${displayAmount.toFixed(6)} ${balanceData.denom.replace('u', '').toUpperCase()}`
          };
        }
      }
      return null;
    } catch (error) {
      console.error(`Failed to fetch balance for ${wallet.chainId}:`, error);
      return null;
    }
  };

  // Fetch all wallet balances
  const fetchAllBalances = async () => {
    if (!wallets.length) return;

    const updatedWallets = await Promise.all(
      wallets.map(async (wallet) => {
        const updatedWallet = { ...wallet, balanceLoading: true };
        setWallets(prev => prev.map(w => w.chainId === wallet.chainId ? updatedWallet : w));
        
        const balance = await fetchWalletBalance(wallet);
        
        return {
          ...wallet,
          balance,
          balanceLoading: false
        };
      })
    );

    setWallets(updatedWallets);
  };

  // Refresh single wallet balance
  const refreshWalletBalance = async (chainId: string) => {
    const wallet = wallets.find(w => w.chainId === chainId);
    if (!wallet) return;

    // Set loading state for this specific wallet
    setWallets(prev => 
      prev.map(w => 
        w.chainId === chainId 
          ? { ...w, balanceLoading: true } 
          : w
      )
    );

    const balance = await fetchWalletBalance(wallet);
    
    // Update balance for this specific wallet
    setWallets(prev => 
      prev.map(w => 
        w.chainId === chainId 
          ? { ...w, balance, balanceLoading: false } 
          : w
      )
    );
  };

  // Initialize data
  useEffect(() => {
    fetchWallets();
    fetchAvailableChains();
  }, []);

  // Fetch balances when wallets are loaded (but only once)
  useEffect(() => {
    if (wallets.length > 0 && !loading && !wallets.some(w => w.balance || w.balanceLoading)) {
      fetchAllBalances();
    }
  }, [wallets.length, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        <span className={`ml-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Loading wallets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className={`text-center ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-lg font-medium mb-2">Error Loading Wallets</p>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchWallets();
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Rewards Wallets Management
          </h1>
          <p className={`text-lg ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Manage reward distribution wallets for blockchain networks
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              fetchWallets();
              if (wallets.length > 0) {
                fetchAllBalances();
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Refresh All
          </button>
          <button
            onClick={fetchAllBalances}
            disabled={wallets.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Refresh Balances
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={loadingChains || chainOptions.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create Wallet
          </button>
        </div>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border ${
            isDarkMode
              ? 'bg-red-900 border-red-700 text-red-300'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}
        >
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-sm underline"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Copy Toast Notification */}
      <AnimatePresence>
        {copyToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className={`fixed top-4 left-1/2 z-50 px-4 py-2 rounded-lg shadow-lg ${
              isDarkMode
                ? 'bg-gray-800 border border-gray-600 text-green-300'
                : 'bg-white border border-gray-200 text-green-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{copyToast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wallets Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={`rounded-lg border ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } overflow-hidden`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Chain
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Address
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Balance
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Created
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {!wallets || wallets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No rewards wallets found
                    </div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Create your first rewards wallet to get started
                    </p>
                  </td>
                </tr>
              ) : (
                wallets.map((wallet) => (
                  <tr key={wallet?.chainId || Math.random()}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg mr-3 ${
                          isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'
                        }`}>
                          <Wallet className={`w-4 h-4 ${
                            isDarkMode ? 'text-blue-400' : 'text-blue-600'
                          }`} />
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {wallet?.prettyName || 'Unknown Chain'}
                          </div>
                          <div className={`text-sm ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {wallet?.chainId || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <code className={`text-sm ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        } bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded`}>
                          {wallet.publicAddress 
                            ? `${wallet.publicAddress.slice(0, 12)}...${wallet.publicAddress.slice(-8)}`
                            : 'N/A'
                          }
                        </code>
                        <button
                          onClick={() => copyToClipboard(wallet.publicAddress || '')}
                          disabled={!wallet.publicAddress}
                          className={`ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                            isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                          } ${!wallet.publicAddress ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Copy address"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        wallet?.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {wallet?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        {wallet?.balanceLoading ? (
                          <div className="flex items-center">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Loading...</span>
                          </div>
                        ) : wallet?.balance ? (
                          <div>
                            <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {formatBalance(wallet.balance)}
                            </div>
                            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {wallet.balance.denom}
                            </div>
                          </div>
                        ) : (
                          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No balance
                          </span>
                        )}
                        <button
                          onClick={() => refreshWalletBalance(wallet?.chainId || '')}
                          disabled={wallet?.balanceLoading || !wallet?.chainId}
                          className={`ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                            isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                          } disabled:opacity-50`}
                          title="Refresh balance"
                        >
                          <RefreshCw className={`w-3 h-3 ${wallet?.balanceLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        {wallet?.createdAt ? formatDate(wallet.createdAt) : 'N/A'}
                      </div>
                      {wallet?.createdBy && (
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          by {wallet.createdBy}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewSecret(wallet?.chainId || '')}
                          disabled={loadingSecret || !wallet?.chainId}
                          className={`p-2 rounded-lg transition-colors ${
                            isDarkMode
                              ? 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-400'
                              : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
                          } disabled:opacity-50`}
                          title="View Secret"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => showDeleteConfirmation(wallet)}
                          disabled={!wallet}
                          className={`p-2 rounded-lg transition-colors ${
                            isDarkMode
                              ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400'
                              : 'bg-red-100 hover:bg-red-200 text-red-600'
                          } disabled:opacity-50`}
                          title="Delete Wallet"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Create Wallet Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className={`max-w-lg w-full rounded-lg shadow-2xl ${
                isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-300'
              } p-6`}
            >
              <h2 className={`text-xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Create Rewards Wallet
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    Select Chain *
                  </label>
                  
                  {loadingChains ? (
                    <div className={`flex items-center justify-center p-4 rounded-lg border ${
                      isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Loading available chains...
                      </span>
                    </div>
                  ) : (
                    <select
                      value={newWallet.chainId}
                      onChange={(e) => setNewWallet({ ...newWallet, chainId: e.target.value })}
                      disabled={creatingWallet}
                      className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                        creatingWallet ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="">
                        {chainOptions.length === 0 ? 'No chains available' : 'Select a chain...'}
                      </option>
                      {chainOptions.map((option) => (
                        <option key={option.chainId} value={option.chainId}>
                          {option.prettyName} ({option.chainId})
                          {option.isNamada ? ' - Namada' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  {chainOptions.length > 0 && (
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Only showing chains where validators are configured ({chainOptions.length} available)
                    </p>
                  )}
                </div>

                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-start">
                    <AlertTriangle className={`flex-shrink-0 w-5 h-5 mr-3 mt-0.5 ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-500'
                    }`} />
                    <div>
                      <h4 className={`text-sm font-medium ${
                        isDarkMode ? 'text-blue-300' : 'text-blue-700'
                      }`}>
                        Important Notes
                      </h4>
                      <ul className={`text-xs mt-1 space-y-1 ${
                        isDarkMode ? 'text-blue-200' : 'text-blue-600'
                      }`}>
                        <li>• A new wallet will be created for the selected chain</li>
                        <li>• The wallet will be used for validator rewards distribution</li>
                        <li>• Only chains with active validators can be selected</li>
                        <li>• Wallet addresses and private keys will be securely stored</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewWallet({ chainId: '' });
                  }}
                  disabled={creatingWallet}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    creatingWallet
                      ? 'opacity-50 cursor-not-allowed'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateWallet}
                  disabled={!newWallet.chainId || creatingWallet || loadingChains}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${
                    !newWallet.chainId || creatingWallet || loadingChains
                      ? 'opacity-50 cursor-not-allowed bg-gray-400'
                      : isDarkMode
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {creatingWallet && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {creatingWallet ? 'Creating...' : 'Create Wallet'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && walletToDelete && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className={`max-w-md w-full rounded-lg shadow-2xl ${
                isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-300'
              } p-6`}
            >
              <div className="flex items-center mb-4">
                <AlertTriangle className={`w-6 h-6 mr-3 ${
                  isDarkMode ? 'text-red-400' : 'text-red-500'
                }`} />
                <h2 className={`text-xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Delete Wallet
                </h2>
              </div>

              <div className="mb-6">
                <p className={`text-sm mb-4 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Are you sure you want to delete the rewards wallet for <strong>{walletToDelete.prettyName}</strong>?
                </p>
                <div className={`p-3 rounded-lg ${
                  isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                    <strong>Warning:</strong> This action cannot be undone. The wallet and its private key will be permanently removed from the system.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setWalletToDelete(null);
                  }}
                  disabled={deletingWallet}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    deletingWallet
                      ? 'opacity-50 cursor-not-allowed'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteWallet}
                  disabled={deletingWallet}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center ${
                    deletingWallet
                      ? 'opacity-50 cursor-not-allowed bg-red-400'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {deletingWallet && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {deletingWallet ? 'Deleting...' : 'Delete Wallet'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Secret Modal */}
      <AnimatePresence>
        {showSecretModal && walletSecret && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl ${
                isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-300'
              } p-6`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Eye className={`w-6 h-6 mr-3 ${
                    isDarkMode ? 'text-yellow-400' : 'text-yellow-500'
                  }`} />
                  <h2 className={`text-xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Wallet Secret Phrase
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowSecretModal(false);
                    setWalletSecret(null);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Security Warning */}
              <div className={`mb-6 p-4 rounded-lg ${
                isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start">
                  <AlertTriangle className={`flex-shrink-0 w-5 h-5 mr-3 mt-0.5 ${
                    isDarkMode ? 'text-red-400' : 'text-red-500'
                  }`} />
                  <div>
                    <h4 className={`text-sm font-medium ${
                      isDarkMode ? 'text-red-300' : 'text-red-700'
                    }`}>
                      Security Warning
                    </h4>
                    <div className={`text-sm mt-1 ${
                      isDarkMode ? 'text-red-200' : 'text-red-600'
                    }`}>
                      {walletSecret.warning || 'Keep this secret phrase secure. Anyone with access to it can control the wallet.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Chain ID
                  </label>
                  <code className={`block w-full p-3 rounded-lg text-sm ${
                    isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {walletSecret.chainId}
                  </code>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Public Address
                  </label>
                  <div className="flex items-center">
                    <code className={`flex-1 p-3 rounded-lg text-sm ${
                      isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {walletSecret.publicAddress}
                    </code>
                    <button
                      onClick={() => copyToClipboard(walletSecret.publicAddress)}
                      className={`ml-2 p-2 rounded-lg transition-colors ${
                        isDarkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                      }`}
                      title="Copy address"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Secret Phrase (Mnemonic)
                  </label>
                  <div className="flex items-center">
                    <code className={`flex-1 p-3 rounded-lg text-sm break-all ${
                      isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {walletSecret.secretPhrase}
                    </code>
                    <button
                      onClick={() => copyToClipboard(walletSecret.secretPhrase)}
                      className={`ml-2 p-2 rounded-lg transition-colors ${
                        isDarkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                      }`}
                      title="Copy secret phrase"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowSecretModal(false);
                    setWalletSecret(null);
                  }}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RewardsWalletsManagement;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { Copy, CheckCircle, Users, UserCheck, UserX, Search, Filter, RefreshCw, Eye, X, DollarSign, Wallet, Calendar } from 'lucide-react';
import adminApiClient from '../../utils/adminApiClient';

interface Investor {
  _id: string;
  KeplrPublicAddress: string;
  namadaWalletAddress: string | null;
  linkedWallets: Array<{
    _id: string;
    chainId: string;
    chainName: string;
    address: string;
    bech32Prefix: string;
    createdAt: string;
  }>;
  referredBy: string | null;
  referralBonuses: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ReferralBonusData {
  chainId: string;
  chainName?: string;
  symbol?: string;
  denom: string;
  rewardEarned: number;
  reward: number;
  priceUSD?: number;
  rewardEarnedUSD?: number;
  rewardUSD?: number;
}

interface Transaction {
  _id: string;
  hash: string;
  height: number;
  type: string;
  amount: string;
  denom: string;
  fee: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
  userAddress?: string;
  chainId?: string;
}

interface PriceData {
  [key: string]: {
    usd: number;
    usd_market_cap: number;
    usd_24h_vol?: number;
    usd_24h_change: number;
  };
}

const InvestorManagement: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalInvestors, setTotalInvestors] = useState(0);
  const [activeInvestors, setActiveInvestors] = useState(0);
  const [blockedInvestors, setBlockedInvestors] = useState(0);
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [investorDetailData, setInvestorDetailData] = useState<{
    referralBonuses: ReferralBonusData[];
    transactions: Transaction[];
    totalBonusEarnedUSD: number;
    totalClaimableUSD: number;
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [priceData, setPriceData] = useState<PriceData>({});

  // Fetch investor stats (totals)
  const fetchInvestorStats = async () => {
    try {
      // First try the dedicated stats endpoint
      const result = await adminApiClient.get<{
        totalInvestors: number;
        activeInvestors: number;
        blockedInvestors: number;
      }>('/admin/investors/stats');
      
      if (result.success && result.data) {
        setTotalInvestors(result.data.totalInvestors);
        setActiveInvestors(result.data.activeInvestors);
        setBlockedInvestors(result.data.blockedInvestors);
        return;
      }
    } catch (err) {
      console.log('Stats endpoint not available, calculating from all data...');
    }
    
    try {
      // Fallback: Fetch all investors without pagination to calculate stats
      const result = await adminApiClient.get<{
        investors: Investor[];
        totalCount: number;
      }>('/admin/investors?limit=1000'); // Get a large number to ensure we get all
      
      if (result.success && result.data) {
        const allInvestors = result.data.investors;
        setTotalInvestors(allInvestors.length);
        setActiveInvestors(allInvestors.filter(inv => inv.isActive).length);
        setBlockedInvestors(allInvestors.filter(inv => !inv.isActive).length);
      }
    } catch (err) {
      console.error('Error fetching investor stats:', err);
      // Last resort: use current page data (not accurate but better than nothing)
      setTotalInvestors(investors.length);
      setActiveInvestors(investors.filter(inv => inv.isActive).length);
      setBlockedInvestors(investors.filter(inv => !inv.isActive).length);
    }
  };

  // Fetch investors from API
  const fetchInvestors = async (page: number = 1, search: string = '', status: string = 'all') => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      if (status !== 'all') {
        params.append('status', status);
      }

      const result = await adminApiClient.get<{
        investors: Investor[];
        totalCount: number;
        totalPages: number;
        currentPage: number;
      }>(`/admin/investors?${params}`);
      
      if (result.success && result.data) {
        setInvestors(result.data.investors);
        setTotalCount(result.data.totalCount);
        setTotalPages(result.data.totalPages);
        setCurrentPage(result.data.currentPage);
      } else {
        throw new Error(result.message || 'Failed to fetch investors');
      }
    } catch (err) {
      console.error('Error fetching investors:', err);
      setError(err instanceof Error ? err.message : 'Failed to load investors');
    } finally {
      setLoading(false);
    }
  };

  // Toggle investor status (block/unblock)
  const toggleInvestorStatus = async (keplrPublicAddress: string, currentStatus: boolean) => {
    try {
      setTogglingStatus(keplrPublicAddress);
      
      const result = await adminApiClient.patch(`/admin/investors/${keplrPublicAddress}/toggle-status`);
      
      if (result.success) {
        // Update the local state
        setInvestors(prevInvestors =>
          prevInvestors.map(investor =>
            investor.KeplrPublicAddress === keplrPublicAddress
              ? { ...investor, isActive: !currentStatus }
              : investor
          )
        );
        
        // Show success toast
        setCopyToast(`Investor ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        setTimeout(() => setCopyToast(null), 3000);
        
        // Refresh stats
        fetchInvestorStats();
      } else {
        throw new Error(result.message || 'Failed to toggle investor status');
      }
    } catch (err) {
      console.error('Error toggling investor status:', err);
      setCopyToast(`Failed to ${!currentStatus ? 'activate' : 'deactivate'} investor`);
      setTimeout(() => setCopyToast(null), 3000);
    } finally {
      setTogglingStatus(null);
    }
  };

  // Calculate total referral bonus USD for an investor
  const calculateTotalReferralBonusUSD = (investor: Investor) => {
    if (!investor.referralBonuses || investor.referralBonuses.length === 0) {
      return 0;
    }

    return investor.referralBonuses.reduce((totalUSD, bonus) => {
      const chainInfo = getChainInfo(bonus.denom || '');
      const priceUSD = chainInfo.coinGeckoId && priceData[chainInfo.coinGeckoId] 
        ? priceData[chainInfo.coinGeckoId].usd 
        : 0;
      
      const divisor = Math.pow(10, chainInfo.exponent);
      const rewardEarned = (bonus.rewardEarned || 0) / divisor;
      const rewardEarnedUSD = rewardEarned * priceUSD;
      
      return totalUSD + rewardEarnedUSD;
    }, 0);
  };

  // Calculate total claimable referral rewards USD for an investor
  const calculateTotalClaimableReferralRewardsUSD = (investor: Investor) => {
    if (!investor.referralBonuses || investor.referralBonuses.length === 0) {
      return 0;
    }

    return investor.referralBonuses.reduce((totalUSD, bonus) => {
      const chainInfo = getChainInfo(bonus.denom || '');
      const priceUSD = chainInfo.coinGeckoId && priceData[chainInfo.coinGeckoId] 
        ? priceData[chainInfo.coinGeckoId].usd 
        : 0;
      
      const divisor = Math.pow(10, chainInfo.exponent);
      const claimableAmount = (bonus.reward || 0) / divisor;
      const claimableAmountUSD = claimableAmount * priceUSD;
      
      return totalUSD + claimableAmountUSD;
    }, 0);
  };

  // Fetch pricing data from backend API
  const fetchPricingData = async () => {
    try {
      console.log('Fetching pricing data...');
      const response = await fetch('http://localhost:3000/api/investors/prices');
      
      if (response.ok) {
        const result = await response.json();
        console.log('Pricing API response:', result);
        
        const assets = result.data?.prices?.assets;
        console.log('Assets from pricing API:', assets);
        
        if (result.success && assets) {
          const transformedPrices: PriceData = {};
          
          const allAssets = [
            ...(assets.validators || []),
            ...(assets.halalScreener || [])
          ];
          
          console.log('All assets combined:', allAssets);
          
          allAssets.forEach((asset: any) => {
            console.log('Processing pricing asset:', asset);
            if (asset.coinGeckoId && asset.price) {
              transformedPrices[asset.coinGeckoId] = {
                usd: asset.price.usd,
                usd_market_cap: asset.price.usd_market_cap,
                usd_24h_change: asset.price.usd_24h_change,
              };
              console.log(`Added price for ${asset.coinGeckoId}: $${asset.price.usd}`);
            }
          });
          
          console.log('Final transformed prices:', transformedPrices);
          setPriceData(transformedPrices);
          return transformedPrices;
        }
      } else {
        console.error('Pricing API response not ok:', response.status);
      }
    } catch (error) {
      console.error('Error fetching pricing data:', error);
    }
    return {};
  };

  // Get chain info from denom
  const getChainInfo = (denom: string) => {
    const denomMap: { [key: string]: { chainName: string; symbol: string; coinGeckoId?: string; exponent: number } } = {
      'uakt': { chainName: 'Akash', symbol: 'AKT', coinGeckoId: 'akash-network', exponent: 6 },
      ' uakt': { chainName: 'Akash', symbol: 'AKT', coinGeckoId: 'akash-network', exponent: 6 },
      'uatom': { chainName: 'Cosmos Hub', symbol: 'ATOM', coinGeckoId: 'cosmos', exponent: 6 },
      'uosmo': { chainName: 'Osmosis', symbol: 'OSMO', coinGeckoId: 'osmosis', exponent: 6 },
      'afet': { chainName: 'Fetch.ai', symbol: 'FET', coinGeckoId: 'fetch-ai', exponent: 18 },
      'nam': { chainName: 'Namada', symbol: 'NAM', coinGeckoId: 'namada', exponent: 6 },
      'uxprt': { chainName: 'Persistence', symbol: 'XPRT', coinGeckoId: 'persistence', exponent: 6 },
      'udvpn': { chainName: 'Sentinel', symbol: 'DVPN', coinGeckoId: 'sentinel', exponent: 6 },
    };
    
    const cleanDenom = denom.trim();
    
    return denomMap[cleanDenom] || denomMap[denom] || { 
      chainName: cleanDenom || 'Unknown', 
      symbol: (cleanDenom || 'UNKNOWN').toUpperCase(),
      coinGeckoId: undefined,
      exponent: 6
    };
  };

  // Fetch detailed investor data for modal
  const fetchInvestorDetails = async (keplrPublicAddress: string) => {
    try {
      setLoadingDetails(true);
      
      console.log('Fetching investor details for:', keplrPublicAddress);
      
      // Fetch pricing data and investor data concurrently
      const [pricesData, investorResponse, transactionsResponse] = await Promise.all([
        fetchPricingData(),
        fetch(`http://localhost:3000/api/investors/${keplrPublicAddress}`),
        fetch(`http://localhost:3000/api/transactions/investor/${keplrPublicAddress}?limit=4`).catch(() => null)
      ]);
      
      console.log('Pricing data received:', pricesData);
      
      if (!investorResponse.ok) {
        throw new Error(`Failed to fetch investor data: ${investorResponse.status}`);
      }
      
      const investorResult = await investorResponse.json();
      console.log('Full investor result:', investorResult);
      
      if (investorResult.success && investorResult.data) {
        const investorData = investorResult.data.investor;
        console.log('Investor data:', investorData);
        console.log('Raw referral bonuses:', investorData.referralBonuses);
        
        // Transform referral bonuses with pricing data
        const referralBonuses: ReferralBonusData[] = investorData.referralBonuses?.map((bonus: any) => {
          console.log('Processing bonus:', bonus);
          const chainInfo = getChainInfo(bonus.denom);
          console.log('Chain info for', bonus.denom, ':', chainInfo);
          
          const priceUSD = chainInfo.coinGeckoId && pricesData[chainInfo.coinGeckoId] 
            ? pricesData[chainInfo.coinGeckoId].usd 
            : 0;
          
          console.log(`Price lookup: coinGeckoId=${chainInfo.coinGeckoId}, priceUSD=${priceUSD}`);
          console.log('Available prices:', Object.keys(pricesData));
          
          const divisor = Math.pow(10, chainInfo.exponent);
          const rewardEarned = bonus.rewardEarned / divisor;
          const reward = bonus.reward / divisor;
          
          const rewardEarnedUSD = rewardEarned * priceUSD;
          const rewardUSD = reward * priceUSD;
          
          console.log(`Final bonus calculation:`, {
            originalReward: bonus.reward,
            originalRewardEarned: bonus.rewardEarned,
            divisor,
            convertedReward: reward,
            convertedRewardEarned: rewardEarned,
            priceUSD,
            rewardUSD,
            rewardEarnedUSD
          });
          
          return {
            ...bonus,
            chainName: chainInfo.chainName,
            symbol: chainInfo.symbol,
            rewardEarned,
            reward,
            priceUSD,
            rewardEarnedUSD,
            rewardUSD,
          };
        }) || [];
        
        console.log('Transformed referral bonuses:', referralBonuses);
        
        // Calculate totals
        const totalBonusEarnedUSD = referralBonuses.reduce((sum, bonus) => sum + (bonus.rewardEarnedUSD || 0), 0);
        const totalClaimableUSD = referralBonuses.reduce((sum, bonus) => sum + (bonus.rewardUSD || 0), 0);
        
        console.log('Calculated totals:', { totalBonusEarnedUSD, totalClaimableUSD });
        
        // Get transactions data
        let transactions: Transaction[] = [];
        if (transactionsResponse && transactionsResponse.ok) {
          const transactionsResult = await transactionsResponse.json();
          console.log('Raw transactions response:', transactionsResult);
          
          if (transactionsResult.success && transactionsResult.data) {
            const apiTransactions = transactionsResult.data.transactions || transactionsResult.data || [];
            console.log('Raw transactions from API:', apiTransactions);
            
            // Map the API transaction structure to our Transaction interface
            transactions = apiTransactions.map((tx: any) => ({
              _id: tx._id,
              hash: tx.txHash || tx.hash,
              height: tx.height || 0,
              type: tx.type,
              amount: tx.amount?.toString() || '0',
              denom: tx.tokenDenom || tx.denom || '',
              fee: tx.fee?.toString() || '0',
              status: tx.status,
              timestamp: tx.createdAt || tx.timestamp,
              userAddress: tx.userPublicAddress || tx.userAddress,
              chainId: tx.chainId,
            }));
            
            console.log('Transformed transactions:', transactions);
          }
        }
        
        const finalData = {
          referralBonuses,
          transactions,
          totalBonusEarnedUSD,
          totalClaimableUSD
        };
        
        console.log('Setting final investor detail data:', finalData);
        setInvestorDetailData(finalData);
      }
    } catch (error) {
      console.error('Error fetching investor details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open investor details modal
  const openDetailsModal = (investor: Investor) => {
    setSelectedInvestor(investor);
    setShowDetailsModal(true);
    setInvestorDetailData(null); // Reset previous data
    fetchInvestorDetails(investor.KeplrPublicAddress);
  };

  // Close investor details modal
  const closeDetailsModal = () => {
    setSelectedInvestor(null);
    setShowDetailsModal(false);
    setInvestorDetailData(null);
  };
  const copyToClipboard = async (text: string, type: string = 'text') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast(`${type} copied to clipboard!`);
      setTimeout(() => setCopyToast(null), 3000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopyToast('Failed to copy to clipboard');
      setTimeout(() => setCopyToast(null), 3000);
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

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchInvestors(1, searchTerm, statusFilter);
  };

  // Handle filter change
  const handleFilterChange = (newStatus: 'all' | 'active' | 'inactive') => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
    fetchInvestors(1, searchTerm, newStatus);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchInvestors(page, searchTerm, statusFilter);
  };

  useEffect(() => {
    fetchInvestors();
    fetchInvestorStats();
    fetchPricingData(); // Fetch pricing data on component mount
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
          Investor Management
        </h1>
        <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Manage platform investors and their account status
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
                Total Investors
              </p>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {totalInvestors}
              </p>
            </div>
            <Users className={`h-8 w-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
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
                Active Investors
              </p>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {activeInvestors}
              </p>
            </div>
            <UserCheck className={`h-8 w-8 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`} />
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
                Blocked Investors
              </p>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {blockedInvestors}
              </p>
            </div>
            <UserX className={`h-8 w-8 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
          </div>
        </motion.div>
      </div>

      {/* Search and Filters */}
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="Search by address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 pr-4 py-2 w-full rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
          </form>

          {/* Filters and Refresh */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange(e.target.value as 'all' | 'active' | 'inactive')}
                className={`px-3 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Blocked Only</option>
              </select>
            </div>
            
            <button
              onClick={() => fetchInvestors(currentPage, searchTerm, statusFilter)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } disabled:opacity-50`}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Investors Table */}
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
          <div className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className={`ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading investors...
              </span>
            </div>
          </div>
        ) : error ? (
          <div className="p-8">
            <div className="text-center">
              <div className={`text-red-600 mb-2`}>Error loading investors</div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {error}
              </p>
            </div>
          </div>
        ) : investors.length === 0 ? (
          <div className="p-8">
            <div className="text-center">
              <Users className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No investors found
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Public Address
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Namada Address
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Linked Wallets
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Total Claimable Bonus
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Total Earned Bonus
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Status
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Joined
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                  {investors.map((investor) => (
                    <tr key={investor._id} className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`font-mono text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {investor.KeplrPublicAddress.slice(0, 16)}...
                          </span>
                          <button
                            onClick={() => copyToClipboard(investor.KeplrPublicAddress, 'Public address')}
                            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                              isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {investor.namadaWalletAddress ? (
                          <div className="flex items-center space-x-2">
                            <span className={`font-mono text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {investor.namadaWalletAddress.slice(0, 16)}...
                            </span>
                            <button
                              onClick={() => copyToClipboard(investor.namadaWalletAddress!, 'Namada address')}
                              className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                                isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Not linked
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {investor.linkedWallets.length} wallets
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <DollarSign className={`h-4 w-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {calculateTotalClaimableReferralRewardsUSD(investor).toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <DollarSign className={`h-4 w-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {calculateTotalReferralBonusUSD(investor).toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          investor.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {investor.isActive ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {formatDate(investor.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleInvestorStatus(investor.KeplrPublicAddress, investor.isActive)}
                            disabled={togglingStatus === investor.KeplrPublicAddress}
                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                              investor.isActive
                                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {togglingStatus === investor.KeplrPublicAddress ? (
                              <div className="flex items-center space-x-1">
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                                <span>Loading...</span>
                              </div>
                            ) : (
                              investor.isActive ? 'Block' : 'Unblock'
                            )}
                          </button>
                          <button
                            onClick={() => openDetailsModal(investor)}
                            className={`p-1 rounded transition-colors ${
                              isDarkMode 
                                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`px-6 py-3 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalCount)} of {totalCount} investors
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || loading}
                      className={`px-3 py-1 text-sm rounded ${
                        currentPage <= 1
                          ? 'cursor-not-allowed opacity-50'
                          : isDarkMode
                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const pageNumber = i + 1;
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          disabled={loading}
                          className={`px-3 py-1 text-sm rounded ${
                            currentPage === pageNumber
                              ? 'bg-blue-500 text-white'
                              : isDarkMode
                                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages || loading}
                      className={`px-3 py-1 text-sm rounded ${
                        currentPage >= totalPages
                          ? 'cursor-not-allowed opacity-50'
                          : isDarkMode
                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
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

      {/* Investor Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedInvestor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={closeDetailsModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Investor Details
                  </h2>
                  <button
                    onClick={closeDetailsModal}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode 
                        ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`p-4 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Basic Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Public Address
                        </label>
                        <div className="flex items-start space-x-2 mt-1">
                          <div className={`font-mono text-sm p-3 rounded border flex-1 break-all ${
                            isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                          }`}>
                            {selectedInvestor.KeplrPublicAddress}
                          </div>
                          <button
                            onClick={() => copyToClipboard(selectedInvestor.KeplrPublicAddress, 'Public address')}
                            className={`p-3 rounded transition-colors flex-shrink-0 ${
                              isDarkMode 
                                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600 border border-gray-600' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }`}
                            title="Copy address"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Namada Address
                        </label>
                        <div className="flex items-start space-x-2 mt-1">
                          {selectedInvestor.namadaWalletAddress ? (
                            <>
                              <div className={`font-mono text-sm p-3 rounded border flex-1 break-all ${
                                isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                              }`}>
                                {selectedInvestor.namadaWalletAddress}
                              </div>
                              <button
                                onClick={() => copyToClipboard(selectedInvestor.namadaWalletAddress!, 'Namada address')}
                                className={`p-3 rounded transition-colors flex-shrink-0 ${
                                  isDarkMode 
                                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600 border border-gray-600' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200 border border-gray-300'
                                }`}
                                title="Copy address"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <span className={`text-sm p-3 rounded border flex-1 ${
                              isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-white border-gray-300 text-gray-500'
                            }`}>
                              Not linked
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Status
                        </label>
                        <div className="mt-1">
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                            selectedInvestor.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedInvestor.isActive ? 'Active' : 'Blocked'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Joined Date
                        </label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatDate(selectedInvestor.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Referral Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Referred By
                        </label>
                        <div className="mt-1">
                          {selectedInvestor.referredBy ? (
                            <div className="flex items-start space-x-2">
                              <div className={`font-mono text-sm p-3 rounded border flex-1 break-all ${
                                isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                              }`}>
                                {selectedInvestor.referredBy}
                              </div>
                              <button
                                onClick={() => copyToClipboard(selectedInvestor.referredBy!, 'Referrer address')}
                                className={`p-3 rounded transition-colors flex-shrink-0 ${
                                  isDarkMode 
                                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600 border border-gray-600' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200 border border-gray-300'
                                }`}
                                title="Copy address"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Direct signup
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Total Referral Bonus Earned
                        </label>
                        <div className="flex items-center space-x-2 mt-1">
                          <DollarSign className={`h-5 w-5 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`} />
                          <span className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {loadingDetails ? (
                              <div className="w-16 h-6 bg-gray-400 animate-pulse rounded"></div>
                            ) : (
                              `${investorDetailData?.totalBonusEarnedUSD.toFixed(2) || '0.00'}`
                            )}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Total Claimable Bonus
                        </label>
                        <div className="flex items-center space-x-2 mt-1">
                          <DollarSign className={`h-5 w-5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                          <span className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {loadingDetails ? (
                              <div className="w-16 h-6 bg-gray-400 animate-pulse rounded"></div>
                            ) : (
                              `${investorDetailData?.totalClaimableUSD.toFixed(2) || '0.00'}`
                            )}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Referral Bonuses Count
                        </label>
                        <div className="mt-1">
                          <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {loadingDetails ? (
                              <div className="w-16 h-4 bg-gray-400 animate-pulse rounded inline-block"></div>
                            ) : (
                              `${investorDetailData?.referralBonuses?.length || 0} bonuses earned`
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linked Wallets */}
                <div className={`p-4 rounded-lg border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <h3 className={`text-lg font-medium mb-3 flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <Wallet className="h-5 w-5" />
                    <span>Linked Wallets ({selectedInvestor.linkedWallets.length})</span>
                  </h3>
                  
                  {selectedInvestor.linkedWallets.length === 0 ? (
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No wallets linked
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedInvestor.linkedWallets.map((wallet) => (
                        <div key={wallet._id} className={`p-3 rounded-lg border ${
                          isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {wallet.chainName}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded ${
                                  isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {wallet.chainId}
                                </span>
                              </div>
                              <div className="flex items-start space-x-2">
                                <div className={`font-mono text-sm flex-1 break-all ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {wallet.address}
                                </div>
                                <button
                                  onClick={() => copyToClipboard(wallet.address, `${wallet.chainName} address`)}
                                  className={`p-1 rounded transition-colors flex-shrink-0 ${
                                    isDarkMode 
                                      ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                  }`}
                                  title="Copy address"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <Calendar className={`h-3 w-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                  Linked: {formatDate(wallet.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chain Bonuses */}
                {investorDetailData && investorDetailData.referralBonuses.length > 0 && (
                  <div className={`p-4 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <h3 className={`text-lg font-medium mb-3 flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      <DollarSign className="h-5 w-5" />
                      <span>Chain Bonuses</span>
                    </h3>
                    
                    {loadingDetails ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className={`p-3 rounded-lg animate-pulse ${
                            isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                          }`}>
                            <div className="flex justify-between items-center">
                              <div className="space-y-2">
                                <div className="h-4 bg-gray-400 rounded w-24"></div>
                                <div className="h-3 bg-gray-400 rounded w-32"></div>
                                <div className="h-3 bg-gray-400 rounded w-16"></div>
                              </div>
                              <div className="text-right space-y-2">
                                <div className="h-4 bg-gray-400 rounded w-20"></div>
                                <div className="h-3 bg-gray-400 rounded w-16"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {investorDetailData.referralBonuses.map((bonus, index) => (
                          <div key={index} className={`p-3 rounded-lg border ${
                            isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                          }`}>
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {bonus.chainName || 'Unknown Chain'}
                                  </span>
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                                  }`}>
                                    {bonus.symbol || 'N/A'}
                                  </span>
                                </div>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  Total Earned: {bonus.rewardEarned.toFixed(6)} {bonus.symbol}
                                </p>
                                {bonus.rewardEarnedUSD !== undefined && (
                                  <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                    ${bonus.rewardEarnedUSD.toFixed(2)}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {bonus.reward.toFixed(6)} {bonus.symbol}
                                </div>
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  Claimable
                                </div>
                                {bonus.rewardUSD !== undefined && (
                                  <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                    ${bonus.rewardUSD.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Recent Transactions */}
                {investorDetailData && (
                  <div className={`p-4 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <h3 className={`text-lg font-medium mb-3 flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Calendar className="h-5 w-5" />
                      <span>Recent Transactions</span>
                    </h3>
                    
                    {loadingDetails ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className={`p-3 rounded-lg animate-pulse ${
                            isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                          }`}>
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-400 rounded w-48"></div>
                              <div className="h-3 bg-gray-400 rounded w-32"></div>
                              <div className="h-3 bg-gray-400 rounded w-24"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : investorDetailData.transactions.length > 0 ? (
                      <div className="space-y-3">
                        {investorDetailData.transactions.slice(0, 4).map((tx) => (
                          <div key={tx._id} className={`p-4 rounded-lg border ${
                            isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className={`px-2 py-1 text-xs rounded font-medium ${
                                    tx.status === 'success' 
                                      ? 'bg-green-100 text-green-800' 
                                      : tx.status === 'failed'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {tx.status?.toUpperCase() || 'UNKNOWN'}
                                  </span>
                                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {tx.type || 'Unknown Transaction'}
                                  </span>
                                </div>
                                
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Hash:
                                  </span>
                                  <span className={`text-xs font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {tx.hash ? `${tx.hash.slice(0, 16)}...${tx.hash.slice(-8)}` : 'N/A'}
                                  </span>
                                  {tx.hash && (
                                    <button
                                      onClick={() => copyToClipboard(tx.hash, 'Transaction hash')}
                                      className={`p-1 rounded transition-colors ${
                                        isDarkMode 
                                          ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                      }`}
                                      title="Copy hash"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-4">
                                  {tx.height && (
                                    <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                      Block: {tx.height}
                                    </span>
                                  )}
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {tx.timestamp ? formatDate(tx.timestamp) : 'N/A'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="text-right ml-4">
                                <div className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {tx.amount && tx.denom ? 
                                    `${parseFloat(tx.amount).toFixed(6)} ${tx.denom.replace('u', '').toUpperCase()}` :
                                    'N/A'
                                  }
                                </div>
                                {tx.fee && (
                                  <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Fee: {parseFloat(tx.fee).toFixed(6)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          No recent transactions found
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {copyToast && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-20 right-6 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50"
          >
            <CheckCircle className="h-4 w-4" />
            <span>{copyToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InvestorManagement;

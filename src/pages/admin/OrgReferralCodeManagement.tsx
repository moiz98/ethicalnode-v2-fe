import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Copy, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  X, 
  Calendar, 
  Users, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Building2,
  Gift,
  Hash,
  BarChart3,
  DollarSign
} from 'lucide-react';
import adminApiClient from '../../utils/adminApiClient';
import { chains as cosmosChains, assetLists } from 'chain-registry';

interface ChainBonus {
  chainId: string;
  chainName: string;
  bonusPercentage: number;
  denom: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UsageStats {
  totalUses: number;
  lastUsedAt: string | null;
  lastUsedBy: string | null;
}

interface ValidatorRecord {
  _id: string;
  chainId: string;
  chainName: string;
  prettyName: string;
  validatorAddress: string;
  defaultReferralReward: number;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface EnabledChain {
  chainId: string;
  chainName: string;
  prettyName: string;
  denom: string;
  decimals?: number;
  isEnabled: boolean;
}

interface ReferralBonus {
  chainId: string;
  rewardEarned: number;
  reward: number;
  denom: string;
  _id: string;
  createdAt: string;
  updatedAt: string;
}

interface OrgReferralCode {
  _id: string;
  referralCode: string;
  organizationName: string;
  description?: string;
  chainBonuses: ChainBonus[];
  referralBonuses: ReferralBonus[];
  usageStats: UsageStats;
  isActive: boolean;
  expiresAt?: string;
  maxUses?: number;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface FormData {
  referralCode: string;
  organizationName: string;
  description: string;
  chainBonuses: {
    chainId: string;
    bonusPercentage: number;
    denom: string;
    isActive: boolean;
  }[];
  expiresAt: string;
  maxUses: string;
}

interface RewardsUpdateFormData {
  chainId: string;
  rewardsAmount: number;
  denom: string;
}

const OrgReferralCodeManagement: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [referralCodes, setReferralCodes] = useState<OrgReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Chain and validator data
  const [enabledChains, setEnabledChains] = useState<EnabledChain[]>([]);
  const [loadingChains, setLoadingChains] = useState(false);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateRewardsModal, setShowUpdateRewardsModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState<OrgReferralCode | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    referralCode: '',
    organizationName: '',
    description: '',
    chainBonuses: [],
    expiresAt: '',
    maxUses: ''
  });
  
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Rewards update form state
  const [rewardsFormData, setRewardsFormData] = useState<RewardsUpdateFormData>({
    chainId: '',
    rewardsAmount: 0,
    denom: ''
  });
  const [rewardsLoading, setRewardsLoading] = useState(false);

  // Fetch enabled chains from validators
  const fetchEnabledChains = async () => {
    try {
      setLoadingChains(true);
      
      // Fetch all validators to get enabled chains
      const result = await adminApiClient.get('/admin/validators?limit=1000&active=true');
      
      if (result.success && result.data?.validators) {
        const validators = result.data.validators as ValidatorRecord[];
        
        // Get unique enabled chains
        const uniqueChains = new Map<string, EnabledChain>();
        
        validators.forEach((validator) => {
          if (validator.isActive && !uniqueChains.has(validator.chainId)) {
            // Find chain info from chain-registry using chainId
            const chainInfo = cosmosChains.find(chain => chain.chainId === validator.chainId);
            
            // Find asset info from assetLists using chainName (similar to Networks component)
            const assetList = assetLists.find(asset => asset.chainName === validator.chainName);
            
            // Get the base denomination from asset list - use the first (native) asset
            let denom = 'unknown';
            let decimals = 6;
            
            if (assetList?.assets && assetList.assets.length > 0) {
              const nativeAsset = assetList.assets[0]; // First asset is typically the native token
              denom = nativeAsset.base;
              
              // Find the display denomination unit to get decimals
              const displayUnit = nativeAsset.denomUnits?.find(unit => unit.denom === nativeAsset.display);
              decimals = displayUnit?.exponent || 6;
            }
            
            uniqueChains.set(validator.chainId, {
              chainId: validator.chainId,
              chainName: validator.chainName,
              prettyName: validator.prettyName || chainInfo?.prettyName || validator.chainName,
              denom: denom,
              decimals: decimals,
              isEnabled: true
            });
          }
        });
        
        setEnabledChains(Array.from(uniqueChains.values()));
      }
    } catch (error) {
      console.error('Error fetching enabled chains:', error);
      // Fallback to some default chains if API fails
      setEnabledChains([
        { chainId: 'cosmoshub-4', chainName: 'Cosmos Hub', prettyName: 'Cosmos Hub', denom: 'uatom', decimals: 6, isEnabled: true },
        { chainId: 'osmosis-1', chainName: 'Osmosis', prettyName: 'Osmosis', denom: 'uosmo', decimals: 6, isEnabled: true }
      ]);
    } finally {
      setLoadingChains(false);
    }
  };

  // Fetch referral codes
  const fetchReferralCodes = async (page: number = 1, search: string = '', status: string = 'all') => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      if (status !== 'all') {
        params.append('active', status === 'active' ? 'true' : 'false');
      }

      const result = await adminApiClient.get<{
        referralCodes: OrgReferralCode[];
        pagination: Pagination;
      }>(`/admin/org-referral-codes?${params}`);
      
      if (result.success && result.data) {
        setReferralCodes(result.data.referralCodes);
        setPagination(result.data.pagination);
      } else {
        throw new Error(result.message || 'Failed to fetch referral codes');
      }
    } catch (err) {
      console.error('Error fetching referral codes:', err);
      showToast('❌ Failed to load referral codes', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Create new referral code
  const createReferralCode = async () => {
    try {
      setErrors({});
      
      const payload = {
        referralCode: formData.referralCode.trim().toUpperCase(),
        organizationName: formData.organizationName.trim(),
        description: formData.description.trim() || undefined,
        chainBonuses: formData.chainBonuses.length > 0 ? formData.chainBonuses : undefined,
        expiresAt: formData.expiresAt || undefined,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined
      };

      const result = await adminApiClient.post('/admin/org-referral-codes', payload);
      
      if (result.success) {
        showToast('✅ Referral code created successfully!', 'success');
        setShowAddModal(false);
        resetForm();
        fetchReferralCodes(currentPage, searchTerm, statusFilter);
      } else {
        showToast(`❌ ${result.message || 'Failed to create referral code'}`, 'error');
      }
    } catch (err) {
      console.error('Error creating referral code:', err);
      showToast('❌ Failed to create referral code', 'error');
    }
  };

  // Update referral code
  const updateReferralCode = async () => {
    if (!selectedCode) return;
    
    try {
      setErrors({});
      
      const payload = {
        organizationName: formData.organizationName.trim(),
        description: formData.description.trim() || undefined,
        chainBonuses: formData.chainBonuses.length > 0 ? formData.chainBonuses : undefined,
        expiresAt: formData.expiresAt || undefined,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined
      };

      const result = await adminApiClient.put(`/admin/org-referral-codes/${selectedCode._id}`, payload);
      
      if (result.success) {
        showToast('✅ Referral code updated successfully!', 'success');
        setShowEditModal(false);
        setSelectedCode(null);
        resetForm();
        fetchReferralCodes(currentPage, searchTerm, statusFilter);
      } else {
        showToast(`❌ ${result.message || 'Failed to update referral code'}`, 'error');
      }
    } catch (err) {
      console.error('Error updating referral code:', err);
      showToast('❌ Failed to update referral code', 'error');
    }
  };

  // Delete referral code
  const deleteReferralCode = async () => {
    if (!selectedCode) return;
    
    try {
      const result = await adminApiClient.delete(`/admin/org-referral-codes/${selectedCode._id}`);
      
      if (result.success) {
        showToast('✅ Referral code deleted successfully!', 'success');
        setShowDeleteModal(false);
        setSelectedCode(null);
        fetchReferralCodes(currentPage, searchTerm, statusFilter);
      } else {
        showToast(`❌ ${result.message || 'Failed to delete referral code'}`, 'error');
      }
    } catch (err) {
      console.error('Error deleting referral code:', err);
      showToast('❌ Failed to delete referral code', 'error');
    }
  };

  // Toggle referral code status
  const toggleCodeStatus = async (code: OrgReferralCode) => {
    try {
      const result = await adminApiClient.patch(`/admin/org-referral-codes/${code._id}/toggle-status`);
      
      if (result.success) {
        const action = !code.isActive ? 'activated' : 'deactivated';
        showToast(`✅ Referral code ${action} successfully!`, 'success');
        fetchReferralCodes(currentPage, searchTerm, statusFilter);
      } else {
        showToast(`❌ ${result.message || 'Failed to update status'}`, 'error');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      showToast('❌ Failed to update status', 'error');
    }
  };

  // Update organization referral rewards
  const updateOrgReferralRewards = async () => {
    if (!selectedCode) return;
    
    try {
      setRewardsLoading(true);
      setErrors({});

      // Validate inputs
      if (!rewardsFormData.chainId) {
        setErrors({ chainId: 'Chain selection is required' });
        return;
      }

      if (!rewardsFormData.rewardsAmount || rewardsFormData.rewardsAmount <= 0) {
        setErrors({ rewardsAmount: 'Amount must be greater than 0' });
        return;
      }

      // Check if there are sufficient available rewards
      const bonus = selectedCode.referralBonuses?.find(b => b.chainId === rewardsFormData.chainId);
      if (!bonus) {
        setErrors({ chainId: 'No referral bonus found for selected chain' });
        return;
      }

      const { decimals } = getDisplayDenomInfo(bonus.denom, bonus.chainId);
      const availableAmountInDisplay = fromBaseUnits(bonus.reward, decimals);
      
      if (rewardsFormData.rewardsAmount > availableAmountInDisplay) {
        const { displayDenom } = getDisplayDenomInfo(bonus.denom, bonus.chainId);
        setErrors({ 
          rewardsAmount: `Insufficient rewards. Available: ${availableAmountInDisplay.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
          })} ${displayDenom}` 
        });
        return;
      }
      
      // Convert display amount to base units for API
      const rewardsAmountInBaseUnits = toBaseUnits(rewardsFormData.rewardsAmount, decimals);
      
      const payload = {
        chainId: rewardsFormData.chainId,
        rewardsAmount: rewardsAmountInBaseUnits,
        denom: rewardsFormData.denom
      };

      const result = await adminApiClient.patch(
        `/admin/org-referral-codes/${selectedCode._id}/update-rewards`,
        payload
      );
      
      if (result.success) {
        showToast('✅ Organization rewards updated successfully!', 'success');
        setShowUpdateRewardsModal(false);
        setSelectedCode(null);
        resetRewardsForm();
        fetchReferralCodes(currentPage, searchTerm, statusFilter);
      } else {
        // Handle specific error messages from the API
        if (result.message?.includes('Insufficient rewards')) {
          setErrors({ rewardsAmount: result.message });
        } else if (result.message?.includes('Chain ID')) {
          setErrors({ chainId: result.message });
        } else {
          showToast(`❌ ${result.message || 'Failed to update rewards'}`, 'error');
        }
      }
    } catch (err) {
      console.error('Error updating organization rewards:', err);
      showToast('❌ Failed to update organization rewards', 'error');
    } finally {
      setRewardsLoading(false);
    }
  };

  // Utility functions
  const showToast = (message: string, _type: 'success' | 'error') => {
    setCopyToast(message);
    setTimeout(() => setCopyToast(null), 3000);
  };

  const copyToClipboard = async (text: string, type: string = 'text') => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`✅ ${type} copied to clipboard!`, 'success');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showToast('❌ Failed to copy to clipboard', 'error');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatTokenAmount = (amount: number, decimals = 6) => {
    const divisor = Math.pow(10, decimals);
    return (amount / divisor).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  // Placeholder token prices - in real implementation, fetch from API
  const getTokenPrice = (denom: string): number => {
    const prices: { [key: string]: number } = {
      'uakt': 2.15, // AKT price
      'afet': 0.85, // FET price
      'uatom': 4.20, // ATOM price
      'unam': 0.12, // NAM price (placeholder)
    };
    return prices[denom] || 0;
  };

  const convertToUSD = (amount: number, denom: string): number => {
    const decimals = denom.startsWith('u') ? 6 : 18;
    const tokenAmount = amount / Math.pow(10, decimals);
    const price = getTokenPrice(denom);
    return tokenAmount * price;
  };

  const getTotalRewardEarnedUSD = (code: OrgReferralCode) => {
    if (!code.referralBonuses) return 0;
    return code.referralBonuses.reduce((total, bonus) => {
      return total + convertToUSD(bonus.rewardEarned, bonus.denom);
    }, 0);
  };

  const getTotalPendingRewardsUSD = (code: OrgReferralCode) => {
    if (!code.referralBonuses) return 0;
    return code.referralBonuses.reduce((total, bonus) => {
      return total + convertToUSD(bonus.reward, bonus.denom);
    }, 0);
  };

  const getTotalActiveChains = (code: OrgReferralCode) => {
    if (!code.chainBonuses) return 0;
    return code.chainBonuses.filter(chain => chain.isActive).length;
  };

  const getChainNameFormatted = (chainName: string) => {
    return chainName.charAt(0).toUpperCase() + chainName.slice(1);
  };

  const resetForm = () => {
    // Initialize chain bonuses with all enabled chains at 0% bonus
    const initialChainBonuses = enabledChains.map(chain => ({
      chainId: chain.chainId,
      bonusPercentage: 0,
      denom: chain.denom,
      isActive: false
    }));

    setFormData({
      referralCode: '',
      organizationName: '',
      description: '',
      chainBonuses: initialChainBonuses,
      expiresAt: '',
      maxUses: ''
    });
    setErrors({});
  };

  const resetRewardsForm = () => {
    setRewardsFormData({
      chainId: '',
      rewardsAmount: 0,
      denom: ''
    });
    setErrors({});
  };

  // Helper function to get display denomination and decimals
  const getDisplayDenomInfo = (baseDenom: string, chainId: string) => {
    const chainInfo = enabledChains.find(chain => chain.chainId === chainId);
    const assetList = assetLists.find(asset => asset.chainName === chainInfo?.chainName);
    
    if (assetList?.assets && assetList.assets.length > 0) {
      const nativeAsset = assetList.assets[0];
      if (nativeAsset.base === baseDenom) {
        return {
          displayDenom: nativeAsset.display || nativeAsset.symbol || baseDenom,
          decimals: nativeAsset.denomUnits?.find(unit => unit.denom === nativeAsset.display)?.exponent || 6
        };
      }
    }
    
    // Fallback logic
    const decimals = baseDenom.startsWith('u') ? 6 : 18;
    let displayDenom = baseDenom;
    if (baseDenom.startsWith('u')) {
      displayDenom = baseDenom.slice(1).toUpperCase();
    }
    
    return { displayDenom, decimals };
  };

  // Convert from base units to display units
  const fromBaseUnits = (amount: number, decimals: number): number => {
    return amount / Math.pow(10, decimals);
  };

  // Convert from display units to base units
  const toBaseUnits = (amount: number, decimals: number): number => {
    return Math.round(amount * Math.pow(10, decimals));
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

  const openEditModal = (code: OrgReferralCode) => {
    setSelectedCode(code);
    
    // Create chain bonuses for all enabled chains, using existing values where available
    const existingBonuses = new Map(code.chainBonuses.map(bonus => [bonus.chainId, bonus]));
    
    const allChainBonuses = enabledChains.map(chain => {
      const existing = existingBonuses.get(chain.chainId);
      return {
        chainId: chain.chainId,
        bonusPercentage: existing?.bonusPercentage || 0,
        denom: existing?.denom || chain.denom,
        isActive: existing?.isActive || false
      };
    });

    setFormData({
      referralCode: code.referralCode,
      organizationName: code.organizationName,
      description: code.description || '',
      chainBonuses: allChainBonuses,
      expiresAt: code.expiresAt ? code.expiresAt.split('T')[0] : '',
      maxUses: code.maxUses ? code.maxUses.toString() : ''
    });
    setShowEditModal(true);
  };

  const openDetailsModal = (code: OrgReferralCode) => {
    setSelectedCode(code);
    setShowDetailsModal(true);
  };

  const openDeleteModal = (code: OrgReferralCode) => {
    setSelectedCode(code);
    setShowDeleteModal(true);
  };

  const openUpdateRewardsModal = (code: OrgReferralCode) => {
    setSelectedCode(code);
    resetRewardsForm();
    setShowUpdateRewardsModal(true);
  };

  const updateChainBonus = (index: number, field: string, value: any) => {
    // Add validation for bonus percentage
    if (field === 'bonusPercentage') {
      const numValue = parseInt(value) || 0;
      if (numValue < 0) value = 0;
      if (numValue > 100) value = 100;
    }
    
    setFormData(prev => ({
      ...prev,
      chainBonuses: prev.chainBonuses.map((bonus, i) => 
        i === index ? { ...bonus, [field]: value } : bonus
      )
    }));
  };

  // Handle search and filters
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchReferralCodes(1, searchTerm, statusFilter);
  };

  const handleFilterChange = (newStatus: 'all' | 'active' | 'inactive') => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
    fetchReferralCodes(1, searchTerm, newStatus);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchReferralCodes(page, searchTerm, statusFilter);
  };

  useEffect(() => {
    fetchEnabledChains();
    fetchReferralCodes();
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Organization Referral Codes
            </h1>
            <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage custom referral codes for partner organizations
            </p>
          </div>
          
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add New Code</span>
          </button>
        </div>
      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {copyToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className={`fixed top-4 left-1/2 z-50 px-4 py-2 rounded-lg shadow-lg ${
              isDarkMode
                ? 'bg-gray-800 border border-gray-600 text-white'
                : 'bg-white border border-gray-200 text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{copyToast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filters */}
      <motion.div
        className={`p-6 rounded-lg border mb-6 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200 shadow-sm'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
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
                placeholder="Search by code or organization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
              />
            </div>
          </form>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value as 'all' | 'active' | 'inactive')}
              className={`px-3 py-2 border rounded-lg ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchReferralCodes(currentPage, searchTerm, statusFilter)}
            className={`px-3 py-2 border rounded-lg font-medium transition-colors ${
              isDarkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      {/* Referral Codes Table */}
      <motion.div
        className={`rounded-lg border ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } overflow-hidden shadow-sm`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Code & Organization
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Chain Bonuses
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Usage Stats
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Status & Limits
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
              {loading ? (
                // Loading skeleton
                [...Array(5)].map((_, index) => (
                  <tr key={index}>
                    {[...Array(5)].map((_, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4 whitespace-nowrap">
                        <div className={`h-4 rounded animate-pulse ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                        }`}></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : referralCodes.length > 0 ? (
                referralCodes.map((code) => (
                  <tr key={code._id}>
                    {/* Code & Organization */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Hash className="h-4 w-4 text-teal-500" />
                          <div className={`font-mono text-sm font-medium ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {code.referralCode}
                          </div>
                          <button
                            onClick={() => copyToClipboard(code.referralCode, 'Referral code')}
                            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <div className={`text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {code.organizationName}
                          </div>
                        </div>
                        {code.description && (
                          <div className={`text-xs mt-1 ${
                            isDarkMode ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            {code.description.length > 50 
                              ? `${code.description.substring(0, 50)}...` 
                              : code.description
                            }
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Chain Bonuses */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {code.chainBonuses.slice(0, 2).map((bonus, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Gift className="h-3 w-3 text-green-500" />
                            <span className={`text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {bonus.chainName}: {bonus.bonusPercentage}%
                            </span>
                          </div>
                        ))}
                        {code.chainBonuses.length > 2 && (
                          <div className={`text-xs ${
                            isDarkMode ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            +{code.chainBonuses.length - 2} more chains
                          </div>
                        )}
                        {code.chainBonuses.length === 0 && (
                          <div className={`text-sm ${
                            isDarkMode ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            No chain bonuses
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Usage Stats */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-3 w-3 text-blue-500" />
                          <span className={`text-sm font-medium ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {code.usageStats.totalUses} uses
                          </span>
                        </div>
                        {code.usageStats.lastUsedAt && (
                          <div className={`text-xs ${
                            isDarkMode ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            Last: {formatDate(code.usageStats.lastUsedAt)}
                          </div>
                        )}
                        {!code.usageStats.lastUsedAt && (
                          <div className={`text-xs ${
                            isDarkMode ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            Never used
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status & Limits */}
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          code.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {code.isActive ? 'Active' : 'Inactive'}
                        </span>
                        
                        {code.expiresAt && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-orange-500" />
                            <span className={`text-xs ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Expires: {formatDate(code.expiresAt)}
                            </span>
                          </div>
                        )}
                        
                        {code.maxUses && (
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3 text-purple-500" />
                            <span className={`text-xs ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Max: {code.maxUses} uses
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openDetailsModal(code)}
                          className={`p-2 rounded-lg transition-colors ${
                            isDarkMode
                              ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                          }`}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => openEditModal(code)}
                          className={`p-2 rounded-lg transition-colors ${
                            isDarkMode
                              ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                          }`}
                          title="Edit Code"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => toggleCodeStatus(code)}
                          className={`p-2 rounded-lg transition-colors ${
                            code.isActive
                              ? 'hover:bg-red-100 text-red-600 hover:text-red-700 dark:hover:bg-red-900'
                              : 'hover:bg-green-100 text-green-600 hover:text-green-700 dark:hover:bg-green-900'
                          }`}
                          title={code.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {code.isActive ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => openUpdateRewardsModal(code)}
                          className={`p-2 rounded-lg transition-colors ${
                            isDarkMode
                              ? 'hover:bg-gray-700 text-yellow-400 hover:text-yellow-300'
                              : 'hover:bg-yellow-50 text-yellow-600 hover:text-yellow-700'
                          }`}
                          title="Update Rewards"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => openDeleteModal(code)}
                          className="p-2 rounded-lg transition-colors hover:bg-red-100 text-red-600 hover:text-red-700 dark:hover:bg-red-900"
                          title="Delete Code"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={`px-6 py-12 text-center ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <Hash className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No organization referral codes found</p>
                    <p className="text-sm mt-2">Create your first referral code to get started</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} codes
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPrev}
              className={`px-3 py-2 border rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700 disabled:hover:bg-transparent'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-transparent'
              }`}
            >
              Previous
            </button>
            
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = i + 1;
              const isCurrentPage = page === currentPage;
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 border rounded-lg font-medium transition-colors ${
                    isCurrentPage
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : isDarkMode
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNext}
              className={`px-3 py-2 border rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700 disabled:hover:bg-transparent'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-transparent'
              }`}
            >
              Next
            </button>
          </div>
        </motion.div>
      )}

      {/* TODO: Add modals for Add, Edit, Delete, and Details */}
      {/* This is where we'll add the modal components */}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-4xl rounded-lg shadow-xl ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } max-h-[90vh] overflow-y-auto`}
          >
            <div className="p-6">
              <h2 className={`text-xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {showAddModal ? 'Add New Organization Referral Code' : 'Edit Organization Referral Code'}
              </h2>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Referral Code *
                    </label>
                    <input
                      type="text"
                      value={formData.referralCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, referralCode: e.target.value }))}
                      disabled={showEditModal}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        showEditModal ? 'opacity-50 cursor-not-allowed' : ''
                      } ${errors.referralCode ? 'border-red-500' : ''}`}
                      placeholder="e.g., SAHAL2025"
                    />
                    {errors.referralCode && (
                      <p className="text-red-500 text-xs mt-1">{errors.referralCode}</p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      value={formData.organizationName}
                      onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        errors.organizationName ? 'border-red-500' : ''
                      }`}
                      placeholder="e.g., Sahal Organization"
                    />
                    {errors.organizationName && (
                      <p className="text-red-500 text-xs mt-1">{errors.organizationName}</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.description ? 'border-red-500' : ''
                    }`}
                    placeholder="Optional description for the referral code..."
                  />
                  {errors.description && (
                    <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                  )}
                </div>

                {/* Chain Bonuses */}
                <div>
                  <div className="mb-4">
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Chain Bonuses
                    </label>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Configure bonus percentages for each enabled chain validator (0-100%)
                    </p>
                  </div>

                  {loadingChains ? (
                    <div className={`p-4 border-2 border-dashed rounded-lg text-center ${
                      isDarkMode 
                        ? 'border-gray-600 text-gray-500' 
                        : 'border-gray-300 text-gray-500'
                    }`}>
                      <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50 animate-spin" />
                      <p className="text-sm">Loading enabled chains...</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {formData.chainBonuses.map((bonus, index) => {
                        const chainInfo = enabledChains.find(chain => chain.chainId === bonus.chainId);
                        return (
                          <div key={bonus.chainId} className={`p-4 border rounded-lg ${
                            isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                          }`}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className={`block text-xs font-medium mb-1 ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  Chain
                                </label>
                                <div className={`px-2 py-1 text-sm border rounded bg-gray-100 ${
                                  isDarkMode
                                    ? 'bg-gray-800 border-gray-600 text-gray-300'
                                    : 'bg-gray-100 border-gray-300 text-gray-700'
                                }`}>
                                  {chainInfo?.prettyName || chainInfo?.chainName || bonus.chainId}
                                </div>
                              </div>

                              <div>
                                <label className={`block text-xs font-medium mb-1 ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  Bonus % (0-100)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={bonus.bonusPercentage}
                                  onChange={(e) => updateChainBonus(index, 'bonusPercentage', parseInt(e.target.value) || 0)}
                                  className={`w-full px-2 py-1 text-sm border rounded ${
                                    isDarkMode
                                      ? 'bg-gray-600 border-gray-500 text-white'
                                      : 'bg-white border-gray-300 text-gray-900'
                                  } focus:ring-1 focus:ring-teal-500`}
                                />
                              </div>

                              <div>
                                <label className={`block text-xs font-medium mb-1 ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  Active
                                </label>
                                <label className="flex items-center mt-1">
                                  <input
                                    type="checkbox"
                                    checked={bonus.isActive}
                                    onChange={(e) => updateChainBonus(index, 'isActive', e.target.checked)}
                                    className="mr-2 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                  />
                                  <span className={`text-sm ${
                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                  }`}>
                                    {bonus.isActive ? 'Enabled' : 'Disabled'}
                                  </span>
                                </label>
                              </div>
                            </div>
                            
                            {/* Show denomination info */}
                            <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                              <p className={`text-xs ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                Denomination: <span className="font-mono">{bonus.denom}</span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      
                      {formData.chainBonuses.length === 0 && (
                        <div className={`p-4 border-2 border-dashed rounded-lg text-center ${
                          isDarkMode 
                            ? 'border-gray-600 text-gray-500' 
                            : 'border-gray-300 text-gray-500'
                        }`}>
                          <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No enabled chains found</p>
                          <p className="text-xs">Enabled chains will appear here automatically</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Limits and Expiration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Expiration Date
                    </label>
                    <input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        errors.expiresAt ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.expiresAt && (
                      <p className="text-red-500 text-xs mt-1">{errors.expiresAt}</p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Maximum Uses
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxUses}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxUses: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        errors.maxUses ? 'border-red-500' : ''
                      }`}
                      placeholder="Optional usage limit"
                    />
                    {errors.maxUses && (
                      <p className="text-red-500 text-xs mt-1">{errors.maxUses}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => {
                    if (showAddModal) setShowAddModal(false);
                    if (showEditModal) {
                      setShowEditModal(false);
                      setSelectedCode(null);
                    }
                    resetForm();
                  }}
                  className={`px-4 py-2 border rounded-lg font-medium transition-colors ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={showAddModal ? createReferralCode : updateReferralCode}
                  disabled={!formData.referralCode.trim() || !formData.organizationName.trim()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {showAddModal ? 'Create Code' : 'Update Code'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedCode && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-6xl rounded-lg shadow-xl ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } max-h-[90vh] overflow-y-auto`}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {selectedCode.organizationName}
                  </h2>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedCode.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {selectedCode.isActive ? '✓ Active' : '✗ Inactive'}
                    </span>
                    <span className={`font-mono text-lg font-bold ${
                      isDarkMode ? 'text-teal-400' : 'text-teal-600'
                    }`}>
                      {selectedCode.referralCode}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedCode.referralCode, 'Referral code')}
                      className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Organization Details */}
              <div className={`p-6 rounded-lg mb-6 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Created Date
                    </label>
                    <p className={`text-lg ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {formatDate(selectedCode.createdAt)}
                    </p>
                  </div>
                  <div className="text-center">
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Last Updated
                    </label>
                    <p className={`text-lg ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {formatDate(selectedCode.updatedAt)}
                    </p>
                  </div>
                  <div className="text-center">
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Max Uses
                    </label>
                    <p className={`text-lg ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {selectedCode.maxUses || 'Unlimited'}
                    </p>
                  </div>
                </div>

                {selectedCode.description && (
                  <div className="mt-6 pt-6 border-t border-gray-300 dark:border-gray-600 text-center">
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Description
                    </label>
                    <p className={`text-lg leading-relaxed ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {selectedCode.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {/* Active Chains */}
                <div className={`p-6 rounded-2xl border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 hover:border-purple-500/30' 
                    : 'bg-white border-gray-200 hover:border-purple-500/30'
                } transition-colors`}>
                  <div className="flex items-center justify-between mb-4">
                    <BarChart3 className="h-8 w-8 text-blue-400" />
                    <span className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {getTotalActiveChains(selectedCode)}
                    </span>
                  </div>
                  <h3 className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Active Chains
                  </h3>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Out of {selectedCode.chainBonuses.length} total chains
                  </p>
                </div>

                {/* Total Users Referred */}
                <div className={`p-6 rounded-2xl border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 hover:border-purple-500/30' 
                    : 'bg-white border-gray-200 hover:border-purple-500/30'
                } transition-colors`}>
                  <div className="flex items-center justify-between mb-4">
                    <Users className="h-8 w-8 text-green-400" />
                    <span className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedCode.usageStats.totalUses}
                    </span>
                  </div>
                  <h3 className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Total Users Referred
                  </h3>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {selectedCode.usageStats.lastUsedAt 
                      ? `Last used: ${formatDate(selectedCode.usageStats.lastUsedAt).split(',')[0]}` 
                      : 'Never used'
                    }
                  </p>
                </div>

                {/* Total Earned Rewards (USD) */}
                <div className={`p-6 rounded-2xl border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 hover:border-purple-500/30' 
                    : 'bg-white border-gray-200 hover:border-purple-500/30'
                } transition-colors`}>
                  <div className="flex items-center justify-between mb-4">
                    <DollarSign className="h-8 w-8 text-purple-400" />
                    <span className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(getTotalRewardEarnedUSD(selectedCode))}
                    </span>
                  </div>
                  <h3 className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Total Earned Rewards
                  </h3>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    USD value of earned rewards
                  </p>
                </div>

                {/* Total Claimable Rewards (USD) */}
                <div className={`p-6 rounded-2xl border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 hover:border-purple-500/30' 
                    : 'bg-white border-gray-200 hover:border-purple-500/30'
                } transition-colors`}>
                  <div className="flex items-center justify-between mb-4">
                    <TrendingUp className="h-8 w-8 text-yellow-400" />
                    <span className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(getTotalPendingRewardsUSD(selectedCode))}
                    </span>
                  </div>
                  <h3 className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Total Claimable Rewards
                  </h3>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    USD value of claimable rewards
                  </p>
                </div>
              </div>

              {/* Chain Bonuses Section */}
              <div className={`p-6 rounded-lg mb-6 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className="flex items-center space-x-3 mb-6">
                  <BarChart3 className="h-6 w-6 text-purple-400" />
                  <h3 className={`text-xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Chain Bonus Percentages
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedCode.chainBonuses.map((chain, index) => (
                    <div key={index} className={`p-4 rounded-xl border ${
                      chain.isActive 
                        ? isDarkMode ? 'bg-gray-800 border-green-500/30' : 'bg-white border-green-500/30'
                        : isDarkMode ? 'bg-gray-800 border-red-500/30' : 'bg-white border-red-500/30'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${
                            chain.isActive ? 'bg-green-400' : 'bg-red-400'
                          }`}></span>
                          <h4 className={`font-semibold ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {getChainNameFormatted(chain.chainName)}
                          </h4>
                        </div>
                        <span className="text-2xl font-bold text-purple-400">
                          {chain.bonusPercentage}%
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <span className="font-medium">Chain ID:</span> {chain.chainId}
                        </p>
                        <p className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <span className="font-medium">Denom:</span> {chain.denom}
                        </p>
                        <p className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <span className="font-medium">Status:</span>
                          <span className={chain.isActive ? 'text-green-400' : 'text-red-400'}>
                            {' '}{chain.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referral Bonuses Section */}
              <div className={`p-6 rounded-lg mb-6 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className="flex items-center space-x-3 mb-6">
                  <DollarSign className="h-6 w-6 text-green-400" />
                  <h3 className={`text-xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Accumulated Referral Bonuses
                  </h3>
                </div>

                {selectedCode.referralBonuses && selectedCode.referralBonuses.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCode.referralBonuses.map((bonus) => (
                      <div
                        key={bonus._id}
                        className={`p-6 rounded-xl border ${
                          isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                          <div>
                            <p className={`text-sm font-medium mb-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Chain
                            </p>
                            <p className={`text-lg font-semibold ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {bonus.chainId}
                            </p>
                            <p className={`text-sm ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Denom: {bonus.denom}
                            </p>
                          </div>
                          <div>
                            <p className={`text-sm font-medium mb-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Earned
                            </p>
                            <p className="text-lg font-semibold text-green-400">
                              {formatTokenAmount(bonus.rewardEarned)} {bonus.denom.replace('u', '').toUpperCase()}
                            </p>
                            <p className={`text-sm ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              ≈ {formatCurrency(convertToUSD(bonus.rewardEarned, bonus.denom))}
                            </p>
                          </div>
                          <div>
                            <p className={`text-sm font-medium mb-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Claimable
                            </p>
                            <p className="text-lg font-semibold text-yellow-400">
                              {formatTokenAmount(bonus.reward)} {bonus.denom.replace('u', '').toUpperCase()}
                            </p>
                            <p className={`text-sm ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              ≈ {formatCurrency(convertToUSD(bonus.reward, bonus.denom))}
                            </p>
                          </div>
                          <div>
                            <p className={`text-sm font-medium mb-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Total Value
                            </p>
                            <p className="text-lg font-semibold text-purple-400">
                              {formatTokenAmount(bonus.rewardEarned + bonus.reward)} {bonus.denom.replace('u', '').toUpperCase()}
                            </p>
                            <p className={`text-sm ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              ≈ {formatCurrency(convertToUSD(bonus.rewardEarned + bonus.reward, bonus.denom))}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                          <p className={`text-xs ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            Created: {formatDate(bonus.createdAt)} | Updated: {formatDate(bonus.updatedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <DollarSign className={`h-12 w-12 mx-auto mb-4 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                    <p className={`text-lg ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      No referral bonuses accumulated yet
                    </p>
                    <p className={`text-sm mt-2 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Bonuses will appear here once referrals start generating rewards
                    </p>
                  </div>
                )}
              </div>

              {/* Meta Information */}
              <div className={`p-4 rounded-lg mb-6 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <h3 className={`font-semibold mb-3 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Meta Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Created By
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-mono ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {selectedCode.createdBy}
                      </span>
                      <button
                        onClick={() => copyToClipboard(selectedCode.createdBy, 'Created By ID')}
                        className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                        title="Copy Created By ID"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {selectedCode.updatedBy && (
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Updated By
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-mono ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {selectedCode.updatedBy}
                        </span>
                        <button
                          onClick={() => copyToClipboard(selectedCode.updatedBy!, 'Updated By ID')}
                          className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}
                          title="Copy Updated By ID"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className={`px-4 py-2 border rounded-lg font-medium transition-colors ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    openUpdateRewardsModal(selectedCode);
                  }}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Update Rewards</span>
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    openEditModal(selectedCode);
                  }}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
                >
                  Edit Code
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCode && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-md rounded-lg shadow-xl ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <div className="p-6">
              <h2 className={`text-xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Delete Referral Code
              </h2>
              
              <div className={`mb-6 p-4 rounded-lg ${
                isDarkMode ? 'bg-red-900 border border-red-700' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className={`font-medium ${
                      isDarkMode ? 'text-red-300' : 'text-red-800'
                    }`}>
                      Permanent Deletion
                    </h3>
                    <p className={`text-sm mt-1 ${
                      isDarkMode ? 'text-red-400' : 'text-red-700'
                    }`}>
                      Are you sure you want to permanently delete the referral code "{selectedCode.referralCode}" 
                      for {selectedCode.organizationName}? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              {selectedCode.usageStats.totalUses > 0 && (
                <div className={`mb-4 p-3 rounded-lg ${
                  isDarkMode ? 'bg-yellow-900 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-yellow-300' : 'text-yellow-800'
                  }`}>
                    ⚠️ This code has been used {selectedCode.usageStats.totalUses} times.
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedCode(null);
                  }}
                  className={`px-4 py-2 border rounded-lg font-medium transition-colors ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={deleteReferralCode}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Update Rewards Modal */}
      {showUpdateRewardsModal && selectedCode && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-2xl rounded-lg shadow-xl ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className={`text-xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Update Rewards Earned
                  </h2>
                  <p className={`text-sm mt-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Transfer rewards from available pool to earned for: <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{selectedCode.referralCode}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUpdateRewardsModal(false);
                    setSelectedCode(null);
                    resetRewardsForm();
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Available Rewards Summary */}
              <div className={`p-4 rounded-lg mb-6 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <h3 className={`font-semibold mb-3 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Available Rewards to Transfer
                </h3>
                
                {selectedCode.referralBonuses && selectedCode.referralBonuses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCode.referralBonuses.map((bonus) => {
                      const chainInfo = enabledChains.find(chain => chain.chainId === bonus.chainId);
                      const { displayDenom, decimals } = getDisplayDenomInfo(bonus.denom, bonus.chainId);
                      const availableAmount = fromBaseUnits(bonus.reward, decimals);
                      const earnedAmount = fromBaseUnits(bonus.rewardEarned, decimals);
                      
                      return (
                        <div
                          key={bonus.chainId}
                          className={`p-3 rounded-lg border ${
                            isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className={`font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {chainInfo?.prettyName || getChainNameFormatted(bonus.chainId)}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {displayDenom}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>Available:</span>
                              <span className={`font-mono text-sm ${
                                isDarkMode ? 'text-green-400' : 'text-green-600'
                              }`}>
                                {availableAmount.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 6
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>Already Earned:</span>
                              <span className={`font-mono text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                {earnedAmount.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 6
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    No referral bonuses available for this organization.
                  </p>
                )}
              </div>

              {/* Update Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Chain Selection */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Chain *
                    </label>
                    <select
                      value={rewardsFormData.chainId}
                      onChange={(e) => {
                        const chainId = e.target.value;
                        const selectedBonus = selectedCode.referralBonuses?.find(b => b.chainId === chainId);
                        
                        setRewardsFormData(prev => ({
                          ...prev,
                          chainId: chainId,
                          denom: selectedBonus?.denom || '',
                          rewardsAmount: 0 // Reset amount when chain changes
                        }));
                      }}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        errors.chainId ? 'border-red-500' : ''
                      }`}
                    >
                      <option value="">Select Chain</option>
                      {selectedCode.referralBonuses?.map((bonus) => {
                        const chainInfo = enabledChains.find(chain => chain.chainId === bonus.chainId);
                        return (
                          <option key={bonus.chainId} value={bonus.chainId}>
                            {chainInfo?.prettyName || getChainNameFormatted(bonus.chainId)}
                          </option>
                        );
                      })}
                    </select>
                    {errors.chainId && (
                      <p className="text-red-500 text-xs mt-1">{errors.chainId}</p>
                    )}
                  </div>

                  {/* Rewards Amount */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Amount to Transfer *
                      {rewardsFormData.chainId && (
                        <span className={`text-xs ml-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          (in {(() => {
                            const bonus = selectedCode.referralBonuses?.find(b => b.chainId === rewardsFormData.chainId);
                            return bonus ? getDisplayDenomInfo(bonus.denom, bonus.chainId).displayDenom : '';
                          })()})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      min="0"
                      value={rewardsFormData.rewardsAmount}
                      onChange={(e) => setRewardsFormData(prev => ({
                        ...prev,
                        rewardsAmount: parseFloat(e.target.value) || 0
                      }))}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        errors.rewardsAmount ? 'border-red-500' : ''
                      }`}
                      placeholder={rewardsFormData.chainId 
                        ? `Amount in ${(() => {
                            const bonus = selectedCode.referralBonuses?.find(b => b.chainId === rewardsFormData.chainId);
                            return bonus ? getDisplayDenomInfo(bonus.denom, bonus.chainId).displayDenom : 'tokens';
                          })()}`
                        : "0.000000"
                      }
                    />
                    {errors.rewardsAmount && (
                      <p className="text-red-500 text-xs mt-1">{errors.rewardsAmount}</p>
                    )}
                  </div>

                  {/* Token Denomination (Auto-filled) */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Token
                    </label>
                    <input
                      type="text"
                      value={rewardsFormData.chainId 
                        ? (() => {
                            const bonus = selectedCode.referralBonuses?.find(b => b.chainId === rewardsFormData.chainId);
                            return bonus ? getDisplayDenomInfo(bonus.denom, bonus.chainId).displayDenom : '';
                          })()
                        : ''
                      }
                      readOnly
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode
                          ? 'bg-gray-600 border-gray-600 text-gray-300'
                          : 'bg-gray-100 border-gray-300 text-gray-600'
                      } cursor-not-allowed`}
                      placeholder="Select chain first"
                    />
                  </div>
                </div>

                {/* Available Amount Info */}
                {rewardsFormData.chainId && (
                  <div className={`p-3 rounded-lg ${
                    isDarkMode ? 'bg-blue-900 border border-blue-700' : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <DollarSign className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className={`text-sm font-medium ${
                          isDarkMode ? 'text-blue-300' : 'text-blue-800'
                        }`}>
                          Available to Transfer
                        </p>
                        <p className={`text-sm ${
                          isDarkMode ? 'text-blue-400' : 'text-blue-700'
                        }`}>
                          {(() => {
                            const bonus = selectedCode.referralBonuses?.find(b => b.chainId === rewardsFormData.chainId);
                            if (!bonus) return '0.00';
                            
                            const { displayDenom, decimals } = getDisplayDenomInfo(bonus.denom, bonus.chainId);
                            const availableAmount = fromBaseUnits(bonus.reward, decimals);
                            
                            return `${availableAmount.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 6
                            })} ${displayDenom}`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => {
                    setShowUpdateRewardsModal(false);
                    setSelectedCode(null);
                    resetRewardsForm();
                  }}
                  className={`px-4 py-2 border rounded-lg font-medium transition-colors ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  disabled={rewardsLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={updateOrgReferralRewards}
                  disabled={
                    rewardsLoading || 
                    !rewardsFormData.chainId || 
                    !rewardsFormData.rewardsAmount || 
                    rewardsFormData.rewardsAmount <= 0
                  }
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {rewardsLoading && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                  <span>{rewardsLoading ? 'Updating...' : 'Update Rewards'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default OrgReferralCodeManagement;

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
  Hash
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

interface OrgReferralCode {
  _id: string;
  referralCode: string;
  organizationName: string;
  description?: string;
  chainBonuses: ChainBonus[];
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-3xl rounded-lg shadow-xl ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } max-h-[90vh] overflow-y-auto`}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className={`text-xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Referral Code Details
                  </h2>
                  <p className={`text-sm mt-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Complete information about this referral code
                  </p>
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

              <div className="space-y-6">
                {/* Basic Information */}
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h3 className={`font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Basic Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Referral Code
                      </label>
                      <div className="flex items-center space-x-2">
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

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Organization
                      </label>
                      <span className={`text-lg ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {selectedCode.organizationName}
                      </span>
                    </div>
                  </div>

                  {selectedCode.description && (
                    <div className="mt-4">
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Description
                      </label>
                      <p className={`${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {selectedCode.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Status
                      </label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedCode.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {selectedCode.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {selectedCode.expiresAt && (
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Expires At
                        </label>
                        <span className={`text-sm ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {formatDate(selectedCode.expiresAt)}
                        </span>
                      </div>
                    )}

                    {selectedCode.maxUses && (
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Max Uses
                        </label>
                        <span className={`text-sm ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {selectedCode.maxUses} uses
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chain Bonuses */}
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h3 className={`font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Chain Bonuses ({selectedCode.chainBonuses.length})
                  </h3>
                  
                  {selectedCode.chainBonuses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedCode.chainBonuses.map((bonus, index) => (
                        <div key={index} className={`p-3 rounded border ${
                          isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className={`font-medium ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {bonus.chainName}
                              </div>
                              <div className={`text-xs ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {bonus.chainId} • {bonus.denom}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-teal-500">
                                {bonus.bonusPercentage}%
                              </div>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                bonus.isActive
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              }`}>
                                {bonus.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-center py-4 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      No chain bonuses configured
                    </p>
                  )}
                </div>

                {/* Usage Statistics */}
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h3 className={`font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Usage Statistics
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-teal-500">
                        {selectedCode.usageStats.totalUses}
                      </div>
                      <div className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Total Uses
                      </div>
                    </div>

                    <div className="text-center">
                      <div className={`text-2xl font-bold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {selectedCode.usageStats.lastUsedAt 
                          ? formatDate(selectedCode.usageStats.lastUsedAt).split(',')[0]
                          : 'Never'
                        }
                      </div>
                      <div className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Last Used
                      </div>
                    </div>

                    <div className="text-center">
                      <div className={`text-sm font-mono break-all ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {selectedCode.usageStats.lastUsedBy 
                          ? `${selectedCode.usageStats.lastUsedBy.slice(0, 12)}...`
                          : 'N/A'
                        }
                      </div>
                      <div className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Last User
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meta Information */}
                <div className={`p-4 rounded-lg ${
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
                      <span className={`text-sm font-mono ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {selectedCode.createdBy.slice(0, 20)}...
                      </span>
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Created At
                      </label>
                      <span className={`text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {formatDate(selectedCode.createdAt)}
                      </span>
                    </div>

                    {selectedCode.updatedBy && (
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Updated By
                        </label>
                        <span className={`text-sm font-mono ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {selectedCode.updatedBy.slice(0, 20)}...
                        </span>
                      </div>
                    )}

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Updated At
                      </label>
                      <span className={`text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {formatDate(selectedCode.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
    </div>
  );
};

export default OrgReferralCodeManagement;

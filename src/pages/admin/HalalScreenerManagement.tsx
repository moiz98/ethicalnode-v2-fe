import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import adminApiClient from '../../utils/adminApiClient';

interface HalalScreener {
  _id: string;
  blockchainName: string;
  blockchainToken: string;
  coinGeckoId: string;
  logoURL?: string;
  trading: {
    status: 'Non-Comfortable' | 'Comfortable' | 'Questionable';
    description: string;
  };
  staking: {
    status: 'Non-Comfortable' | 'Comfortable' | 'Questionable';
    description: string;
  };
  isActive: boolean;
  createdBy?: string;
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

const HalalScreenerManagement: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [screeners, setScreeners] = useState<HalalScreener[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [selectedScreener, setSelectedScreener] = useState<HalalScreener | null>(null);
  const [descriptionData, setDescriptionData] = useState<{
    type: 'trading' | 'staking';
    status: string;
    description: string;
    blockchain: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    blockchainName: '',
    blockchainToken: '',
    coinGeckoId: '',
    logoURL: '',
    trading: {
      status: 'Comfortable' as 'Non-Comfortable' | 'Comfortable' | 'Questionable',
      description: ''
    },
    staking: {
      status: 'Comfortable' as 'Non-Comfortable' | 'Comfortable' | 'Questionable',
      description: ''
    }
  });
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast('✅ Wallet address copied to clipboard!');
      setTimeout(() => setCopyToast(null), 3000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopyToast('❌ Failed to copy to clipboard');
      setTimeout(() => setCopyToast(null), 3000);
    }
  };

  // Fetch halal screeners from API
  const fetchScreeners = async (page: number = 1) => {
    try {
      setLoading(true);
      
      const result = await adminApiClient.get(`/halal-screener/admin/all?page=${page}&limit=20`);

      if (result.success && result.data?.screeners) {
        setScreeners(result.data.screeners);
        setPagination(result.data.pagination);
      } else {
        console.error('Failed to fetch halal screeners');
        setCopyToast('❌ Failed to fetch halal screeners');
        setTimeout(() => setCopyToast(null), 3000);
      }
    } catch (err: any) {
      // Don't show error if request was aborted
      if (err.name !== 'AbortError') {
        console.error('Error fetching halal screeners:', err);
        setCopyToast('❌ Failed to load halal screeners');
        setTimeout(() => setCopyToast(null), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Create new screener
  const createScreener = async () => {
    try {
      const result = await adminApiClient.post('/halal-screener/admin', formData);

      if (result.success) {
        console.log('Halal screener created successfully');
        setCopyToast('✅ Halal screener created successfully!');
        setTimeout(() => setCopyToast(null), 3000);
        fetchScreeners(currentPage);
        setShowAddModal(false);
        resetForm();
      } else {
        console.error(result.message || 'Failed to create screener');
        setCopyToast(`❌ ${result.message || 'Failed to create screener'}`);
        setTimeout(() => setCopyToast(null), 5000);
      }
    } catch (err) {
      console.error('Error creating screener:', err);
      setCopyToast('❌ Failed to create screener');
      setTimeout(() => setCopyToast(null), 5000);
    }
  };

  // Update screener
  const updateScreener = async () => {
    if (!selectedScreener) return;

    try {
      const result = await adminApiClient.put(`/halal-screener/admin/${selectedScreener._id}`, formData);

      if (result.success) {
        console.log('Halal screener updated successfully');
        setCopyToast('✅ Halal screener updated successfully!');
        setTimeout(() => setCopyToast(null), 3000);
        fetchScreeners(currentPage);
        setShowEditModal(false);
        setSelectedScreener(null);
        resetForm();
      } else {
        console.error(result.message || 'Failed to update screener');
        setCopyToast(`❌ ${result.message || 'Failed to update screener'}`);
        setTimeout(() => setCopyToast(null), 5000);
      }
    } catch (err) {
      console.error('Error updating screener:', err);
      setCopyToast('❌ Failed to update screener');
      setTimeout(() => setCopyToast(null), 5000);
    }
  };

  // Toggle screener status
  const toggleScreenerStatus = async (screener: HalalScreener) => {
    try {
      const result = await adminApiClient.patch(`/halal-screener/admin/${screener._id}/status`, { 
        isActive: !screener.isActive 
      });

      if (result.success) {
        console.log(`Screener ${!screener.isActive ? 'activated' : 'deactivated'} successfully`);
        setCopyToast(`✅ Screener ${!screener.isActive ? 'activated' : 'deactivated'} successfully!`);
        setTimeout(() => setCopyToast(null), 3000);
        fetchScreeners(currentPage);
      } else {
        console.error(result.message || 'Failed to update status');
        setCopyToast(`❌ ${result.message || 'Failed to update status'}`);
        setTimeout(() => setCopyToast(null), 5000);
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      setCopyToast('❌ Failed to update status');
      setTimeout(() => setCopyToast(null), 5000);
    }
  };

  // Delete screener
  const deleteScreener = async () => {
    if (!selectedScreener) return;

    try {
      const result = await adminApiClient.delete(`/halal-screener/admin/${selectedScreener._id}`);

      if (result.success) {
        console.log('Halal screener deleted successfully');
        setCopyToast('✅ Halal screener deleted successfully!');
        setTimeout(() => setCopyToast(null), 3000);
        fetchScreeners(currentPage);
        setShowDeleteModal(false);
        setSelectedScreener(null);
      } else {
        console.error(result.message || 'Failed to delete screener');
        setCopyToast(`❌ ${result.message || 'Failed to delete screener'}`);
        setTimeout(() => setCopyToast(null), 5000);
      }
    } catch (err) {
      console.error('Error deleting screener:', err);
      setCopyToast('❌ Failed to delete screener');
      setTimeout(() => setCopyToast(null), 5000);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Don't call fetchScreeners here - let useEffect handle it
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      blockchainName: '',
      blockchainToken: '',
      coinGeckoId: '',
      logoURL: '',
      trading: {
        status: 'Comfortable' as 'Non-Comfortable' | 'Comfortable' | 'Questionable',
        description: ''
      },
      staking: {
        status: 'Comfortable' as 'Non-Comfortable' | 'Comfortable' | 'Questionable',
        description: ''
      }
    });
  };

  // Open edit modal
  const openEditModal = (screener: HalalScreener) => {
    setSelectedScreener(screener);
    setFormData({
      blockchainName: screener.blockchainName,
      blockchainToken: screener.blockchainToken,
      coinGeckoId: screener.coinGeckoId,
      logoURL: screener.logoURL || '',
      trading: screener.trading,
      staking: screener.staking
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (screener: HalalScreener) => {
    setSelectedScreener(screener);
    setShowDeleteModal(true);
  };

  // Show description modal
  const showDescription = (type: 'trading' | 'staking', screener: HalalScreener) => {
    setDescriptionData({
      type,
      status: screener[type].status,
      description: screener[type].description,
      blockchain: screener.blockchainName
    });
    setShowDescriptionModal(true);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Comfortable':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Non-Comfortable':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Questionable':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status color for dark mode
  const getStatusColorDark = (status: string) => {
    switch (status) {
      case 'Comfortable':
        return 'bg-green-900 text-green-300 border-green-700';
      case 'Non-Comfortable':
        return 'bg-red-900 text-red-300 border-red-700';
      case 'Questionable':
        return 'bg-yellow-900 text-yellow-300 border-yellow-700';
      default:
        return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    
    const loadInitialData = async () => {
      if (isMounted) {
        await fetchScreeners(1);
      }
    };
    
    loadInitialData();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  // Fetch screeners when page changes
  useEffect(() => {
    if (currentPage > 1) { // Only call if page changed from initial
      fetchScreeners(currentPage);
    }
  }, [currentPage]);

  if (loading && screeners.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        <span className={`ml-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Loading halal screeners...</span>
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
            Halal Screener Management
          </h1>
          <p className={`text-lg ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Manage blockchain halal compliance assessments
          </p>
        </div>
        
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
        >
          Add New Screener
        </button>
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

      {/* Screeners Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={`rounded-lg border ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } overflow-hidden shadow-sm`}
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
                  Blockchain
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Token
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  CoinGecko ID
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Trading Status
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Staking Status
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Created By
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Last Updated
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
              {screeners.length > 0 ? (
                screeners.map((screener) => (
                  <tr key={screener._id}>
                    {/* Blockchain Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        {screener.logoURL ? (
                          <img 
                            src={screener.logoURL} 
                            alt={`${screener.blockchainName} logo`}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              // Fallback to text icon if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-8 h-8 rounded-full ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-100"
                        } flex items-center justify-center text-sm font-bold ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        } ${screener.logoURL ? 'hidden' : ''}`}>
                          {screener.blockchainToken.slice(0, 2)}
                        </div>
                        <div className={`text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {screener.blockchainName}
                        </div>
                      </div>
                    </td>

                    {/* Token Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        isDarkMode 
                          ? 'bg-blue-900 text-blue-200 border-blue-700'
                          : 'bg-blue-100 text-blue-800 border-blue-300'
                      }`}>
                        {screener.blockchainToken}
                      </span>
                    </td>

                    {/* CoinGecko ID Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-xs font-mono px-2 py-1 rounded ${
                        isDarkMode 
                          ? 'bg-gray-700 text-gray-300' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {screener.coinGeckoId}
                      </div>
                    </td>

                    {/* Trading Status Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => showDescription('trading', screener)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors hover:opacity-80 cursor-pointer ${
                          isDarkMode 
                            ? getStatusColorDark(screener.trading.status)
                            : getStatusColor(screener.trading.status)
                        }`}
                        title="Click to view description"
                      >
                        {screener.trading.status}
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </td>

                    {/* Staking Status Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => showDescription('staking', screener)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors hover:opacity-80 cursor-pointer ${
                          isDarkMode 
                            ? getStatusColorDark(screener.staking.status)
                            : getStatusColor(screener.staking.status)
                        }`}
                        title="Click to view description"
                      >
                        {screener.staking.status}
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </td>

                    {/* Active Status Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        screener.isActive
                          ? isDarkMode
                            ? 'bg-green-900 text-green-300'
                            : 'bg-green-100 text-green-800'
                          : isDarkMode
                            ? 'bg-gray-700 text-gray-300'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {screener.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Created By Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {screener.createdBy ? (
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-mono ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {`${screener.createdBy.slice(0, 8)}...${screener.createdBy.slice(-6)}`}
                          </span>
                          <button
                            onClick={() => copyToClipboard(screener.createdBy!)}
                            className={`p-1 rounded hover:bg-opacity-20 transition-colors ${
                              isDarkMode 
                                ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-300' 
                                : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                            }`}
                            title="Copy wallet address"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className={`text-sm ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          System
                        </span>
                      )}
                    </td>

                    {/* Last Updated Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {formatDate(screener.updatedAt)}
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(screener)}
                          className={`text-teal-600 hover:text-teal-700 transition-colors`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleScreenerStatus(screener)}
                          className={`${
                            screener.isActive 
                              ? 'text-orange-600 hover:text-orange-700' 
                              : 'text-green-600 hover:text-green-700'
                          } transition-colors`}
                        >
                          {screener.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openDeleteModal(screener)}
                          className="text-red-600 hover:text-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className={`px-6 py-12 text-center ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 0 012 2" />
                    </svg>
                    <p>No halal screeners found</p>
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <div>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} total screeners
            </div>
            <div className={`text-xs mt-1 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-500'
            }`}>
              Page {pagination.page} of {pagination.totalPages}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Previous Button */}
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
            
            {/* Page numbers */}
            {(() => {
              const currentPage = pagination.page;
              const totalPages = pagination.totalPages;
              const delta = 1;
              
              const startPage = Math.max(1, currentPage - delta);
              const endPage = Math.min(totalPages, currentPage + delta);
              
              const pages = [];
              for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
              }
              
              return pages.map((page) => {
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
              });
            })()}
            
            {/* Next Button */}
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

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-2xl rounded-lg shadow-xl ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } max-h-[90vh] overflow-y-auto`}
          >
            <div className="p-6">
              <h2 className={`text-xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {showAddModal ? 'Add New Halal Screener' : 'Edit Halal Screener'}
              </h2>

              <div className="space-y-4">
                {/* Blockchain Name */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Blockchain Name *
                  </label>
                  <input
                    type="text"
                    value={formData.blockchainName}
                    onChange={(e) => setFormData({...formData, blockchainName: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
                    placeholder="e.g., Ethereum, Bitcoin"
                  />
                </div>

                {/* Blockchain Token */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Blockchain Token *
                  </label>
                  <input
                    type="text"
                    value={formData.blockchainToken}
                    onChange={(e) => setFormData({...formData, blockchainToken: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
                    placeholder="e.g., ETH, BTC, ATOM"
                  />
                </div>

                {/* CoinGecko ID */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    CoinGecko ID *
                  </label>
                  <input
                    type="text"
                    value={formData.coinGeckoId}
                    onChange={(e) => setFormData({...formData, coinGeckoId: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
                    placeholder="e.g., ethereum, bitcoin, cosmos"
                  />
                </div>

                {/* Logo URL */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={formData.logoURL}
                    onChange={(e) => setFormData({...formData, logoURL: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
                    placeholder="https://example.com/logo.png"
                  />
                  {formData.logoURL && (
                    <div className="mt-2 flex items-center space-x-2">
                      <span className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Preview:
                      </span>
                      <img 
                        src={formData.logoURL} 
                        alt="Logo preview"
                        className="w-6 h-6 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Trading Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Trading Status *
                    </label>
                    <select
                      value={formData.trading.status}
                      onChange={(e) => setFormData({
                        ...formData,
                        trading: {
                          ...formData.trading,
                          status: e.target.value as any
                        }
                      })}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
                    >
                      <option value="Comfortable">Comfortable</option>
                      <option value="Non-Comfortable">Non-Comfortable</option>
                      <option value="Questionable">Questionable</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Staking Status *
                    </label>
                    <select
                      value={formData.staking.status}
                      onChange={(e) => setFormData({
                        ...formData,
                        staking: {
                          ...formData.staking,
                          status: e.target.value as any
                        }
                      })}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
                    >
                      <option value="Comfortable">Comfortable</option>
                      <option value="Non-Comfortable">Non-Comfortable</option>
                      <option value="Questionable">Questionable</option>
                    </select>
                  </div>
                </div>

                {/* Trading Description */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Trading Description *
                  </label>
                  <textarea
                    value={formData.trading.description}
                    onChange={(e) => setFormData({
                      ...formData,
                      trading: {
                        ...formData.trading,
                        description: e.target.value
                      }
                    })}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
                    placeholder="Explain the Shariah compliance assessment for trading..."
                  />
                </div>

                {/* Staking Description */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Staking Description *
                  </label>
                  <textarea
                    value={formData.staking.description}
                    onChange={(e) => setFormData({
                      ...formData,
                      staking: {
                        ...formData.staking,
                        description: e.target.value
                      }
                    })}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
                    placeholder="Explain the Shariah compliance assessment for staking..."
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedScreener(null);
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
                  onClick={showAddModal ? createScreener : updateScreener}
                  disabled={!formData.blockchainName || !formData.blockchainToken || !formData.coinGeckoId || !formData.trading.description || !formData.staking.description}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {showAddModal ? 'Create Screener' : 'Update Screener'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedScreener && (
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
                Delete Halal Screener
              </h2>
              
              <p className={`mb-6 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Are you sure you want to permanently delete the halal screener for{' '}
                <span className="font-semibold">{selectedScreener.blockchainName}</span>?
                This action cannot be undone.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedScreener(null);
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
                  onClick={deleteScreener}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Description Modal */}
      {showDescriptionModal && descriptionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-lg rounded-lg shadow-xl ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className={`text-xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {descriptionData.type === 'trading' ? 'Trading' : 'Staking'} Compliance
                  </h2>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {descriptionData.blockchain}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDescriptionModal(false);
                    setDescriptionData(null);
                  }}
                  className={`p-1 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status Badge */}
              <div className="mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  descriptionData.status === 'Comfortable'
                    ? isDarkMode 
                      ? 'bg-green-900 text-green-300 border border-green-700'
                      : 'bg-green-100 text-green-800 border border-green-200'
                    : descriptionData.status === 'Questionable'
                    ? isDarkMode
                      ? 'bg-yellow-900 text-yellow-300 border border-yellow-700'
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    : isDarkMode
                      ? 'bg-red-900 text-red-300 border border-red-700'
                      : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {descriptionData.status}
                </span>
              </div>

              {/* Description */}
              <div className={`mb-6 p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <p className={`text-sm leading-relaxed ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {descriptionData.description}
                </p>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowDescriptionModal(false);
                    setDescriptionData(null);
                  }}
                  className={`px-4 py-2 border rounded-lg font-medium transition-colors ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default HalalScreenerManagement;

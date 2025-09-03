import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

interface Activity {
  _id: string;
  adminWallet: string;
  adminName: string;
  activity: string;
  ipAddress: string;
  createdAt: string;
  relativeTime: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface Admin {
  walletAddress: string;
  name: string | null;
  email: string | null;
  isActive: boolean;
}

const ActivitiesPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchPage, setSearchPage] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  // Fetch all admins for filter dropdown
  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/admin-management/admins', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.admins) {
          setAdmins(result.data.admins);
        }
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
    }
  };

  // Fetch activities from API
  const fetchActivities = async (page: number = 1, adminWallet?: string) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('adminToken');
      
      let url = `http://localhost:3000/api/admin-management/activities?page=${page}&limit=20`;
      if (adminWallet) {
        url = `http://localhost:3000/api/admin-management/activities/${adminWallet}?page=${page}&limit=20`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.activities) {
          setActivities(result.data.activities);
          setPagination(result.data.pagination);
        } else {
          setError('No activities found');
        }
      } else {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
    fetchActivities(1);
  }, []);

  // Handle admin filter change
  const handleAdminFilterChange = (adminWallet: string) => {
    setSelectedAdmin(adminWallet);
    setCurrentPage(1);
    if (adminWallet) {
      fetchActivities(1, adminWallet);
    } else {
      fetchActivities(1);
    }
  };

  // Handle search change
  const handleSearchChange = (search: string) => {
    setSearchQuery(search); // Just set the query, useEffect will handle the debounced API call
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (selectedAdmin) {
      fetchActivities(page, selectedAdmin);
    } else {
      fetchActivities(page);
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

  // Local search effect (no API call needed)
  useEffect(() => {
    // Reset search page when search query changes
    setSearchPage(1);
    
    if (searchQuery.trim() !== '') {
      setSearchLoading(true);
      // Small delay for UI feedback, then stop loading
      const timeoutId = setTimeout(() => {
        setSearchLoading(false);
      }, 200);
      
      return () => clearTimeout(timeoutId);
    } else {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchAdmins();
    fetchActivities(1);
  }, []);

  // Client-side filtered activities for display
  const filteredActivities = activities.filter(activity => {
    if (searchQuery.trim()) {
      return activity.activity.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Client-side pagination for search results
  const searchPageSize = 20;
  const searchStartIndex = (searchPage - 1) * searchPageSize;
  const searchEndIndex = searchStartIndex + searchPageSize;
  const paginatedSearchResults = searchQuery.trim() 
    ? filteredActivities.slice(searchStartIndex, searchEndIndex)
    : filteredActivities;

  const searchTotalPages = Math.ceil(filteredActivities.length / searchPageSize);

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
            Admin Activities
          </h1>
          <p className={`text-lg ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Track all administrative actions and system activities
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={`p-4 rounded-lg border ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } shadow-sm`}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Box */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Search Activity Description
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by activity description..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={`w-full px-3 py-2 pl-10 pr-10 border rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
              />
              {/* Search Icon */}
              <svg 
                className={`absolute left-3 top-2.5 h-5 w-5 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-400'
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              
              {/* Loading Spinner */}
              {searchLoading && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-500 border-t-transparent"></div>
                </div>
              )}
              
              {/* Clear Search Button */}
              {searchQuery && !searchLoading && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-3 top-2.5 h-5 w-5 rounded-full flex items-center justify-center transition-colors ${
                    isDarkMode 
                      ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-600' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Admin Filter */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Filter by Admin
            </label>
            <select
              value={selectedAdmin}
              onChange={(e) => handleAdminFilterChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
            >
              <option value="">All Admins</option>
              {admins.map((admin) => (
                <option key={admin.walletAddress} value={admin.walletAddress}>
                  {admin.name || 'Unnamed Admin'} ({admin.walletAddress.slice(0, 16)}...)
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedAdmin('');
                setCurrentPage(1);
                setSearchPage(1);
                fetchActivities(1);
              }}
              className={`px-4 py-2 border rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Clear All
            </button>
            <button
              onClick={() => {
                setCurrentPage(1);
                if (selectedAdmin) {
                  fetchActivities(1, selectedAdmin);
                } else {
                  fetchActivities(1);
                }
              }}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
        
        {/* Filter Status */}
        {(searchQuery || selectedAdmin) && (
          <div className={`mt-3 pt-3 border-t ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Active filters:
              </span>
              
              {searchQuery && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  isDarkMode 
                    ? 'bg-teal-900 text-teal-300' 
                    : 'bg-teal-100 text-teal-800'
                }`}>
                  Search: "{searchQuery}"
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchPage(1);
                    }}
                    className={`ml-1 rounded-full p-0.5 hover:bg-opacity-20 hover:bg-white transition-colors`}
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              
              {selectedAdmin && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  isDarkMode 
                    ? 'bg-blue-900 text-blue-300' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  Admin: {admins.find(a => a.walletAddress === selectedAdmin)?.name || 'Unknown'} 
                  <button
                    onClick={() => setSelectedAdmin('')}
                    className={`ml-1 rounded-full p-0.5 hover:bg-opacity-20 hover:bg-white transition-colors`}
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
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
        </motion.div>
      )}

      {/* Activities Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
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
                  Activity
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Admin
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  IP Address
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Time
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    </td>
                  </tr>
                ))
              ) : paginatedSearchResults.length > 0 ? (
                paginatedSearchResults.map((activity) => (
                  <tr key={activity._id}>
                    <td className="px-6 py-4">
                      <div className={`text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-900'
                      }`}>
                        {activity.activity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className={`text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {activity.adminName || 'Unknown Admin'}
                        </div>
                        <div className={`text-xs font-mono ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          {activity.adminWallet.slice(0, 16)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-mono ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {activity.ipAddress}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-900'
                      }`}>
                        {activity.relativeTime}
                      </div>
                      <div className={`text-xs ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {formatDate(activity.createdAt)}
                      </div>
                    </td>
                  </tr>
                  ))
              ) : activities.length > 0 && filteredActivities.length === 0 ? (
                // Show when we have activities but none match the search
                <tr>
                  <td colSpan={4} className={`px-6 py-12 text-center ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p>No activities found matching "{searchQuery}"</p>
                    <p className="text-xs mt-2">Try a different search term or clear the search</p>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={4} className={`px-6 py-12 text-center ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p>No activities found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Pagination - Only show when no search is active */}
      {pagination && pagination.totalPages > 1 && !searchQuery.trim() && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <div>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} total activities
            </div>
            <div className={`text-xs mt-1 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-500'
            }`}>
              Page {pagination.page} of {pagination.totalPages} • {activities.length} activities loaded
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* First Page */}
            {pagination.page > 3 && (
              <>
                <button
                  onClick={() => handlePageChange(1)}
                  className={`px-3 py-2 border rounded-lg font-medium transition-colors ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  1
                </button>
                {pagination.page > 4 && (
                  <span className={`px-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>...</span>
                )}
              </>
            )}

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
            
            {/* Page numbers around current page */}
            {(() => {
              const currentPage = pagination.page;
              const totalPages = pagination.totalPages;
              const delta = 1; // Number of pages to show on each side of current page
              
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

            {/* Last Page */}
            {pagination.page < pagination.totalPages - 2 && (
              <>
                {pagination.page < pagination.totalPages - 3 && (
                  <span className={`px-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>...</span>
                )}
                <button
                  onClick={() => handlePageChange(pagination.totalPages)}
                  className={`px-3 py-2 border rounded-lg font-medium transition-colors ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pagination.totalPages}
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Search Results Pagination - Only show when searching */}
      {searchQuery.trim() && searchTotalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <div>
              Showing {searchStartIndex + 1} to {Math.min(searchEndIndex, filteredActivities.length)} of{' '}
              {filteredActivities.length} matching activities
            </div>
            <div className={`text-xs mt-1 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-500'
            }`}>
              Page {searchPage} of {searchTotalPages} • Filtered from {activities.length} total activities
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Previous Button */}
            <button
              onClick={() => setSearchPage(searchPage - 1)}
              disabled={searchPage <= 1}
              className={`px-3 py-2 border rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700 disabled:hover:bg-transparent'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-transparent'
              }`}
            >
              Previous
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, searchTotalPages) }, (_, i) => {
              const page = i + 1;
              const isCurrentPage = page === searchPage;
              return (
                <button
                  key={page}
                  onClick={() => setSearchPage(page)}
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
            
            {/* Next Button */}
            <button
              onClick={() => setSearchPage(searchPage + 1)}
              disabled={searchPage >= searchTotalPages}
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
    </div>
  );
};

export default ActivitiesPage;
